// Turns stored occurrences into the "Diese Woche" agenda. Pure, so it is testable.

import { addDays, daysBetween } from "./schedule.ts";
import type { Occurrence, Routine } from "./types.ts";

export type AgendaGroup = "waiting" | "today" | "soon";

export interface AgendaItem {
  occurrence: Occurrence;
  routine: Routine;
  group: AgendaGroup;
  daysUntil: number; // negative = already past
  // True when the heads-up window (leadDays) has started and it is not due yet.
  headsUp: boolean;
}

// Open occurrences from the next `days` days, plus chores that are still waiting.
// - Reminders (Abfuhr) that are in the past just drop out; they never pile up.
// - A chore that was missed several times shows once, with its latest date;
//   completing it catches up the older ones (see useRoutines).
export function buildAgenda(
  routines: Routine[],
  occurrences: Occurrence[],
  today: string,
  days = 7
): AgendaItem[] {
  const byId = new Map(routines.map((r) => [r.id, r]));
  const horizon = addDays(today, days);
  const items: AgendaItem[] = [];
  const latestWaiting = new Map<string, Occurrence>();

  for (const occ of occurrences) {
    if (occ.status !== "open") continue;
    const routine = byId.get(occ.routineId);
    if (!routine) continue;

    if (occ.dueDate < today) {
      if (routine.kind !== "chore") continue;
      const prev = latestWaiting.get(routine.id);
      if (!prev || occ.dueDate > prev.dueDate) latestWaiting.set(routine.id, occ);
      continue;
    }
    if (occ.dueDate > horizon) continue;

    const daysUntil = daysBetween(today, occ.dueDate);
    items.push({
      occurrence: occ,
      routine,
      group: daysUntil === 0 ? "today" : "soon",
      daysUntil,
      headsUp: daysUntil > 0 && daysUntil <= routine.leadDays,
    });
  }

  for (const occ of latestWaiting.values()) {
    const routine = byId.get(occ.routineId)!;
    items.push({
      occurrence: occ,
      routine,
      group: "waiting",
      daysUntil: daysBetween(today, occ.dueDate),
      headsUp: false,
    });
  }

  const rank: Record<AgendaGroup, number> = { waiting: 0, today: 1, soon: 2 };
  return items.sort(
    (a, b) =>
      rank[a.group] - rank[b.group] ||
      a.occurrence.dueDate.localeCompare(b.occurrence.dueDate) ||
      a.routine.title.localeCompare(b.routine.title)
  );
}

// "Heute", "Morgen", "Do 12.11." — short and calm.
export function dueLabel(daysUntil: number, dueDate: string, locale = "de-CH"): string {
  if (daysUntil === 0) return "Heute";
  if (daysUntil === 1) return "Morgen";
  const d = new Date(`${dueDate}T12:00:00Z`);
  return d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
}
