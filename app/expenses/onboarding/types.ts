// Types for the warm, goal-first money onboarding (screens: goals, income,
// fixed costs, mood, result, next step) — separate from the more technical
// Verteilertopf setup wizard in FinanceOnboarding.tsx.

export type GoalId = "sicherheit" | "reise" | "wohnen" | "schulden" | "ueberblick" | "sparziel" | "unklar";

export interface IncomeEntry {
  id: string;
  label: string;
  amount: number; // used when income is fixed
  min: number; // used when income is variable
  max: number; // used when income is variable
}

export interface FixedCostEntry {
  id: string;
  label: string;
  amount: number;
  chipKey: string | null; // which suggestion chip this came from, if any
}

export type Mood = "entspannt" | "geht_so" | "unsicher" | "gestresst";

export interface MoneyOnboardingState {
  goals: GoalId[];
  income: IncomeEntry[];
  incomeVariable: boolean;
  fixedCosts: FixedCostEntry[];
  mood: Mood | null;
  step: number;
  completed: boolean;
}
