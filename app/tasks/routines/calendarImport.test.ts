// Run with: node --test app/tasks/routines/calendarImport.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { groupEvents, guessIcon, mergedDates, parseCalendarFile, parseCsvCalendar, parseIcs, planCalendarImport } from "./calendarImport.ts";
import type { Routine } from "./types.ts";

const ics = (...events: string[]) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events.join("\r\n")}\r\nEND:VCALENDAR\r\n`;
const vevent = (...lines: string[]) => `BEGIN:VEVENT\r\n${lines.join("\r\n")}\r\nEND:VEVENT`;

test("ics: single all-day events with title", () => {
  const got = parseIcs(ics(
    vevent("DTSTART;VALUE=DATE:20261112", "SUMMARY:Kehricht"),
    vevent("DTSTART;VALUE=DATE:20261126", "SUMMARY:Kehricht"),
    vevent("DTSTART;VALUE=DATE:20261203", "SUMMARY:Papiersammlung")
  ));
  assert.deepEqual(got.events, [
    { title: "Kehricht", date: "2026-11-12" },
    { title: "Kehricht", date: "2026-11-26" },
    { title: "Papiersammlung", date: "2026-12-03" },
  ]);
  assert.deepEqual(got.unsupported, []);
});

test("ics: folded lines, escapes and date-times are read", () => {
  const got = parseIcs(ics(vevent("DTSTART:20261112T060000Z", "SUMMARY:Grün\\, Garten\;", " abfall")));
  assert.deepEqual(got.events, [{ title: "Grün, Garten;abfall", date: "2026-11-12" }]);
});

test("ics: weekly rule every 2 weeks with COUNT", () => {
  const got = parseIcs(ics(vevent("DTSTART;VALUE=DATE:20261105", "SUMMARY:Kehricht", "RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=4")));
  assert.deepEqual(got.events.map((e) => e.date), ["2026-11-05", "2026-11-19", "2026-12-03", "2026-12-17"]);
});

test("ics: weekly rule with BYDAY and UNTIL", () => {
  const got = parseIcs(ics(vevent("DTSTART;VALUE=DATE:20261102", "SUMMARY:Bio", "RRULE:FREQ=WEEKLY;BYDAY=MO,TH;UNTIL=20261109")));
  assert.deepEqual(got.events.map((e) => e.date), ["2026-11-02", "2026-11-05", "2026-11-09"]);
});

test("ics: monthly rules (day of month, n-th weekday) and EXDATE", () => {
  const monthday = parseIcs(ics(vevent("DTSTART;VALUE=DATE:20261101", "SUMMARY:A", "RRULE:FREQ=MONTHLY;BYMONTHDAY=1;COUNT=3")));
  assert.deepEqual(monthday.events.map((e) => e.date), ["2026-11-01", "2026-12-01", "2027-01-01"]);
  const nth = parseIcs(ics(vevent("DTSTART;VALUE=DATE:20261102", "SUMMARY:Karton", "RRULE:FREQ=MONTHLY;BYDAY=1MO;COUNT=3", "EXDATE;VALUE=DATE:20261207")));
  assert.deepEqual(nth.events.map((e) => e.date), ["2026-11-02", "2027-01-04"]);
});

test("ics: rules it cannot express are reported, not guessed", () => {
  const got = parseIcs(ics(
    vevent("DTSTART;VALUE=DATE:20261102", "SUMMARY:Seltsam", "RRULE:FREQ=MONTHLY;INTERVAL=2;BYDAY=-1FR"),
    vevent("DTSTART;VALUE=DATE:20261105", "SUMMARY:Gut")
  ));
  assert.deepEqual(got.unsupported, ["Seltsam"]);
  assert.deepEqual(got.events, [{ title: "Gut", date: "2026-11-05" }]);
});

test("ics: events without a readable date are skipped", () => {
  assert.deepEqual(parseIcs(ics(vevent("SUMMARY:Ohne Datum"), vevent("DTSTART;VALUE=DATE:20261399", "SUMMARY:Kaputt"))).events, []);
});

test("csv: title and date in either order, headers and noise ignored", () => {
  const got = parseCsvCalendar('Datum;Art\n12.11.2026;Kehricht\n"Papier", 2026-12-10\nkein Eintrag\n');
  assert.deepEqual(got.events, [
    { title: "Kehricht", date: "2026-11-12" },
    { title: "Papier", date: "2026-12-10" },
  ]);
});

test("csv: a plain list of dates uses the default title", () => {
  assert.deepEqual(parseCsvCalendar("12.11.2026\n26.11.2026", "Kehricht").events.map((e) => e.title), ["Kehricht", "Kehricht"]);
});

test("parseCalendarFile picks the format", () => {
  assert.equal(parseCalendarFile(ics(vevent("DTSTART;VALUE=DATE:20261112", "SUMMARY:A"))).events.length, 1);
  assert.equal(parseCalendarFile("12.11.2026;A").events.length, 1);
});

test("groupEvents merges the same waste type regardless of spelling", () => {
  const g = groupEvents([
    { title: "Kehricht", date: "2026-11-26" },
    { title: "kehricht ", date: "2026-11-12" },
    { title: "Kehricht", date: "2026-11-12" },
    { title: "Papier", date: "2026-12-10" },
  ]);
  assert.deepEqual(g, [
    { title: "Kehricht", dates: ["2026-11-12", "2026-11-26"] },
    { title: "Papier", dates: ["2026-12-10"] },
  ]);
});

test("guessIcon recognises the common waste types", () => {
  assert.deepEqual(["Hauskehricht", "Altpapier", "Kartonsammlung", "Grünabfuhr", "Sperrgut", "Glas", "Etwas anderes"].map(guessIcon), ["🗑️", "♻️", "📦", "🌿", "🛋️", "🍾", "♻️"]);
});

// --- planning ---

const today = "2026-11-10";
function reminder(p: Partial<Routine>): Routine {
  return {
    id: "r1", householdId: "h", kind: "reminder", title: "Kehricht", icon: "🗑️", schedule: { type: "dates", dates: ["2026-11-12", "2026-11-26"] },
    mode: "fixed", activeMonths: null, leadDays: 1, assigneeId: null, showInCalendar: true, amount: null, amountKind: null, payerId: null,
    expenseCategory: null, assignment: "open", rotation: null, effort: 2, split: null, roomId: null, supplies: [], ...p,
  };
}

test("plan: new types are created, past dates dropped", () => {
  const plan = planCalendarImport([{ title: "Papier", dates: ["2026-10-01", "2026-12-10"] }], [], today);
  assert.deepEqual(plan.map((p) => [p.action, p.dates, p.added]), [["create", ["2026-12-10"], 1]]);
});

test("plan: the yearly re-import adds new dates to the reminder that exists", () => {
  const plan = planCalendarImport([{ title: "kehricht", dates: ["2026-11-26", "2026-12-10", "2026-12-24"] }], [reminder({})], today);
  assert.equal(plan[0].action, "update");
  assert.equal(plan[0].routineId, "r1");
  assert.equal(plan[0].added, 2);
  assert.deepEqual(mergedDates(plan[0]), ["2026-11-12", "2026-11-26", "2026-12-10", "2026-12-24"]);
});

test("plan: nothing new, or nothing in the future, does nothing", () => {
  assert.equal(planCalendarImport([{ title: "Kehricht", dates: ["2026-11-12"] }], [reminder({})], today)[0].action, "nothing");
  assert.equal(planCalendarImport([{ title: "Alt", dates: ["2025-01-01"] }], [], today)[0].action, "nothing");
});

test("plan: a chore or a weekly routine with the same name is not overwritten", () => {
  const chore = reminder({ kind: "chore" });
  const weekly = reminder({ id: "r2", schedule: { type: "weekday", weekdays: [4] } });
  assert.equal(planCalendarImport([{ title: "Kehricht", dates: ["2026-12-10"] }], [chore, weekly], today)[0].action, "create");
});
