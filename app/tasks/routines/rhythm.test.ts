import { test } from "node:test";
import assert from "node:assert/strict";
import { PRESETS, planOpenDates, presetOf, presetRhythm, sameRhythm } from "./rhythm.ts";
import { buildRoutine, emptyForm, scheduleFieldsFromRoutine, scheduleFromFields } from "./formModel.ts";
import { missingOccurrences } from "./ensure.ts";
import type { Occurrence, Rhythm, Routine } from "./types.ts";

const TODAY = "2026-11-10"; // a Tuesday

function occ(id: string, dueDate: string, status: Occurrence["status"] = "open"): Occurrence {
  return { id, routineId: "r", dueDate, status, assignedTo: null, doneBy: null, doneAt: null, amount: null, expenseId: null, vtTxId: null, locked: false, split: null };
}

const weekly = presetRhythm("weekly", TODAY, TODAY);
const monthly = presetRhythm("monthly", TODAY, TODAY);
const daily = presetRhythm("daily", TODAY, TODAY);

function plan(p: { before: Rhythm; after: Rhythm; open: Occurrence[]; lastDone?: string | null; pickedDue?: string | null }) {
  return planOpenDates({ lastDone: null, pickedDue: null, today: TODAY, ...p });
}

// --- the chips ------------------------------------------------------------------------------

test("rhythm: every chip is a rhythm, and a rhythm knows which chip it is", () => {
  for (const p of PRESETS) assert.equal(presetOf(presetRhythm(p, TODAY, "2026-11-12")), p);
  assert.deepEqual(presetRhythm("biweekly", TODAY, TODAY), {
    schedule: { type: "interval", every: 2, unit: "week", anchor: TODAY },
    mode: "after_done",
    activeMonths: null,
  });
  assert.deepEqual(presetRhythm("once", TODAY, "2026-11-12"), {
    schedule: { type: "dates", dates: ["2026-11-12"] },
    mode: "fixed",
    activeMonths: null,
  });
});

test("rhythm: what a chip cannot say stays without a chip", () => {
  assert.equal(presetOf({ schedule: { type: "interval", every: 3, unit: "month", anchor: TODAY }, mode: "after_done", activeMonths: null }), null);
  assert.equal(presetOf({ schedule: { type: "interval", every: 1, unit: "week", anchor: TODAY }, mode: "fixed", activeMonths: null }), null);
  assert.equal(presetOf({ schedule: { type: "interval", every: 1, unit: "week", anchor: TODAY }, mode: "after_done", activeMonths: [4, 5] }), null);
  assert.equal(presetOf({ schedule: { type: "weekday", weekdays: [1, 4] }, mode: "fixed", activeMonths: null }), null);
  assert.equal(presetOf({ schedule: { type: "dates", dates: ["2026-11-12", "2026-12-10"] }, mode: "fixed", activeMonths: null }), null);
});

test("rhythm: equal rhythms are recognised, whatever order the database gives the keys in", () => {
  const a: Rhythm = { schedule: { type: "monthday", day: 1, months: [3, 6] }, mode: "fixed", activeMonths: null };
  const b: Rhythm = { schedule: { months: [3, 6], day: 1, type: "monthday" } as Rhythm["schedule"], mode: "fixed", activeMonths: [] };
  assert.ok(sameRhythm(a, b));
  assert.ok(!sameRhythm(a, { ...b, schedule: { type: "monthday", day: 2, months: [3, 6] } }));
  assert.ok(!sameRhythm(a, { ...b, schedule: { type: "monthday", day: 1, months: [3, 7] } }));
});

