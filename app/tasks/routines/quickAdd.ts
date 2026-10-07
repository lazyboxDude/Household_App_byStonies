// The one-line "add a task" bar: a title plus a couple of chips becomes a routine.
// Pure, so it is testable (`node --test`). The full form (formModel.ts) stays for everything else.

import type { BuiltRoutine } from "./formModel.ts";
import type { Lang } from "./i18n.ts";
import type { RoomSuggestion } from "./rooms.ts";
import { addDays } from "./schedule.ts";
import type { Assignment, IntervalUnit, RoutineMode, Schedule } from "./types.ts";

// "none" is a plain to-do without a date; it lives in the `tasks` table, not here.
export type QuickWhen = "none" | "today" | "tomorrow" | "daily" | "weekly" | "biweekly" | "monthly";

export const RECURRING_WHEN: QuickWhen[] = ["daily", "weekly", "biweekly", "monthly"];

export type QuickWho = { type: "open" } | { type: "member"; id: string } | { type: "turns" };

export interface QuickAddInput {
  title: string;
  when: Exclude<QuickWhen, "none">;
  who: QuickWho;
  roomId: string | null;
  icon?: string;
  supplies?: string[];
  effort?: 1 | 2 | 3 | 5;
  today: string;
  userId: string | undefined;
  memberIds: string[]; // in the household's order
}

const EVERY: Record<"daily" | "weekly" | "biweekly" | "monthly", { every: number; unit: IntervalUnit }> = {
  daily: { every: 1, unit: "day" },
  weekly: { every: 1, unit: "week" },
  biweekly: { every: 2, unit: "week" },
  monthly: { every: 1, unit: "month" },
};

// A single day is a fixed date. Anything that comes back counts from when it was done: if the
// bathroom is cleaned late, the next round starts then, not on an old calendar date.
export function whenToSchedule(when: Exclude<QuickWhen, "none">, today: string): { schedule: Schedule; mode: RoutineMode } {
  if (when === "today") return { schedule: { type: "dates", dates: [today] }, mode: "fixed" };
  if (when === "tomorrow") return { schedule: { type: "dates", dates: [addDays(today, 1)] }, mode: "fixed" };
  return { schedule: { type: "interval", ...EVERY[when], anchor: today }, mode: "after_done" };
}

// "Taking turns" goes through everybody, starting with whoever adds the task.
export function turnOrder(memberIds: string[], userId: string | undefined): string[] {
  if (!userId || !memberIds.includes(userId)) return memberIds;
  return [userId, ...memberIds.filter((id) => id !== userId)];
}

export function buildQuickRoutine(input: QuickAddInput): BuiltRoutine | null {
  const title = input.title.trim();
  if (!title) return null;
  const { schedule, mode } = whenToSchedule(input.when, input.today);

  let assignment: Assignment = "open";
  let assigneeId: string | null = null;
  let rotation: string[] | null = null;
  if (input.who.type === "member") {
    assignment = "fixed";
    assigneeId = input.who.id;
  } else if (input.who.type === "turns" && input.memberIds.length >= 2) {
    assignment = "rotation";
    rotation = turnOrder(input.memberIds, input.userId);
  }

  const recurring = input.when !== "today" && input.when !== "tomorrow";
  return {
    kind: "chore",
    title,
    icon: input.icon ?? (recurring ? "🔁" : "📌"),
    schedule,
    mode,
    activeMonths: null,
    leadDays: 0,
    assigneeId,
    showInCalendar: true,
    amount: null,
    amountKind: null,
    payerId: null,
    expenseCategory: null,
    assignment,
    rotation,
    effort: input.effort ?? 2,
    split: null,
    roomId: input.roomId,
    supplies: input.supplies ?? [],
  };
}

// One tap on a suggestion in a room: the title in the language the person reads, the rhythm and
// supplies the suggestion comes with, open to whoever has time, and due from today.
export function buildSuggestedRoutine(
  suggestion: RoomSuggestion,
  input: { roomId: string; lang: Lang; today: string }
): BuiltRoutine {
  return {
    kind: "chore",
    title: suggestion.title[input.lang],
    icon: suggestion.icon,
    schedule: { type: "interval", every: suggestion.every, unit: suggestion.unit, anchor: input.today },
    mode: "after_done",
    activeMonths: null,
    leadDays: 0,
    assigneeId: null,
    showInCalendar: true,
    amount: null,
    amountKind: null,
    payerId: null,
    expenseCategory: null,
    assignment: "open",
    rotation: null,
    effort: suggestion.effort,
    split: null,
    roomId: input.roomId,
    supplies: suggestion.supplies,
  };
}
