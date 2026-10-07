// Feeds bill routines into the Rechnungen-Planer. The planner thinks in "this amount is due
// in these months of the year" (IrregularBill), so a bill routine is reduced to exactly that
// from its real due dates over the next 12 months. Pure, so it is testable.

import { addDays, addMonths, occurrencesBetween, parseISO } from "./schedule.ts";
import type { Routine } from "./types.ts";

export interface PlannerBill {
  id: string;
  name: string;
  amount: number; // per due month
  months: number[]; // 1-12
}

function r2(n: number) {
  return Math.round(n * 100) / 100;
}

// null when the routine is not a bill, or has no amount to plan with (a "schwankt" bill without
// an estimate) or does not fall due in the next 12 months.
//
// The yearly total is exact. The per-month amount is the average over the months it falls due,
// which only differs from the real amount for bills that are due more than once a month.
export function routineToPlannerBill(r: Routine, today: string): PlannerBill | null {
  if (r.kind !== "bill" || r.amount == null || r.amount <= 0) return null;
  const dates = occurrencesBetween(r.schedule, today, addDays(addMonths(today, 12), -1), r.activeMonths);
  if (dates.length === 0) return null;
  const months = [...new Set(dates.map((d) => parseISO(d).m))].sort((a, b) => a - b);
  return { id: r.id, name: r.title, amount: r2((r.amount * dates.length) / months.length), months };
}

export function plannerBills(routines: Routine[], today: string): PlannerBill[] {
  return routines.flatMap((r) => {
    const b = routineToPlannerBill(r, today);
    return b ? [b] : [];
  });
}
