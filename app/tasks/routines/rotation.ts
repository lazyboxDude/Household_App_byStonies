// Who does which occurrence. Pure, so it is testable.
//
// Only "free" occurrences are planned: open, still ahead, and not swapped by hand. Everything else
// (done, skipped, overdue, locked) is history that the rotation continues from.

import { daysBetween } from "./schedule.ts";
import type { Absence, Occurrence, Routine } from "./types.ts";

export interface AssignmentChange {
  occurrenceId: string;
  assignedTo: string | null;
}

export function isFree(occ: Occurrence, today: string): boolean {
  return occ.status === "open" && !occ.locked && occ.dueDate >= today;
}

export function isAbsent(absences: Absence[], userId: string, date: string): boolean {
  return absences.some((a) => a.userId === userId && a.fromDate <= date && date <= a.toDate);
}

// The next person in `order` after `last`, skipping people who are away on `date`.
// If everyone is away, the plain next person takes it rather than leaving it unassigned.
function nextPerson(order: string[], last: string | null, date: string, absences: Absence[]): string {
  const start = last ? order.indexOf(last) : -1;
  for (let k = 1; k <= order.length; k++) {
    const cand = order[(start + k) % order.length];
    if (!isAbsent(absences, cand, date)) return cand;
  }
  return order[(start + 1) % order.length];
}

// Effort carried per member, used by "fair share" and the Fairness-Waage.
export type Loads = Record<string, number>;

// Returns only what has to change, so running it again with the same data changes nothing.
// `loads` is shared across routines (and updated) so fair-share picks see each other.
export function planAssignments(
  routine: Routine,
  occurrences: Occurrence[],
  members: string[],
  absences: Absence[],
  today: string,
  loads: Loads
): AssignmentChange[] {
  const mine = occurrences
    .filter((o) => o.routineId === routine.id)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
  const changes: AssignmentChange[] = [];
  const set = (occ: Occurrence, to: string | null) => {
    if (occ.assignedTo !== to) changes.push({ occurrenceId: occ.id, assignedTo: to });
  };

  if (routine.kind === "bill") return changes;

  switch (routine.assignment) {
    case "open":
      for (const o of mine) if (isFree(o, today)) set(o, null);
      break;
    case "fixed":
      for (const o of mine) if (isFree(o, today)) set(o, routine.assigneeId);
      break;
    case "rotation": {
      const order = (routine.rotation ?? []).filter((id) => members.includes(id));
      if (order.length < 2) break;
      let last: string | null = null;
      for (const o of mine) {
        if (!isFree(o, today)) {
          if (o.assignedTo && order.includes(o.assignedTo)) last = o.assignedTo;
          continue;
        }
        const pick = nextPerson(order, last, o.dueDate, absences);
        set(o, pick);
        last = pick;
      }
      break;
    }
    case "fair_share": {
      if (members.length === 0) break;
      for (const o of mine) {
        if (!isFree(o, today)) continue;
        // Stay stable: keep a person who is already assigned unless they are away that day.
        if (o.assignedTo && members.includes(o.assignedTo) && !isAbsent(absences, o.assignedTo, o.dueDate)) {
          loads[o.assignedTo] = (loads[o.assignedTo] ?? 0) + routine.effort;
          continue;
        }
        const candidates = members.filter((m) => !isAbsent(absences, m, o.dueDate));
        const pool = candidates.length > 0 ? candidates : members;
        let best = pool[0];
        for (const m of pool) if ((loads[m] ?? 0) < (loads[best] ?? 0)) best = m;
        loads[best] = (loads[best] ?? 0) + routine.effort;
        set(o, best);
      }
      break;
    }
  }
  return changes;
}

// When somebody changes who does a task, the date that is already waiting follows the new setting.
// The plan above leaves overdue dates alone (they count as history), but a waiting date is exactly
// what the person wants to give to somebody. A date that was handed over by hand stays as it is.
// "Fair share" is left to the plan, it needs the loads of everybody.
export function reassignWaiting(routine: Routine, occ: Occurrence, today: string): { assignedTo: string | null } | null {
  if (occ.status !== "open" || occ.locked || occ.dueDate >= today) return null;
  let to: string | null;
  switch (routine.assignment) {
    case "open": to = null; break;
    case "fixed": to = routine.assigneeId; break;
    case "rotation": to = routine.rotation?.[0] ?? null; break;
    default: return null;
  }
  return to === occ.assignedTo ? null : { assignedTo: to };
}

// Absences that touch the planning window; used to hide old ones.
export function currentAbsences(absences: Absence[], today: string): Absence[] {
  return absences.filter((a) => a.toDate >= today);
}

export function absenceDays(a: Absence): number {
  return daysBetween(a.fromDate, a.toDate) + 1;
}
