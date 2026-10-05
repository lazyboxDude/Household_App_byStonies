// Run with: node --test app/tasks/routines/schedule.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { addMonths, nextAfterDone, occurrencesBetween, parseDateList } from "./schedule.ts";
import { buildAgenda } from "./agenda.ts";
import { missingOccurrences } from "./ensure.ts";
import { buildRoutine, emptyForm, formFromTemplate, previewDates } from "./formModel.ts";
import { ROUTINE_TEMPLATES } from "./templates.ts";
import { describeRoutine } from "./describe.ts";
import type { Occurrence, Routine, Schedule } from "./types.ts";

test("addMonths clamps to the end of the month", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonths("2026-11-30", 3), "2027-02-28");
  assert.equal(addMonths("2026-03-15", -3), "2025-12-15");
});

test("interval: monthly is a calendar month, not 30 days", () => {
  const s: Schedule = { type: "interval", every: 1, unit: "month", anchor: "2026-01-31" };
  assert.deepEqual(occurrencesBetween(s, "2026-01-01", "2026-04-30"), [
    "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30",
  ]);
});

test("interval: starts counting from the anchor, far in the past too", () => {
  const s: Schedule = { type: "interval", every: 2, unit: "week", anchor: "2024-01-04" };
  assert.deepEqual(occurrencesBetween(s, "2026-11-01", "2026-11-30"), ["2026-11-05", "2026-11-19"]);
  const m: Schedule = { type: "interval", every: 1, unit: "month", anchor: "2024-01-15" };
  assert.deepEqual(occurrencesBetween(m, "2026-08-01", "2026-09-30"), ["2026-08-15", "2026-09-15"]);
});

test("interval: nothing before the anchor", () => {
  const s: Schedule = { type: "interval", every: 1, unit: "day", anchor: "2026-11-03" };
  assert.deepEqual(occurrencesBetween(s, "2026-11-01", "2026-11-04"), ["2026-11-03", "2026-11-04"]);
});

test("weekday: every second Thursday, counted from the anchor week", () => {
  // 2026-11-05 is a Thursday.
  const s: Schedule = { type: "weekday", weekdays: [4], everyNWeeks: 2, anchor: "2026-11-05" };
  assert.deepEqual(occurrencesBetween(s, "2026-11-01", "2026-12-15"), [
    "2026-11-05", "2026-11-19", "2026-12-03",
  ]);
  // The anchor may be any day of that week.
  const s2: Schedule = { type: "weekday", weekdays: [4], everyNWeeks: 2, anchor: "2026-11-02" };
  assert.deepEqual(occurrencesBetween(s2, "2026-11-01", "2026-11-30"), ["2026-11-05", "2026-11-19"]);
  // Also works backwards from an anchor in the future.
  const s3: Schedule = { type: "weekday", weekdays: [4], everyNWeeks: 2, anchor: "2026-12-03" };
  assert.deepEqual(occurrencesBetween(s3, "2026-11-01", "2026-11-30"), ["2026-11-05", "2026-11-19"]);
});

test("weekday: several weekdays, weekly", () => {
  const s: Schedule = { type: "weekday", weekdays: [1, 4] }; // Mon + Thu
  assert.deepEqual(occurrencesBetween(s, "2026-11-02", "2026-11-09"), [
    "2026-11-02", "2026-11-05", "2026-11-09",
  ]);
});

test("monthday: 1st, last day, and day 31 in short months", () => {
  assert.deepEqual(
    occurrencesBetween({ type: "monthday", day: 1 }, "2026-11-15", "2027-01-31"),
    ["2026-12-01", "2027-01-01"]
  );
  assert.deepEqual(
    occurrencesBetween({ type: "monthday", day: "last" }, "2026-02-01", "2026-04-30"),
    ["2026-02-28", "2026-03-31", "2026-04-30"]
  );
  assert.deepEqual(
    occurrencesBetween({ type: "monthday", day: 31 }, "2026-04-01", "2026-05-31"),
    ["2026-04-30", "2026-05-31"]
  );
});

test("monthday: limited to some months (Jahresabrechnung, quarterly)", () => {
  assert.deepEqual(
    occurrencesBetween({ type: "monthday", day: 15, months: [3] }, "2026-01-01", "2027-12-31"),
    ["2026-03-15", "2027-03-15"]
  );
  assert.deepEqual(
    occurrencesBetween({ type: "monthday", day: 1, months: [1, 4, 7, 10] }, "2026-01-01", "2026-12-31"),
    ["2026-01-01", "2026-04-01", "2026-07-01", "2026-10-01"]
  );
});

