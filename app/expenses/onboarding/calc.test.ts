// Run with: node --test app/expenses/onboarding/calc.test.ts
// (Node's built-in type-stripping runs these .ts files directly — no test
// framework dependency needed for pure calculation logic like this.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcAvailable, isAvailableNegative, totalFixedCosts, totalIncomeFixed, totalIncomeRange } from "./calc.ts";
import type { FixedCostEntry, IncomeEntry } from "./types.ts";

function income(entries: Partial<IncomeEntry>[]): IncomeEntry[] {
  return entries.map((e, i) => ({ id: String(i), label: "", amount: 0, min: 0, max: 0, ...e }));
}
function costs(entries: Partial<FixedCostEntry>[]): FixedCostEntry[] {
  return entries.map((e, i) => ({ id: String(i), label: "", amount: 0, chipKey: null, ...e }));
}

test("totalFixedCosts sums amounts", () => {
  assert.equal(totalFixedCosts(costs([{ amount: 1200 }, { amount: 49.9 }])), 1249.9);
});

test("totalFixedCosts with no entries is zero", () => {
  assert.equal(totalFixedCosts([]), 0);
});

test("totalIncomeFixed sums amounts", () => {
  assert.equal(totalIncomeFixed(income([{ amount: 4000 }, { amount: 500 }])), 4500);
});

test("totalIncomeRange sums min/max independently", () => {
  assert.deepEqual(totalIncomeRange(income([{ min: 2000, max: 3000 }, { min: 300, max: 800 }])), { min: 2300, max: 3800 });
});

test("calcAvailable: fixed income minus fixed costs", () => {
  const result = calcAvailable(income([{ amount: 4500 }]), costs([{ amount: 2000 }]), false);
  assert.deepEqual(result, { kind: "fixed", amount: 2500 });
});

test("calcAvailable: variable income produces a range", () => {
  const result = calcAvailable(income([{ min: 2000, max: 3500 }]), costs([{ amount: 1800 }]), true);
  assert.deepEqual(result, { kind: "range", min: 200, max: 1700 });
});

test("calcAvailable: negative fixed result when costs exceed income", () => {
  const result = calcAvailable(income([{ amount: 1000 }]), costs([{ amount: 1800 }]), false);
  assert.deepEqual(result, { kind: "fixed", amount: -800 });
  assert.equal(isAvailableNegative(result), true);
});

test("isAvailableNegative: range counts as negative only if the max is negative", () => {
  assert.equal(isAvailableNegative({ kind: "range", min: -200, max: 100 }), false);
  assert.equal(isAvailableNegative({ kind: "range", min: -500, max: -100 }), true);
});

test("calcAvailable: no income and no costs is zero, not NaN", () => {
  assert.deepEqual(calcAvailable([], [], false), { kind: "fixed", amount: 0 });
  assert.deepEqual(calcAvailable([], [], true), { kind: "range", min: 0, max: 0 });
});

test("calcAvailable: rounds to two decimal places", () => {
  const result = calcAvailable(income([{ amount: 1000.005 }]), costs([{ amount: 0.005 }]), false);
  assert.deepEqual(result, { kind: "fixed", amount: 1000 });
});
