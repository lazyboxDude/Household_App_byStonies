"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { showToast } from "../../../lib/toast";
import { Pot } from "../types";

export function usePots(userId: string | undefined, householdId: string | undefined) {
  const [pots, setPots] = useState<Pot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadPots = useCallback(async () => {
    if (!householdId) return;
    // RLS already limits this to the caller's own private pots plus every
    // shared (owner_user_id null) pot in the household.
    const { data } = await supabase
      .from("pots")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    setPots((data ?? []).map((p) => ({ id: p.id, name: p.name, target: p.target, saved: p.saved, ownerUserId: p.owner_user_id })));
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on household change needs a loading flag flipped back on
    setIsLoading(true);
    loadPots().finally(() => setIsLoading(false));
  }, [householdId, loadPots]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`pots-${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pots", filter: `household_id=eq.${householdId}` }, loadPots)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, loadPots]);

  const createPot = async (name: string, target: number, shared: boolean) => {
    if (!householdId || !userId) return;
    const { data, error } = await supabase
      .from("pots")
      .insert({ household_id: householdId, name, target, owner_user_id: shared ? null : userId })
      .select()
      .single();
    if (!error && data) {
      setPots((prev) => [...prev, { id: data.id, name: data.name, target: data.target, saved: data.saved, ownerUserId: data.owner_user_id }]);
    }
  };

  const addToPot = async (id: string, amount: number) => {
    const pot = pots.find((p) => p.id === id);
    if (!pot) return;
    const nextSaved = pot.saved + amount;
    setPots((prev) => prev.map((p) => (p.id === id ? { ...p, saved: nextSaved } : p)));
    await supabase.from("pots").update({ saved: nextSaved }).eq("id", id);
  };

  const editPot = async (id: string, name: string, target: number) => {
    setPots((prev) => prev.map((x) => (x.id === id ? { ...x, name, target } : x)));
    await supabase.from("pots").update({ name, target }).eq("id", id);
    showToast("Sparziel aktualisiert", "success");
  };

  const deletePot = async (id: string) => {
    setPots((prev) => prev.filter((p) => p.id !== id));
    // .select() returns the deleted rows, so an RLS-blocked delete (0 rows, no error) is detectable.
    const { data, error } = await supabase.from("pots").delete().eq("id", id).select("id");
    if (error || !data || data.length === 0) {
      showToast("Sparziel konnte nicht gelöscht werden", "error");
      await loadPots();
      return;
    }
    showToast("Sparziel gelöscht", "success");
  };

  return { pots, isLoading, createPot, addToPot, editPot, deletePot };
}
