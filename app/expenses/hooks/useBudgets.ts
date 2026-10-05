"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { showToast } from "../../../lib/toast";
import { Budget, Expense } from "../types";
import { useI18n } from "../../context/LanguageContext";

export function useBudgets(userId: string | undefined, householdId: string | undefined) {
  const { t } = useI18n();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBudgets = useCallback(async () => {
    if (!userId || !householdId) return;
    const { data } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    setBudgets((data ?? []).map((b) => ({ id: b.id, category: b.category, amount: b.amount })));
  }, [userId, householdId]);

  const loadExpenses = useCallback(async () => {
    if (!userId || !householdId) return;
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", userId)
      .eq("household_id", householdId)
      .order("date", { ascending: false });
    setExpenses(
      (data ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        date: e.date,
        category: e.category,
        note: e.note ?? undefined,
      }))
    );
  }, [userId, householdId]);

  useEffect(() => {
    if (!userId || !householdId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on household/user change needs a loading flag flipped back on
    setIsLoading(true);
    Promise.all([loadBudgets(), loadExpenses()]).finally(() => setIsLoading(false));
  }, [userId, householdId, loadBudgets, loadExpenses]);

  useEffect(() => {
    if (!userId || !householdId) return;
    const channel = supabase
      .channel(`budgets-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets", filter: `user_id=eq.${userId}` }, loadBudgets)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `user_id=eq.${userId}` }, loadExpenses)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, householdId, loadBudgets, loadExpenses]);

  const addBudget = async (category: string, amount: number) => {
    if (!category || !userId || !householdId) return;
    const { data, error } = await supabase
      .from("budgets")
      .insert({ household_id: householdId, user_id: userId, category: category.trim(), amount })
      .select()
      .single();
    if (!error && data) {
      setBudgets((prev) => [...prev, { id: data.id, category: data.category, amount: data.amount }]);
    }
  };

  const deleteBudget = async (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    await supabase.from("budgets").delete().eq("id", id);
  };

  const editBudget = async (id: string, category: string, amount: number) => {
    setBudgets((prev) => prev.map((x) => (x.id === id ? { ...x, category, amount } : x)));
    await supabase.from("budgets").update({ category, amount }).eq("id", id);
    showToast(t("Budget updated", "Budget aktualisiert"), "success");
  };

  const addExpense = async (input: { title: string; amount: number; date: string; category: string; note?: string }) => {
    if (!input.title || !userId || !householdId) return;
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        household_id: householdId,
        user_id: userId,
        title: input.title,
        amount: input.amount,
        date: new Date(input.date).toISOString(),
        category: input.category || "Sonstiges",
        note: input.note || null,
      })
      .select()
      .single();
    if (!error && data) {
      setExpenses((prev) => [
        { id: data.id, title: data.title, amount: data.amount, date: data.date, category: data.category, note: data.note ?? undefined },
        ...prev,
      ]);
    }
    return !error;
  };

  const editExpense = async (id: string, updates: { title: string; amount: number; category: string; note?: string }) => {
    setExpenses((prev) => prev.map((x) => (x.id === id ? { ...x, ...updates } : x)));
    await supabase.from("expenses").update({ ...updates, note: updates.note ?? null }).eq("id", id);
    showToast(t("Expense updated", "Ausgabe aktualisiert"), "success");
  };

  const deleteExpense = async (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("expenses").delete().eq("id", id);
  };

  const importExpenses = async (rows: { title: string; amount: number; date: string; category: string; note?: string }[]) => {
    if (!userId || !householdId || rows.length === 0) return 0;
    const payload = rows.map((r) => ({
      household_id: householdId,
      user_id: userId,
      title: r.title,
      amount: r.amount,
      date: r.date,
      category: r.category,
      note: r.note || null,
    }));
    const { data, error } = await supabase.from("expenses").insert(payload).select();
    if (error) throw error;
    setExpenses((prev) => [
      ...(data ?? []).map((e) => ({ id: e.id, title: e.title, amount: e.amount, date: e.date, category: e.category, note: e.note ?? undefined })),
      ...prev,
    ]);
    return data?.length ?? 0;
  };

  const spentByCategory = useCallback(
    (month: string) => {
      const [y, m] = month.split("-").map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      const sums: Record<string, number> = {};
      expenses.forEach((exp) => {
        const d = new Date(exp.date);
        if (d >= start && d < end) {
          const cat = exp.category || "Sonstiges";
          sums[cat] = (sums[cat] || 0) + exp.amount;
        }
      });
      return sums;
    },
    [expenses]
  );

  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + b.amount, 0), [budgets]);

  return {
    budgets,
    expenses,
    isLoading,
    totalBudget,
    addBudget,
    deleteBudget,
    editBudget,
    addExpense,
    editExpense,
    deleteExpense,
    importExpenses,
    spentByCategory,
    setExpenses,
  };
}
