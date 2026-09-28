"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Json, TablesUpdate } from "../../lib/database.types";
import type { FixedCostEntry, GoalId, IncomeEntry, Mood, MoneyOnboardingState } from "./types";

const DEFAULT_STATE: MoneyOnboardingState = {
  goals: [],
  income: [],
  incomeVariable: false,
  fixedCosts: [],
  mood: null,
  step: 0,
  completed: false,
};

export function useMoneyOnboarding(householdId: string | undefined) {
  const [state, setState] = useState<MoneyOnboardingState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!householdId) return;
    const { data } = await supabase.from("money_onboarding").select("*").eq("household_id", householdId).maybeSingle();
    let row = data;
    if (!row) {
      // First time this household opens Finanzen — seed a default row.
      // ignoreDuplicates guards against two members racing on first load.
      const { data: seeded } = await supabase
        .from("money_onboarding")
        .upsert({ household_id: householdId }, { onConflict: "household_id", ignoreDuplicates: true })
        .select()
        .maybeSingle();
      row = seeded ?? (await supabase.from("money_onboarding").select("*").eq("household_id", householdId).maybeSingle()).data;
    }
    if (row) {
      setState({
        goals: (row.goals ?? []) as GoalId[],
        income: (row.income as unknown as IncomeEntry[]) ?? [],
        incomeVariable: row.income_variable,
        fixedCosts: (row.fixed_costs as unknown as FixedCostEntry[]) ?? [],
        mood: (row.mood as Mood | null) ?? null,
        step: row.step,
        completed: row.completed,
      });
    }
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on household change needs a loading flag flipped back on
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, [householdId, load]);

  // Persist a partial update, applied optimistically to local state.
  const save = useCallback(
    async (patch: Partial<MoneyOnboardingState>) => {
      if (!householdId) return;
      setState((prev) => ({ ...prev, ...patch }));
      const dbPatch: TablesUpdate<"money_onboarding"> = {};
      if (patch.goals !== undefined) dbPatch.goals = patch.goals;
      if (patch.income !== undefined) dbPatch.income = patch.income as unknown as Json;
      if (patch.incomeVariable !== undefined) dbPatch.income_variable = patch.incomeVariable;
      if (patch.fixedCosts !== undefined) dbPatch.fixed_costs = patch.fixedCosts as unknown as Json;
      if (patch.mood !== undefined) dbPatch.mood = patch.mood;
      if (patch.step !== undefined) dbPatch.step = patch.step;
      if (patch.completed !== undefined) dbPatch.completed = patch.completed;
      await supabase.from("money_onboarding").update(dbPatch).eq("household_id", householdId);
    },
    [householdId]
  );

  return { ...state, isLoading, save };
}
