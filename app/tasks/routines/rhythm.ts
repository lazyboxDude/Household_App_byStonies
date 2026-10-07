// Changing how often a task comes back, after it was created. Pure, so it is testable.
//
// The rhythm is the schedule, whether the next date counts from when it was done, and the season.
// Changing it also changes what is already planned: open dates that no longer belong are dropped,
// and the one that is waiting for its turn is counted again. Done and skipped dates are history.

import { whenToSchedule } from "./quickAdd.ts";
import { nextAfterDone, occurrencesBetween } from "./schedule.ts";
import type { Occurrence, Rhythm } from "./types.ts";

// The few rhythms a chip can name. "once" is a single day: it does not come back.
export type Preset = "once" | "daily" | "weekly" | "biweekly" | "monthly";

export const PRESETS: Preset[] = ["once", "daily", "weekly", "biweekly", "monthly"];

// `date` is the day a single-day task is for.
export function presetRhythm(preset: Preset, today: string, date: string): Rhythm {
  if (preset === "once") return { schedule: { type: "dates", dates: [date] }, mode: "fixed", activeMonths: null };
  const { schedule, mode } = whenToSchedule(preset, today);
  return { schedule, mode, activeMonths: null };
}

// Which chip a rhythm is, or null when it needs more words than a chip has.
export function presetOf(r: Rhythm): Preset | null {
  if (r.activeMonths && r.activeMonths.length > 0) return null;
  const s = r.schedule;
  if (s.type === "dates") return s.dates.length === 1 && r.mode === "fixed" ? "once" : null;
  if (s.type !== "interval" || r.mode !== "after_done") return null;
  if (s.every === 1 && s.unit === "day") return "daily";
  if (s.every === 1 && s.unit === "week") return "weekly";
  if (s.every === 2 && s.unit === "week") return "biweekly";
  if (s.every === 1 && s.unit === "month") return "monthly";
  return null;
}

// Keys in the order the database happens to give them must not make two equal rhythms differ.
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, x]) => [k, canonical(x)])
    );
  }
  return v;
}

// Whether two rhythms ask for the same dates. For "after done" the start date of an interval is
// only where it began, so it does not count.
export function sameRhythm(a: Rhythm, b: Rhythm): boolean {
  const normal = (r: Rhythm) => ({
    mode: r.mode,
    months: r.activeMonths && r.activeMonths.length > 0 ? [...r.activeMonths].sort((x, y) => x - y) : null,
    schedule: r.mode === "after_done" && r.schedule.type === "interval" ? { ...r.schedule, anchor: "" } : r.schedule,
  });
  return JSON.stringify(canonical(normal(a))) === JSON.stringify(canonical(normal(b)));
}

export interface OpenDatesPlan {
  // Open dates that no longer belong to the rhythm.
  remove: string[];
  // The open date that is waiting for its turn, counted again.
  move: { id: string; dueDate: string }[];
  // A date to add when nothing is open: a task that counts from when it was done needs one.
  create: string | null;
}

// What to do with the dates that are open when the rhythm changes.
// - A calendar rhythm (weekdays, the 1st, fixed dates): every date from today on that is not in the
//   new rhythm goes. Dates in the past stay: they are still waiting for someone.
// - A rhythm counted from when it was done has exactly one open date. It is counted again from the
//   last time the task was done. A date that is waiting already stays, the new rhythm starts to
//   count when it is done. A task that was never done keeps the date it was planned for.
// - `pickedDue`: the person chose the next date themselves, so it wins over any counting.
export function planOpenDates(input: {
  before: Rhythm;
  after: Rhythm;
  open: Occurrence[];
  today: string;
  lastDone: string | null; // the day it was last ticked off, if ever
  pickedDue: string | null;
}): OpenDatesPlan {
  const { before, after, today, lastDone, pickedDue } = input;
  const open = [...input.open].filter((o) => o.status === "open").sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  if (after.mode === "fixed" || after.schedule.type !== "interval") {
    const remove = open
      .filter((o) => o.dueDate >= today && !occurrencesBetween(after.schedule, o.dueDate, o.dueDate, after.activeMonths).includes(o.dueDate))
      .map((o) => o.id);
    return { remove, move: [], create: null };
  }

  // What the person sees as "the" open date: the latest that is due, else the first one ahead.
  const due = open.filter((o) => o.dueDate <= today);
  const ahead = open.filter((o) => o.dueDate > today);
  const keep = due.length > 0 ? due[due.length - 1] : ahead[0] ?? null;

  const changed = !sameRhythm(before, after);
  let wanted: string | null = null;
  if (pickedDue) {
    wanted = pickedDue > today ? pickedDue : today;
  } else if (changed && lastDone) {
    const counted = nextAfterDone(after.schedule, lastDone) ?? today;
    wanted = counted > today ? counted : today;
    if (keep && keep.dueDate <= today && wanted === today) wanted = null;
  } else if (changed && !keep) {
    wanted = today;
  }

  const move: OpenDatesPlan["move"] = [];
  let create: string | null = null;
  if (wanted !== null) {
    if (keep) {
      if (keep.dueDate !== wanted) move.push({ id: keep.id, dueDate: wanted });
    } else {
      create = wanted;
    }
  }
  // Only one date is open at a time.
  const remove = ahead.filter((o) => o.id !== keep?.id).map((o) => o.id);
  return { remove, move, create };
}
