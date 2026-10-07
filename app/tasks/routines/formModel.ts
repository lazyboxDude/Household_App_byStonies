// Form state <-> Routine. Kept out of the component so it can be tested.

import type { Bilingual, Lang } from "./i18n.ts";
import { addDays, occurrencesBetween, parseDateList, weekdayOf } from "./schedule.ts";
import { equalSplit, splitTotal } from "./settle.ts";
import type { AmountKind, Assignment, IntervalUnit, LivingMode, Rhythm, Routine, RoutineKind, RoutineMode, Schedule, Split } from "./types.ts";
import type { RoutineTemplate } from "./templates.ts";

// The part of the form that says when something comes back. Shared by the full form and by the
// panel that changes the rhythm of a task that already exists.
export interface ScheduleFields {
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
}

export interface RoutineFormState extends ScheduleFields {
  kind: RoutineKind;
  title: string;
  icon: string;
  leadDays: number;
  assigneeId: string | null;
  showInCalendar: boolean;
  // Bills
  amountText: string; // as typed, so "95,50" and an empty field both work
  amountKind: AmountKind;
  payerId: string | null;
  expenseCategory: string;
  // Who does it
  assignment: Assignment;
  rotation: string[]; // chosen members; the turn order follows the member list
  effort: 1 | 2 | 3 | 5;
  // Bills: how the cost is divided
  splitMode: "none" | "equal" | "custom";
  splitCustom: Record<string, string>; // user id -> percent as typed
  // Where it happens, and what it needs (supplies are stored under their English preset name)
  roomId: string | null;
  supplies: string[];
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
  amount: number | null;
  amountKind: AmountKind | null;
  payerId: string | null;
  expenseCategory: string | null;
  assignment: Assignment;
  rotation: string[] | null;
  effort: 1 | 2 | 3 | 5;
  split: Split | null;
  roomId: string | null;
  supplies: string[];
}

