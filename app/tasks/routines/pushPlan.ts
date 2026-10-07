// Who gets which reminder today. Pure, so it is testable and the server can reuse it.
//
// One reminder per occurrence, on the day its heads-up window starts (due date minus "Vorher
// Bescheid sagen", or the due day itself when that is 0). A person gets one message a day with
// everything that applies to them, not one push per routine.

import { addDays, daysBetween } from "./schedule.ts";
import { chf } from "../../expenses/format.ts";
import type { Absence, Routine } from "./types.ts";

export interface PushOccurrence {
  id: string;
  routineId: string;
  dueDate: string;
  assignedTo: string | null;
  amount: number | null;
  status: string;
  notifiedAt: string | null;
}

export interface PushMessage {
  userId: string;
  title: string;
  body: string;
  occurrenceIds: string[];
  url: string;
}

// Today's date in a time zone (the server runs in UTC, the households live in Switzerland).
export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function dayLabel(due: string, today: string): string {
  const diff = daysBetween(today, due);
  if (diff === 0) return "Heute";
  if (diff === 1) return "Morgen";
  return new Date(`${due}T12:00:00Z`).toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
}

export function shouldNotify(routine: Routine, occ: PushOccurrence, today: string): boolean {
  if (occ.status !== "open" || occ.notifiedAt) return false;
  if (occ.dueDate < today) return false;
  return addDays(occ.dueDate, -Math.max(0, routine.leadDays)) <= today;
}

function recipients(routine: Routine, occ: PushOccurrence, members: string[]): string[] {
  const named = routine.kind === "bill" ? routine.payerId : occ.assignedTo;
  return named && members.includes(named) ? [named] : members;
}

export function planPushMessages(
  routines: Routine[],
  occurrences: PushOccurrence[],
  membersByHousehold: Map<string, string[]>,
  absences: (Absence & { householdId?: string })[],
  today: string
): PushMessage[] {
  const byId = new Map(routines.map((r) => [r.id, r]));
  type Item = { occ: PushOccurrence; text: string };
  const perUser = new Map<string, Item[]>();

  for (const occ of occurrences) {
    const routine = byId.get(occ.routineId);
    if (!routine || !shouldNotify(routine, occ, today)) continue;
    const members = membersByHousehold.get(routine.householdId) ?? [];
    const amount = routine.kind === "bill" ? occ.amount ?? routine.amount : null;
    const text = `${dayLabel(occ.dueDate, today)} · ${routine.title}${amount != null ? ` · ${routine.amountKind === "estimate" ? "ca. " : ""}${chf(amount)}` : ""}`;
    for (const userId of recipients(routine, occ, members)) {
      if (absences.some((a) => a.userId === userId && a.fromDate <= occ.dueDate && occ.dueDate <= a.toDate)) continue;
      perUser.set(userId, [...(perUser.get(userId) ?? []), { occ, text }]);
    }
  }

  const messages: PushMessage[] = [];
  for (const [userId, items] of perUser) {
    items.sort((a, b) => a.occ.dueDate.localeCompare(b.occ.dueDate) || a.text.localeCompare(b.text));
    const shown = items.slice(0, 4).map((i) => i.text);
    const more = items.length - shown.length;
    messages.push({
      userId,
      title: items.length === 1 ? items[0].text : `${items.length} Dinge stehen an`,
      body: items.length === 1 ? "Tippe, um die Wochenübersicht zu öffnen." : [...shown, ...(more > 0 ? [`… und ${more} weitere`] : [])].join("\n"),
      occurrenceIds: items.map((i) => i.occ.id),
      url: "/tasks",
    });
  }
  return messages.sort((a, b) => a.userId.localeCompare(b.userId));
}
