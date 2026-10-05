// Form state <-> Routine. Kept out of the component so it can be tested.

import { addDays, occurrencesBetween, parseDateList, weekdayOf } from "./schedule.ts";
import type { IntervalUnit, RoutineKind, RoutineMode, Schedule } from "./types.ts";
import type { RoutineTemplate } from "./templates.ts";

export interface RoutineFormState {
  kind: RoutineKind;
  title: string;
  icon: string;
  repeat: Schedule["type"];
  every: number;
  unit: IntervalUnit;
  mode: RoutineMode;
  startDate: string; // interval: first due date
  weekdays: number[];
  everyNWeeks: number;
  anchorDate: string; // weekday every N weeks: a date that is due
  monthDay: number | "last";
  nth: 1 | 2 | 3 | 4 | -1;
  nthWeekday: number;
  datesText: string;
  months: number[]; // empty = all year
  leadDays: number;
  assigneeId: string | null;
  showInCalendar: boolean;
}

export interface BuiltRoutine {
  kind: RoutineKind;
  title: string;
  icon: string;
  schedule: Schedule;
  mode: RoutineMode;
  activeMonths: number[] | null;
  leadDays: number;
  assigneeId: string | null;
  showInCalendar: boolean;
}

// The next date on or after `from` that falls on one of the weekdays.
export function nextWeekdayDate(weekdays: number[], from: string): string {
  if (weekdays.length === 0) return from;
  for (let i = 0; i < 7; i++) {
    const d = addDays(from, i);
    if (weekdays.includes(weekdayOf(d))) return d;
  }
  return from;
}

export function emptyForm(today: string): RoutineFormState {
  return {
    kind: "chore",
    title: "",
    icon: "🔁",
    repeat: "interval",
    every: 1,
    unit: "week",
    mode: "after_done",
    startDate: today,
    weekdays: [weekdayOf(today)],
    everyNWeeks: 1,
    anchorDate: today,
    monthDay: 1,
    nth: 1,
    nthWeekday: 1,
    datesText: "",
    months: [],
    leadDays: 0,
    assigneeId: null,
    showInCalendar: true,
  };
}

export function formFromTemplate(t: RoutineTemplate, today: string): RoutineFormState {
  const base: RoutineFormState = {
    ...emptyForm(today),
    kind: t.kind,
    title: t.title,
    icon: t.icon,
    mode: t.mode,
    leadDays: t.leadDays,
    months: t.activeMonths ?? [],
  };
  const s = t.schedule(today);
  base.repeat = s.type;
  switch (s.type) {
    case "interval":
      return { ...base, every: s.every, unit: s.unit, startDate: s.anchor };
    case "weekday": {
      const next = nextWeekdayDate(s.weekdays, today);
      return { ...base, weekdays: s.weekdays, everyNWeeks: s.everyNWeeks ?? 1, anchorDate: next };
    }
    case "monthday":
      return { ...base, monthDay: s.day };
    case "nth_weekday":
      return { ...base, nth: s.nth, nthWeekday: s.weekday };
    case "dates":
      return { ...base, datesText: s.dates.join("\n") };
  }
}

export type BuildResult = { ok: true; routine: BuiltRoutine } | { ok: false; message: string };

export function buildRoutine(f: RoutineFormState): BuildResult {
  const title = f.title.trim();
  if (!title) return { ok: false, message: "Wie soll die Routine heissen?" };

  let schedule: Schedule;
  switch (f.repeat) {
    case "interval":
      if (!Number.isFinite(f.every) || f.every < 1) return { ok: false, message: "Wie oft soll es wiederkommen?" };
      schedule = { type: "interval", every: Math.floor(f.every), unit: f.unit, anchor: f.startDate };
      break;
    case "weekday":
      if (f.weekdays.length === 0) return { ok: false, message: "An welchem Wochentag?" };
      schedule = {
        type: "weekday",
        weekdays: [...f.weekdays].sort(),
        ...(f.everyNWeeks > 1 ? { everyNWeeks: f.everyNWeeks, anchor: f.anchorDate } : {}),
      };
      break;
    case "monthday":
      schedule = { type: "monthday", day: f.monthDay, ...(f.months.length ? { months: f.months } : {}) };
      break;
    case "nth_weekday":
      schedule = { type: "nth_weekday", nth: f.nth, weekday: f.nthWeekday, ...(f.months.length ? { months: f.months } : {}) };
      break;
    case "dates": {
      const { dates, invalid } = parseDateList(f.datesText);
      if (invalid.length > 0) return { ok: false, message: `Dieses Datum kann ich nicht lesen: ${invalid[0]}` };
      if (dates.length === 0) return { ok: false, message: "Trag mindestens ein Datum ein, zum Beispiel 12.11.2026." };
      schedule = { type: "dates", dates };
      break;
    }
  }

  // "After done" only exists for intervals; everything else follows the calendar.
  const mode: RoutineMode = f.repeat === "interval" ? f.mode : "fixed";
  return {
    ok: true,
    routine: {
      kind: f.kind,
      title,
      icon: f.icon,
      schedule,
      mode,
      // monthday / nth_weekday carry their months inside the schedule. The season filter
      // is only for repeating weekdays and fixed intervals.
      activeMonths:
        f.months.length > 0 && mode === "fixed" && (f.repeat === "weekday" || f.repeat === "interval") ? f.months : null,
      leadDays: f.leadDays,
      assigneeId: f.assigneeId,
      showInCalendar: f.showInCalendar,
    },
  };
}

// "Die nächsten Termine" preview for the form.
export function previewDates(r: BuiltRoutine, today: string, count = 3): string[] {
  if (r.mode === "after_done") {
    return r.schedule.type === "interval" ? [r.schedule.anchor > today ? r.schedule.anchor : today] : [];
  }
  return occurrencesBetween(r.schedule, today, addDays(today, 3 * 366), r.activeMonths).slice(0, count);
}