test("rhythm: counted from when it was done, where it began does not matter; in a fixed rhythm it does", () => {
  assert.ok(sameRhythm(presetRhythm("weekly", "2026-01-01", "2026-01-01"), weekly));
  const fixedA: Rhythm = { schedule: { type: "interval", every: 2, unit: "week", anchor: "2026-11-05" }, mode: "fixed", activeMonths: null };
  const fixedB: Rhythm = { schedule: { type: "interval", every: 2, unit: "week", anchor: "2026-11-12" }, mode: "fixed", activeMonths: null };
  assert.ok(!sameRhythm(fixedA, fixedB));
  assert.ok(!sameRhythm(weekly, { ...weekly, mode: "fixed" }));
});

// --- the dates that are open ---------------------------------------------------------------

test("open dates, counted from done: a slower rhythm counts again from the last time", () => {
  // Done two days ago, was due in 5 days; monthly now: a month after the last time.
  const p = plan({ before: weekly, after: monthly, open: [occ("a", "2026-11-15")], lastDone: "2026-11-08" });
  assert.deepEqual(p, { remove: [], move: [{ id: "a", dueDate: "2026-12-08" }], create: null });
});

test("open dates, counted from done: a slower rhythm lets go of a date that was already waiting", () => {
  const p = plan({ before: weekly, after: monthly, open: [occ("a", "2026-11-07")], lastDone: "2026-10-31" });
  assert.deepEqual(p.move, [{ id: "a", dueDate: "2026-11-30" }]);
});

test("open dates, counted from done: a faster rhythm that is already due makes it due today", () => {
  const p = plan({ before: monthly, after: weekly, open: [occ("a", "2026-12-01")], lastDone: "2026-11-01" });
  assert.deepEqual(p.move, [{ id: "a", dueDate: TODAY }]);
});

test("open dates, counted from done: a date that is waiting stays where it is", () => {
  const p = plan({ before: weekly, after: daily, open: [occ("a", "2026-11-07")], lastDone: "2026-10-31" });
  assert.deepEqual(p, { remove: [], move: [], create: null });
});

test("open dates, counted from done: never done, the date it was planned for stays", () => {
  const p = plan({ before: weekly, after: monthly, open: [occ("a", "2026-11-15")], lastDone: null });
  assert.deepEqual(p, { remove: [], move: [], create: null });
});

test("open dates, counted from done: nothing open gets a date, counted from the last time", () => {
  assert.deepEqual(plan({ before: weekly, after: weekly, open: [], lastDone: "2026-11-09" }).create, null, "unchanged: nothing to do");
  assert.equal(plan({ before: monthly, after: weekly, open: [], lastDone: "2026-11-09" }).create, "2026-11-16");
  assert.equal(plan({ before: monthly, after: weekly, open: [], lastDone: "2026-10-01" }).create, TODAY, "long ago: due now");
  assert.equal(plan({ before: monthly, after: weekly, open: [], lastDone: null }).create, TODAY, "never done: due now");
});

test("open dates, counted from done: a date the person picked wins, but never lies in the past", () => {
  const open = [occ("a", "2026-11-15")];
  assert.deepEqual(plan({ before: weekly, after: weekly, open, pickedDue: "2026-11-20", lastDone: "2026-11-08" }).move, [{ id: "a", dueDate: "2026-11-20" }]);
  assert.deepEqual(plan({ before: weekly, after: weekly, open, pickedDue: "2026-11-01" }).move, [{ id: "a", dueDate: TODAY }]);
  assert.equal(plan({ before: weekly, after: weekly, open: [], pickedDue: "2026-11-20" }).create, "2026-11-20");
  assert.deepEqual(plan({ before: weekly, after: weekly, open, pickedDue: "2026-11-15" }).move, [], "same date: nothing moves");
});

test("open dates, counted from done: only one date stays open", () => {
  // Was a calendar rhythm with a few dates ahead; the first one ahead stays.
  const ahead = plan({ before: { schedule: { type: "weekday", weekdays: [4] }, mode: "fixed", activeMonths: null }, after: weekly, open: [occ("a", "2026-11-12"), occ("b", "2026-11-19"), occ("c", "2026-11-26")] });
  assert.deepEqual(ahead, { remove: ["b", "c"], move: [], create: null });
  // A date that is waiting counts as the open one.
  const waiting = plan({ before: { schedule: { type: "weekday", weekdays: [4] }, mode: "fixed", activeMonths: null }, after: weekly, open: [occ("a", "2026-11-05"), occ("b", "2026-11-12")] });
  assert.deepEqual(waiting.remove, ["b"]);
});

