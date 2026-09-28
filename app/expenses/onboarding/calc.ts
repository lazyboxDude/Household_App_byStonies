// Pure calculation logic for the money onboarding's result screen — kept
// dependency-free (no relative imports) so it also runs directly under
// `node --test`, whose ESM loader needs explicit file extensions.
import type { FixedCostEntry, IncomeEntry } from "./types.ts";

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

// A "jaehrlich" entry (e.g. a yearly insurance bill) is a lump sum due once a
// year, not a monthly cost — it counts here as its /12 monthly equivalent so
// the result screen's "available per month" figure stays accurate.
function monthlyEquivalent(c: FixedCostEntry): number {
  const amt = c.amount || 0;
  return c.frequency === "jaehrlich" ? amt / 12 : amt;
}

export function totalFixedCosts(costs: FixedCostEntry[]): number {
  return r2(costs.reduce((sum, c) => sum + monthlyEquivalent(c), 0));
}

export function totalIncomeFixed(income: IncomeEntry[]): number {
  return r2(income.reduce((sum, i) => sum + (i.amount || 0), 0));
}

export function totalIncomeRange(income: IncomeEntry[]): { min: number; max: number } {
  return {
    min: r2(income.reduce((sum, i) => sum + (i.min || 0), 0)),
    max: r2(income.reduce((sum, i) => sum + (i.max || 0), 0)),
  };
}

export type AvailableResult = { kind: "fixed"; amount: number } | { kind: "range"; min: number; max: number };

// Einnahmen minus feste Kosten = verfügbarer Betrag pro Monat.
// With a variable income, the whole thing becomes a range instead of a
// single number — the min/max spans carry through to the final amount.
export function calcAvailable(income: IncomeEntry[], fixedCosts: FixedCostEntry[], incomeVariable: boolean): AvailableResult {
  const costs = totalFixedCosts(fixedCosts);
  if (incomeVariable) {
    const { min, max } = totalIncomeRange(income);
    return { kind: "range", min: r2(min - costs), max: r2(max - costs) };
  }
  return { kind: "fixed", amount: r2(totalIncomeFixed(income) - costs) };
}

export function isAvailableNegative(result: AvailableResult): boolean {
  return result.kind === "range" ? result.max < 0 : result.amount < 0;
}