test("nth_weekday: first Monday, last Friday", () => {
  assert.deepEqual(
    occurrencesBetween({ type: "nth_weekday", nth: 1, weekday: 1 }, "2026-11-01", "2027-01-31"),
    ["2026-11-02", "2026-12-07", "2027-01-04"]
  );
  assert.deepEqual(
    occurrencesBetween({ type: "nth_weekday", nth: -1, weekday: 5 }, "2026-11-01", "2026-12-31"),
    ["2026-11-27", "2026-12-25"]
  );
});

test("nth_weekday: the 4th weekday always exists, the 5th is not offered", () => {
  assert.deepEqual(
    occurrencesBetween({ type: "nth_weekday", nth: 4, weekday: 0 }, "2026-02-01", "2026-02-28"),
    ["2026-02-22"]
  );
});

test("dates: explicit list, filtered to the window", () => {
  const s: Schedule = { type: "dates", dates: ["2026-10-01", "2026-11-12", "2026-12-10"] };
  assert.deepEqual(occurrencesBetween(s, "2026-11-01", "2026-12-31"), ["2026-11-12", "2026-12-10"]);
});

test("activeMonths: Grünabfuhr only March to November", () => {
  const s: Schedule = { type: "weekday", weekdays: [2] }; // Tuesdays
  const got = occurrencesBetween(s, "2026-02-23", "2026-03-10", [3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(got, ["2026-03-03", "2026-03-10"]);
  assert.deepEqual(occurrencesBetween(s, "2026-12-01", "2026-12-31", [3, 4, 5]), []);
});

test("empty or inverted range", () => {
  assert.deepEqual(occurrencesBetween({ type: "monthday", day: 1 }, "2026-11-10", "2026-11-09"), []);
});

test("nextAfterDone counts from the day it was done", () => {
  const weekly: Schedule = { type: "interval", every: 1, unit: "week", anchor: "2026-01-01" };
  assert.equal(nextAfterDone(weekly, "2026-11-10"), "2026-11-17");
  const monthly: Schedule = { type: "interval", every: 1, unit: "month", anchor: "2026-01-01" };
  assert.equal(nextAfterDone(monthly, "2026-01-31"), "2026-02-28");
  assert.equal(nextAfterDone({ type: "monthday", day: 1 }, "2026-11-10"), null);
});

test("parseDateList reads ISO and Swiss formats and reports the rest", () => {
  const { dates, invalid } = parseDateList("05.11.2026\n2026-12-03, 7.1.27; 31.02.2026\nbald");
  assert.deepEqual(dates, ["2026-11-05", "2026-12-03", "2027-01-07"]);
  assert.deepEqual(invalid, ["31.02.2026", "bald"]);
});

// --- agenda ---

function routine(p: Partial<Routine>): Routine {
  return {
    id: "r1", householdId: "h", kind: "chore", title: "Bad putzen", icon: "🛁",
    schedule: { type: "interval", every: 1, unit: "week", anchor: "2026-11-01" },
    mode: "after_done", activeMonths: null, leadDays: 0, assigneeId: null, showInCalendar: true,
    ...p,
  };
}
function occ(p: Partial<Occurrence>): Occurrence {
  return { id: "o", routineId: "r1", dueDate: "2026-11-10", status: "open", assignedTo: null, doneBy: null, doneAt: null, ...p };
}

test("agenda: groups today, soon and waiting chores; ignores done and far-away ones", () => {
  const today = "2026-11-10";
  const routines = [routine({ id: "a", title: "A" }), routine({ id: "b", title: "B" }), routine({ id: "c", title: "C" })];
  const items = buildAgenda(routines, [
    occ({ id: "1", routineId: "a", dueDate: "2026-11-08" }),
    occ({ id: "2", routineId: "b", dueDate: "2026-11-10" }),
    occ({ id: "3", routineId: "c", dueDate: "2026-11-12" }),
    occ({ id: "4", routineId: "c", dueDate: "2026-11-30" }),
    occ({ id: "5", routineId: "b", dueDate: "2026-11-11", status: "done" }),
  ], today);
  assert.deepEqual(items.map((i) => [i.occurrence.id, i.group]), [["1", "waiting"], ["2", "today"], ["3", "soon"]]);
});

test("agenda: a chore missed several times shows once, with the latest date", () => {
  const items = buildAgenda([routine({})], [
    occ({ id: "old", dueDate: "2026-10-20" }),
    occ({ id: "new", dueDate: "2026-11-03" }),
  ], "2026-11-10");
  assert.deepEqual(items.map((i) => i.occurrence.id), ["new"]);
});

test("agenda: past reminders drop out, heads-up starts leadDays before", () => {
  const reminder = routine({ id: "k", kind: "reminder", title: "Kehricht", mode: "fixed", leadDays: 1 });
  const items = buildAgenda([reminder], [
    occ({ id: "past", routineId: "k", dueDate: "2026-11-05" }),
    occ({ id: "tomorrow", routineId: "k", dueDate: "2026-11-11" }),
    occ({ id: "later", routineId: "k", dueDate: "2026-11-15" }),
  ], "2026-11-10");
  assert.deepEqual(items.map((i) => [i.occurrence.id, i.headsUp]), [["tomorrow", true], ["later", false]]);
});

// --- ensure ---

test("ensure: fixed routines get every date in the next 8 weeks, existing rows are not repeated", () => {
  const kehricht = routine({
    id: "k", kind: "reminder", mode: "fixed",
    schedule: { type: "weekday", weekdays: [4], everyNWeeks: 2, anchor: "2026-11-05" },
  });
  const have = [occ({ routineId: "k", dueDate: "2026-11-19", status: "done" })];
  const missing = missingOccurrences([kehricht], have, "2026-11-10");
  assert.deepEqual(missing.map((m) => m.dueDate), ["2026-12-03", "2026-12-17", "2026-12-31"]);
});

test("ensure: after_done routine gets one starting occurrence, then none while one is open", () => {
  const bad = routine({ id: "b", schedule: { type: "interval", every: 1, unit: "week", anchor: "2026-11-01" } });
  assert.deepEqual(missingOccurrences([bad], [], "2026-11-10"), [{ routineId: "b", dueDate: "2026-11-10" }]);
  const future = routine({ id: "f", schedule: { type: "interval", every: 1, unit: "week", anchor: "2026-11-20" } });
  assert.deepEqual(missingOccurrences([future], [], "2026-11-10"), [{ routineId: "f", dueDate: "2026-11-20" }]);
  assert.deepEqual(missingOccurrences([bad], [occ({ routineId: "b", dueDate: "2026-11-17" })], "2026-11-10"), []);
});

// --- form model ---

test("form: a title is needed, nothing else gets in the way of a simple chore", () => {
  const f = emptyForm("2026-11-10");
  assert.equal(buildRoutine(f).ok, false);
  const r = buildRoutine({ ...f, title: "Bad putzen" });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.routine.mode, "after_done");
    assert.deepEqual(r.routine.schedule, { type: "interval", every: 1, unit: "week", anchor: "2026-11-10" });
  }
});