test("open dates, calendar rhythm: dates from today on follow the new rhythm, dates in the past stay", () => {
  const monThu: Rhythm = { schedule: { type: "weekday", weekdays: [1, 4] }, mode: "fixed", activeMonths: null };
  const open = [
    occ("past", "2026-11-09"), // Monday, already over: still waiting for someone
    occ("today", "2026-11-10"), // Tuesday: not in the new rhythm
    occ("thu", "2026-11-12"), // Thursday: stays
    occ("fri", "2026-11-13"), // Friday: goes
    occ("mon", "2026-11-16"), // Monday: stays
  ];
  assert.deepEqual(plan({ before: weekly, after: monThu, open }), { remove: ["today", "fri"], move: [], create: null });
});

test("open dates, calendar rhythm: a single day replaces the dates of a rhythm", () => {
  const once = presetRhythm("once", TODAY, "2026-11-15");
  const p = plan({ before: weekly, after: once, open: [occ("a", "2026-11-15")] });
  assert.deepEqual(p, { remove: [], move: [], create: null }, "its own date stays");
  const other = plan({ before: weekly, after: presetRhythm("once", TODAY, "2026-11-20"), open: [occ("a", "2026-11-15")] });
  assert.deepEqual(other.remove, ["a"]);
});

test("open dates, calendar rhythm: a season keeps the dates outside of it away", () => {
  const winterMondays: Rhythm = { schedule: { type: "weekday", weekdays: [1] }, mode: "fixed", activeMonths: [12, 1, 2] };
  const p = plan({ before: weekly, after: winterMondays, open: [occ("nov", "2026-11-16"), occ("dec", "2026-12-07")] });
  assert.deepEqual(p.remove, ["nov"]);
});

test("open dates: done and skipped dates are history and are never touched", () => {
  const p = plan({
    before: weekly,
    after: { schedule: { type: "weekday", weekdays: [1] }, mode: "fixed", activeMonths: null },
    open: [occ("done", "2026-11-12", "done"), occ("skipped", "2026-11-13", "skipped")],
  });
  assert.deepEqual(p, { remove: [], move: [], create: null });
});

test("open dates: after the change, the planner fills the dates of the new rhythm", () => {
  const routine: Routine = {
    id: "r", householdId: "h", kind: "chore", title: "Bad", icon: "🔁",
    schedule: { type: "weekday", weekdays: [1, 4] }, mode: "fixed", activeMonths: null, leadDays: 0, assigneeId: null, showInCalendar: true,
    amount: null, amountKind: null, payerId: null, expenseCategory: null, assignment: "open", rotation: null, effort: 2, split: null, roomId: null, supplies: [],
  };
  const open = [occ("thu", "2026-11-12")];
  const filled = missingOccurrences([routine], open, TODAY, 14).map((m) => m.dueDate);
  assert.deepEqual(filled, ["2026-11-16", "2026-11-19", "2026-11-23"]);
});

// --- the form fields of a task that exists --------------------------------------------------

const asRoutine = (r: Rhythm): Routine => ({
  id: "r", householdId: "h", kind: "chore", title: "Bad", icon: "🔁", ...r, leadDays: 0, assigneeId: null, showInCalendar: true,
  amount: null, amountKind: null, payerId: null, expenseCategory: null, assignment: "open", rotation: null, effort: 2, split: null, roomId: null, supplies: [],
});

