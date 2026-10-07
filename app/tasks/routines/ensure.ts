// Decides which occurrences still have to be created. Pure, so it is testable.
// The hook inserts the result; a unique (routine_id, due_date) in the database
// makes it safe when two household members open the app at the same time.

import { addDays, occurrencesBetween } from "./schedule.ts";
import type { Occurrence, Routine } from "./types.ts";

export const HORIZON_DAYS = 56; // ~8 weeks ahead

export interface MissingOccurrence {
  routineId: string;
  dueDate: string;
}

export function missingOccurrences(
  routines: Routine[],
  existing: Occurrence[],
  today: string,
  horizonDays = HORIZON_DAYS
): MissingOccurrence[] {
  const have = new Set(existing.map((o) => `${o.routineId}|${o.dueDate}`));
  const openByRoutine = new Set(existing.filter((o) => o.status === "open").map((o) => o.routineId));
  const horizon = addDays(today, horizonDays);
  const out: MissingOccurrence[] = [];

  for (const r of routines) {
    if (r.mode === "after_done") {
      // One open occurrence at a time; completing it creates the next one.
      // This only fills the gap for a brand-new routine (or a failed follow-up write).
      if (r.schedule.type !== "interval" || openByRoutine.has(r.id)) continue;
      const due = r.schedule.anchor > today ? r.schedule.anchor : today;
      if (!have.has(`${r.id}|${due}`)) out.push({ routineId: r.id, dueDate: due });
      continue;
    }
    for (const due of occurrencesBetween(r.schedule, today, horizon, r.activeMonths)) {
      if (!have.has(`${r.id}|${due}`)) out.push({ routineId: r.id, dueDate: due });
    }
  }
  return out;
}