// "95", "95.50", "95,50", "1'250.00" -> number; empty or unreadable -> null.
export function parseAmount(text: string): number | null {
  const cleaned = text.trim().replace(/[\s'’]/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
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
    amountText: "",
    amountKind: "fixed",
    payerId: null,
    expenseCategory: "",
    assignment: "open",
    rotation: [],
    effort: 2,
    splitMode: "none",
    splitCustom: {},
    roomId: null,
    supplies: [],
  };
}

// Paar vs. WG only changes the starting point: a WG rotates chores and splits bills equally,
// a couple starts open and without a split (they often pay from the joint account).
// It never overrides something the person already chose.
export function livingDefaults(f: RoutineFormState, mode: LivingMode, memberIds: string[]): RoutineFormState {
  if (mode !== "wg" || memberIds.length < 2) return f;
  const next = { ...f };
  if (next.assignment === "open" && next.rotation.length === 0) {
    next.assignment = "rotation";
    next.rotation = memberIds;
  }
  if (next.splitMode === "none") next.splitMode = "equal";
  return next;
}

// Switching to "Rechnung" moves the sensible defaults along: monthly on the 1st, fixed date,
// a week of notice. Switching away leaves what the person already set.
export function withKind(f: RoutineFormState, kind: RoutineKind): RoutineFormState {
  if (kind === f.kind) return f;
  if (kind === "bill") return { ...f, kind, repeat: "monthday", mode: "fixed", monthDay: 1, leadDays: Math.max(f.leadDays, 7) };
  return { ...f, kind };
}

export function formFromTemplate(t: RoutineTemplate, today: string, lang: Lang = "de"): RoutineFormState {
  const base: RoutineFormState = {
    ...emptyForm(today),
    kind: t.kind,
    title: t.title[lang],
    icon: t.icon,
    mode: t.mode,
    leadDays: t.leadDays,
    months: t.activeMonths ?? [],
    amountKind: t.amountKind ?? "fixed",
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

// A failed build carries its message in both languages; the form shows the one the person reads.
export type BuildResult = { ok: true; routine: BuiltRoutine } | { ok: false; message: Bilingual };

export type ScheduleResult = { ok: true; rhythm: Rhythm } | { ok: false; message: Bilingual };

// Reads the "when" part of the form. Bills and everything else that is not a plain interval
// follow the calendar: "after done" only exists for intervals.
export function scheduleFromFields(f: ScheduleFields, isBill = false): ScheduleResult {
  let schedule: Schedule;
  switch (f.repeat) {
    case "interval":
      if (!Number.isFinite(f.every) || f.every < 1) {
        return { ok: false, message: { en: "How often should it come back?", de: "Wie oft soll es wiederkommen?" } };
      }
      schedule = { type: "interval", every: Math.floor(f.every), unit: f.unit, anchor: f.startDate };
      break;
    case "weekday":
      if (f.weekdays.length === 0) return { ok: false, message: { en: "On which weekday?", de: "An welchem Wochentag?" } };
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
      if (invalid.length > 0) {
        return { ok: false, message: { en: `I can't read this date: ${invalid[0]}`, de: `Dieses Datum kann ich nicht lesen: ${invalid[0]}` } };
      }
      if (dates.length === 0) {
        return { ok: false, message: { en: "Add at least one date, for example 12.11.2026.", de: "Trag mindestens ein Datum ein, zum Beispiel 12.11.2026." } };
      }
      schedule = { type: "dates", dates };
      break;
    }
  }

  const mode: RoutineMode = f.repeat === "interval" && !isBill ? f.mode : "fixed";
  return {
    ok: true,
    rhythm: {
      schedule,
      mode,
      // monthday / nth_weekday carry their months inside the schedule. The season filter
      // is only for repeating weekdays and fixed intervals.
      activeMonths:
        f.months.length > 0 && mode === "fixed" && (f.repeat === "weekday" || f.repeat === "interval") ? f.months : null,
    },
  };
}

// "12.11.2026" for people who read German, the plain date for everybody else.
function datesAsText(dates: string[], lang: Lang): string {
  return dates.map((d) => (lang === "de" ? d.split("-").reverse().join(".") : d)).join("\n");
}

// The other way round: a task that exists, as the fields the person edits. `nextDue` is the date
// that is planned right now, so a rhythm counted from "next time" starts out at the real date.
export function scheduleFieldsFromRoutine(
  r: Pick<Routine, "schedule" | "mode" | "activeMonths">,
  today: string,
  nextDue: string | null,
  lang: Lang = "de"
): ScheduleFields {
  const base = emptyForm(today);
  const fields: ScheduleFields = {
    repeat: r.schedule.type,
    every: base.every,
    unit: base.unit,
    mode: r.mode,
    startDate: nextDue ?? today,
    weekdays: base.weekdays,
    everyNWeeks: 1,
    anchorDate: nextDue ?? today,
    monthDay: base.monthDay,
    nth: base.nth,
    nthWeekday: base.nthWeekday,
    datesText: "",
    months: [],
  };
  const s = r.schedule;
  switch (s.type) {
    case "interval":
      return { ...fields, every: s.every, unit: s.unit, startDate: nextDue ?? (r.mode === "fixed" ? s.anchor : today), months: r.activeMonths ?? [] };
    case "weekday":
      return {
        ...fields,
        weekdays: s.weekdays,
        everyNWeeks: s.everyNWeeks ?? 1,
        anchorDate: s.anchor ?? nextWeekdayDate(s.weekdays, today),
        months: r.activeMonths ?? [],
      };
    case "monthday":
      return { ...fields, monthDay: s.day, months: s.months ?? [] };
    case "nth_weekday":
      return { ...fields, nth: s.nth, nthWeekday: s.weekday, months: s.months ?? [] };
    case "dates":
      return { ...fields, datesText: datesAsText(s.dates, lang) };
  }
}

export function buildRoutine(f: RoutineFormState, memberIds: string[] = []): BuildResult {
  const title = f.title.trim();
  if (!title) return { ok: false, message: { en: "What should it be called?", de: "Wie soll es heissen?" } };

  const isBill = f.kind === "bill";
  const when = scheduleFromFields(f, isBill);
  if (!when.ok) return when;
  const { schedule, mode, activeMonths } = when.rhythm;

  const amount = isBill ? parseAmount(f.amountText) : null;
  if (isBill && f.amountKind !== "variable" && amount === null) {
    return {
      ok: false,
      message: f.amountKind === "estimate"
        ? { en: "Roughly how much is it?", de: "Wie viel ist es ungefähr?" }
        : { en: "How much does it cost?", de: "Wie viel kostet es?" },
    };
  }

  // Who does it (not for bills: they have a payer)
  let rotation: string[] | null = null;
  if (!isBill) {
    if (f.assignment === "fixed" && !f.assigneeId) return { ok: false, message: { en: "Who does it?", de: "Wer macht es?" } };
    if (f.assignment === "rotation") {
      rotation = (memberIds.length > 0 ? memberIds.filter((m) => f.rotation.includes(m)) : f.rotation);
      if (rotation.length < 2) {
        return { ok: false, message: { en: "Pick at least two people who take turns.", de: "Such mindestens zwei Personen aus, die sich abwechseln." } };
      }
    }
  }

  // How a bill is divided
  let split: Split | null = null;
  if (isBill && f.splitMode === "equal") {
    if (memberIds.length < 2) {
      return { ok: false, message: { en: "Splitting needs at least two people in the household.", de: "Zum Aufteilen braucht es mindestens zwei Personen im Haushalt." } };
    }
    split = equalSplit(memberIds);
  }
  if (isBill && f.splitMode === "custom") {
    const parsed: Split = {};
    for (const [id, text] of Object.entries(f.splitCustom)) {
      const n = parseAmount(text);
      if (n !== null && n > 0) parsed[id] = n;
    }
    const total = splitTotal(parsed);
    if (Object.keys(parsed).length < 2 || Math.abs(total - 100) > 0.01) {
      return { ok: false, message: { en: `The percentages add up to ${total}. They should make 100.`, de: `Die Prozente ergeben zusammen ${total}. Es sollten 100 sein.` } };
    }
    split = parsed;
  }

  return {
    ok: true,
    routine: {
      kind: f.kind,
      title,
      icon: f.icon,
      schedule,
      mode,
      activeMonths,
      leadDays: f.leadDays,
      assigneeId: !isBill && f.assignment === "fixed" ? f.assigneeId : null,
      showInCalendar: f.showInCalendar,
      amount,
      amountKind: isBill ? f.amountKind : null,
      payerId: isBill ? f.payerId : null,
      expenseCategory: isBill && f.expenseCategory.trim() ? f.expenseCategory.trim() : null,
      assignment: isBill ? "open" : f.assignment,
      rotation,
      effort: isBill ? 2 : f.effort,
      split,
      roomId: f.roomId,
      supplies: f.supplies,
    },
  };
}

// "Die nächsten Termine" preview for the form.
export function previewDates(r: Rhythm, today: string, count = 3): string[] {
  if (r.mode === "after_done") {
    return r.schedule.type === "interval" ? [r.schedule.anchor > today ? r.schedule.anchor : today] : [];
  }
  return occurrencesBetween(r.schedule, today, addDays(today, 3 * 366), r.activeMonths).slice(0, count);
}
