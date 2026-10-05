"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Json } from "../../lib/database.types";
import { showToast } from "../../../lib/toast";
import type { Absence, LivingMode, RoutineSettings, Settlement } from "./types";

const ERROR_TEXT = "Das hat gerade nicht geklappt. Magst du es nochmal versuchen?";
const DEFAULT_SETTINGS: RoutineSettings = { livingMode: null, fairnessWeights: null };

// How the household lives and how it divides things up: Paar/WG, target shares for the
// Fairness-Waage, absences ("Ich bin weg") and settle-up payments.
export function useRoutineTeam(householdId: string | undefined, memberIds: string[]) {
  const [settings, setSettings] = useState<RoutineSettings>(DEFAULT_SETTINGS);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  const loadSettings = useCallback(async () => {
    if (!householdId) return;
    const { data, error } = await supabase.from("routine_settings").select("*").eq("household_id", householdId).maybeSingle();
    if (error) return;
    setSettings(
      data
        ? { livingMode: data.living_mode as LivingMode | null, fairnessWeights: data.fairness_weights as Record<string, number> | null }
        : DEFAULT_SETTINGS
    );
  }, [householdId]);

  const loadAbsences = useCallback(async () => {
    if (!householdId) return;
    const { data, error } = await supabase
      .from("routine_absences")
      .select("*")
      .eq("household_id", householdId)
      .order("from_date", { ascending: true });
    if (!error) setAbsences((data ?? []).map((a) => ({ id: a.id, userId: a.user_id, fromDate: a.from_date, toDate: a.to_date })));
  }, [householdId]);

  const loadSettlements = useCallback(async () => {
    if (!householdId) return;
    const { data, error } = await supabase
      .from("routine_settlements")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    if (!error) {
      setSettlements((data ?? []).map((s) => ({ id: s.id, fromUser: s.from_user, toUser: s.to_user, amount: s.amount, createdAt: s.created_at })));
    }
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    // Standard fetch-on-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([loadSettings(), loadAbsences(), loadSettlements()]);
  }, [householdId, loadSettings, loadAbsences, loadSettlements]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`routine-team-${householdId}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "routine_settings", filter: `household_id=eq.${householdId}` }, loadSettings)
      .on("postgres_changes", { event: "*", schema: "public", table: "routine_absences", filter: `household_id=eq.${householdId}` }, loadAbsences)
      .on("postgres_changes", { event: "*", schema: "public", table: "routine_settlements", filter: `household_id=eq.${householdId}` }, loadSettlements)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, loadSettings, loadAbsences, loadSettlements]);

  // Two people live as a couple, three or more as a WG, unless the household says otherwise.
  const livingMode: LivingMode = settings.livingMode ?? (memberIds.length >= 3 ? "wg" : "couple");

  const saveSettings = useCallback(
    async (patch: Partial<RoutineSettings>) => {
      if (!householdId) return false;
      const next = { ...settings, ...patch };
      setSettings(next);
      const { error } = await supabase.from("routine_settings").upsert(
        {
          household_id: householdId,
          living_mode: next.livingMode,
          fairness_weights: next.fairnessWeights as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "household_id" }
      );
      if (error) {
        showToast(ERROR_TEXT, "error");
        loadSettings();
        return false;
      }
      return true;
    },
    [householdId, settings, loadSettings]
  );

  const addAbsence = useCallback(
    async (userId: string, fromDate: string, toDate: string) => {
      if (!householdId) return false;
      const { error } = await supabase.from("routine_absences").insert({ household_id: householdId, user_id: userId, from_date: fromDate, to_date: toDate });
      if (error) {
        showToast(ERROR_TEXT, "error");
        return false;
      }
      await loadAbsences();
      return true;
    },
    [householdId, loadAbsences]
  );

  const removeAbsence = useCallback(
    async (id: string) => {
      setAbsences((prev) => prev.filter((a) => a.id !== id));
      const { error } = await supabase.from("routine_absences").delete().eq("id", id);
      if (error) {
        showToast(ERROR_TEXT, "error");
        loadAbsences();
      }
    },
    [loadAbsences]
  );

  // "Ausgleich": from paid to what the splits added up to.
  const settle = useCallback(
    async (fromUser: string, toUser: string, amount: number) => {
      if (!householdId) return false;
      const { error } = await supabase.from("routine_settlements").insert({ household_id: householdId, from_user: fromUser, to_user: toUser, amount });
      if (error) {
        showToast(ERROR_TEXT, "error");
        return false;
      }
      await loadSettlements();
      return true;
    },
    [householdId, loadSettlements]
  );

  // Stable keys so the planner only reruns when the content changes, not the array identity.
  const absenceKey = useMemo(() => absences.map((a) => `${a.userId}:${a.fromDate}:${a.toDate}`).join("|"), [absences]);

  return { settings, livingMode, absences, absenceKey, settlements, saveSettings, addAbsence, removeAbsence, settle, memberIds };
}