test("fields: a rhythm that exists comes back out of the form unchanged", () => {
  const cases: Rhythm[] = [
    { schedule: { type: "weekday", weekdays: [1, 4] }, mode: "fixed", activeMonths: null },
    { schedule: { type: "weekday", weekdays: [4], everyNWeeks: 2, anchor: "2026-11-05" }, mode: "fixed", activeMonths: [3, 4, 5] },
    { schedule: { type: "monthday", day: "last", months: [6, 7] }, mode: "fixed", activeMonths: null },
    { schedule: { type: "monthday", day: 15 }, mode: "fixed", activeMonths: null },
    { schedule: { type: "nth_weekday", nth: -1, weekday: 5 }, mode: "fixed", activeMonths: null },
    { schedule: { type: "dates", dates: ["2026-11-12", "2026-12-10"] }, mode: "fixed", activeMonths: null },
    { schedule: { type: "interval", every: 3, unit: "month", anchor: "2026-11-20" }, mode: "fixed", activeMonths: [4, 5, 6, 7, 8, 9] },
  ];
  for (const rhythm of cases) {
    for (const lang of ["de", "en"] as const) {
      const fields = scheduleFieldsFromRoutine(asRoutine(rhythm), TODAY, null, lang);
      const back = scheduleFromFields(fields);
      assert.ok(back.ok, JSON.stringify(rhythm));
      if (back.ok) assert.ok(sameRhythm(back.rhythm, rhythm), `${lang}: ${JSON.stringify(rhythm)} -> ${JSON.stringify(back.rhythm)}`);
    }
  }
});

test("fields: counted from done starts at the date that is planned", () => {
  const fields = scheduleFieldsFromRoutine(asRoutine(weekly), TODAY, "2026-11-15");
  assert.equal(fields.startDate, "2026-11-15");
  assert.equal(fields.mode, "after_done");
  assert.equal(scheduleFieldsFromRoutine(asRoutine(weekly), TODAY, null).startDate, TODAY);
  // A fixed interval keeps the start it counts from, when nothing is planned.
  const fixed: Rhythm = { schedule: { type: "interval", every: 2, unit: "week", anchor: "2026-11-05" }, mode: "fixed", activeMonths: null };
  assert.equal(scheduleFieldsFromRoutine(asRoutine(fixed), TODAY, null).startDate, "2026-11-05");
});

test("fields: dates are written the way the person reads them", () => {
  const dates: Rhythm = { schedule: { type: "dates", dates: ["2026-11-12", "2026-12-10"] }, mode: "fixed", activeMonths: null };
  assert.equal(scheduleFieldsFromRoutine(asRoutine(dates), TODAY, null, "de").datesText, "12.11.2026\n10.12.2026");
  assert.equal(scheduleFieldsFromRoutine(asRoutine(dates), TODAY, null, "en").datesText, "2026-11-12\n2026-12-10");
});

test("fields: a wrong entry says what is wrong, in both languages", () => {
  const base = scheduleFieldsFromRoutine(asRoutine(weekly), TODAY, null);
  const noDay = scheduleFromFields({ ...base, repeat: "weekday", weekdays: [] });
  assert.ok(!noDay.ok && noDay.message.de === "An welchem Wochentag?" && noDay.message.en === "On which weekday?");
  const badDate = scheduleFromFields({ ...base, repeat: "dates", datesText: "12.13.2026" });
  assert.ok(!badDate.ok && badDate.message.en.includes("12.13.2026") && badDate.message.de.includes("12.13.2026"));
  assert.ok(!scheduleFromFields({ ...base, every: 0 }).ok);
});

test("fields: the full form still builds the same task as before", () => {
  const built = buildRoutine({ ...emptyForm(TODAY), title: "Pflanzen giessen", repeat: "weekday", weekdays: [3, 1], months: [5, 6] });
  assert.ok(built.ok);
  if (built.ok) {
    assert.deepEqual(built.routine.schedule, { type: "weekday", weekdays: [1, 3] });
    assert.equal(built.routine.mode, "fixed");
    assert.deepEqual(built.routine.activeMonths, [5, 6]);
  }
});