test("form: only intervals can be 'after done'", () => {
  const r = buildRoutine({ ...emptyForm("2026-11-10"), title: "x", repeat: "weekday", mode: "after_done", weekdays: [2] });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.routine.mode, "fixed");
});

test("form: date list reports unreadable dates and accepts Swiss format", () => {
  const base = { ...emptyForm("2026-11-10"), title: "Papier", repeat: "dates" as const };
  const bad = buildRoutine({ ...base, datesText: "12.11.2026\nmorgen" });
  assert.equal(bad.ok, false);
  const good = buildRoutine({ ...base, datesText: "12.11.2026\n10.12.2026" });
  assert.ok(good.ok);
  if (good.ok) assert.deepEqual(good.routine.schedule, { type: "dates", dates: ["2026-11-12", "2026-12-10"] });
});

test("form: every template builds a valid routine with upcoming dates (except the empty date list)", () => {
  for (const t of ROUTINE_TEMPLATES) {
    const form = formFromTemplate(t, "2026-11-10");
    if (t.key === "papier") {
      assert.equal(buildRoutine(form).ok, false); // needs the Gemeinde's dates first
      continue;
    }
    const built = buildRoutine(form);
    assert.ok(built.ok, t.key);
    if (built.ok) assert.ok(previewDates(built.routine, "2026-11-10").length > 0, t.key);
  }
});

test("form: Kehricht template anchors on the next Thursday so 'every 2nd week' starts there", () => {
  const t = ROUTINE_TEMPLATES.find((x) => x.key === "kehricht")!;
  const built = buildRoutine(formFromTemplate(t, "2026-11-10")); // a Tuesday
  assert.ok(built.ok);
  if (built.ok) assert.deepEqual(previewDates(built.routine, "2026-11-10", 2), ["2026-11-12", "2026-11-26"]);
});

test("describeRoutine reads like a person would say it", () => {
  assert.equal(describeRoutine(routine({})), "Jede Woche · ab dem Erledigen");
  assert.equal(
    describeRoutine(routine({ mode: "fixed", schedule: { type: "weekday", weekdays: [4], everyNWeeks: 2, anchor: "2026-11-05" } })),
    "Jede 2. Woche · Do"
  );
  assert.equal(
    describeRoutine(routine({ mode: "fixed", schedule: { type: "weekday", weekdays: [2] }, activeMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11] })),
    "Jeden Di · Mär–Nov"
  );
  assert.equal(describeRoutine(routine({ mode: "fixed", schedule: { type: "nth_weekday", nth: 1, weekday: 1 } })), "Erster Montag im Monat");
});
