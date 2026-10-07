// Turns stored occurrences into the "Heute" agenda. Pure, so it is testable.

import { localeOf, type Lang } from "./i18n.ts";
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

// Open occurrences from the next `days` days (or the routine's heads-up window if that is
// longer, so a bill with "2 Wochen vorher" shows up two weeks ahead), plus what is still waiting.
// - Reminders (Abfuhr) in the past just drop out; they never pile up.
// - A chore that was missed several times shows once, with its latest date;
//   completing it catches up the older ones (see useRoutines).
// - Bills never collapse and never drop out: each unpaid due date is its own payment
//   and stays until it is paid or skipped.
export function buildAgenda(
  routines: Routine[],
  occurrences: Occurrence[],
  today: string,
  days = 7
): AgendaItem[] {
  const byId = new Map(routines.map((r) => [r.id, r]));
  const items: AgendaItem[] = [];
  const latestWaiting = new Map<string, Occurrence>();

  const waitingItem = (occ: Occurrence, routine: Routine): AgendaItem => ({
    occurrence: occ,
    routine,
    group: "waiting",
    daysUntil: daysBetween(today, occ.dueDate),
    headsUp: false,
  });

  for (const occ of occurrences) {
    if (occ.status !== "open") continue;
    const routine = byId.get(occ.routineId);
    if (!routine) continue;

    if (occ.dueDate < today) {
      if (routine.kind === "bill") items.push(waitingItem(occ, routine));
      else if (routine.kind === "chore") {
        const prev = latestWaiting.get(routine.id);
        if (!prev || occ.dueDate > prev.dueDate) latestWaiting.set(routine.id, occ);
      }
      continue;
    }
    if (occ.dueDate > addDays(today, Math.max(days, routine.leadDays))) continue;

    const daysUntil = daysBetween(today, occ.dueDate);
    items.push({
      occurrence: occ,
      routine,
      group: daysUntil === 0 ? "today" : "soon",
      daysUntil,
      headsUp: daysUntil > 0 && daysUntil <= routine.leadDays,
    });
  }

  for (const occ of latestWaiting.values()) items.push(waitingItem(occ, byId.get(occ.routineId)!));

  const rank: Record<AgendaGroup, number> = { waiting: 0, today: 1, soon: 2 };
  return items.sort(
    (a, b) =>
      rank[a.group] - rank[b.group] ||
      a.occurrence.dueDate.localeCompare(b.occurrence.dueDate) ||
      a.routine.title.localeCompare(b.routine.title)
  );
}

// "Heute", "Morgen", "Do. 12.11." — what to show next to a task that is still ahead.
export function dueLabel(daysUntil: number, dueDate: string, lang: Lang = "de"): string {
  if (daysUntil === 0) return lang === "de" ? "Heute" : "Today";
  if (daysUntil === 1) return lang === "de" ? "Morgen" : "Tomorrow";
  const d = new Date(`${dueDate}T12:00:00Z`);
  return d.toLocaleDateString(localeOf(lang), { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
}

// For things that were due before today. Matter-of-fact, no alarm: "Seit Mo", "Seit gestern".
export function waitingLabel(daysUntil: number, dueDate: string, lang: Lang = "de"): string {
  const de = lang === "de";
  if (daysUntil >= -1) return de ? "Seit gestern" : "Since yesterday";
  const d = new Date(`${dueDate}T12:00:00Z`);
  if (daysUntil >= -6) {
    const day = d.toLocaleDateString(localeOf(lang), { weekday: "short", timeZone: "UTC" });
    return de ? `Seit ${day}` : `Since ${day}`;
  }
  const date = d.toLocaleDateString(localeOf(lang), { day: "numeric", month: "numeric", timeZone: "UTC" });
  return de ? `Seit ${date}` : `Since ${date}`;
}

// The occurrence a person would tick off for this routine right now, or null if none is open.
// - A chore that was missed shows its latest missed date (completing it catches up the older ones).
// - A reminder in the past is gone for good: only today or later counts.
// - A bill is its own payment each time, so the oldest unpaid one comes first.
export function nextOccurrence(routine: Routine, occurrences: Occurrence[], today: string): Occurrence | null {
  const open = occurrences
    .filter((o) => o.routineId === routine.id && o.status === "open")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (open.length === 0) return null;
  if (routine.kind === "bill") return open[0];
  const upToToday = open.filter((o) => o.dueDate <= today);
  if (routine.kind === "chore" && upToToday.length > 0) return upToToday[upToToday.length - 1];
  return open.find((o) => o.dueDate >= today) ?? null;
}
