"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { showToast } from "../../../lib/toast";
import { useI18n } from "../../context/LanguageContext";
import { Debt } from "../types";
import { r2 } from "../format";

export function useDebts(userId: string | undefined, householdId: string | undefined) {
  const { t } = useI18n();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDebts = useCallback(async () => {
    if (!householdId) return;
    // RLS already limits this to the caller's own private debts plus every
    // shared (owner_user_id null) debt in the household.
    const { data } = await supabase
      .from("debts")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    setDebts(
      (data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
        total: d.total,
        remaining: d.remaining,
        monthlyPayment: d.monthly_payment,
        ownerUserId: d.owner_user_id,
      }))
    );
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on household change needs a loading flag flipped back on
    setIsLoading(true);
    loadDebts().finally(() => setIsLoading(false));
  }, [householdId, loadDebts]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`debts-${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "debts", filter: `household_id=eq.${householdId}` }, loadDebts)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, loadDebts]);

  const createDebt = async (name: string, total: number, monthlyPayment: number, shared: boolean) => {
    if (!householdId || !userId) return;
    const { data, error } = await supabase
      .from("debts")
      .insert({
        household_id: householdId,
        name,
        total: r2(total),
        remaining: r2(total),
        monthly_payment: r2(monthlyPayment),
        owner_user_id: shared ? null : userId,
      })
      .select()
      .single();
    if (!error && data) {
      setDebts((prev) => [
        ...prev,
        { id: data.id, name: data.name, total: data.total, remaining: data.remaining, monthlyPayment: data.monthly_payment, ownerUserId: data.owner_user_id },
      ]);
    }
  };

  const recordPayment = async (id: string, amount: number) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;
    const nextRemaining = Math.max(0, r2(debt.remaining - amount));
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, remaining: nextRemaining } : d)));
    await supabase.from("debts").update({ remaining: nextRemaining }).eq("id", id);
    if (nextRemaining === 0) showToast(t(`${debt.name} is paid off.`, `${debt.name} ist abbezahlt.`), "success");
  };

  const editDebt = async (id: string, name: string, total: number, monthlyPayment: number) => {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, name, total, monthlyPayment } : d)));
    await supabase.from("debts").update({ name, total: r2(total), monthly_payment: r2(monthlyPayment) }).eq("id", id);
    showToast(t("Debt updated", "Schuld aktualisiert"), "success");
  };

  const deleteDebt = async (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    await supabase.from("debts").delete().eq("id", id);
  };

  return { debts, isLoading, createDebt, recordPayment, editDebt, deleteDebt };
}
