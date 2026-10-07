import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOM_SUGGESTIONS, remainingSuggestions, roomKind, suggestionsFor, summarizeRoom } from "./rooms.ts";
import { buildAgenda, dueLabel, nextOccurrence, waitingLabel } from "./agenda.ts";
import type { Occurrence, Routine } from "./types.ts";

function routine(p: Partial<Routine>): Routine {
  return {
    id: "r1", householdId: "h", kind: "chore", title: "Bad putzen", icon: "🛁",
    schedule: { type: "interval", every: 1, unit: "week", anchor: "2026-11-01" },
    mode: "after_done", activeMonths: null, leadDays: 0, assigneeId: null, showInCalendar: true,
    amount: null, amountKind: null, payerId: null, expenseCategory: null,
    assignment: "open", rotation: null, effort: 2, split: null, roomId: "bath", supplies: [],
    ...p,
  };
}
function occ(p: Partial<Occurrence>): Occurrence {
  return { id: "o", routineId: "r1", dueDate: "2026-11-10", status: "open", assignedTo: null, doneBy: null, doneAt: null, amount: null, expenseId: null, vtTxId: null, locked: false, split: null, ...p };
}

const TODAY = "2026-11-10";

// --- room state ---

test("room: nothing planned means empty, and bills never count", () => {
  assert.equal(summarizeRoom("bath", [], [], TODAY).status, "empty");
  const bill = routine({ id: "b", kind: "bill" });
  assert.equal(summarizeRoom("bath", [bill], [occ({ routineId: "b", dueDate: "2026-11-01" })], TODAY).status, "empty");
});

test("room: far away means ok, a couple of days means soon, today and past follow", () => {
  const r = [routine({})];
  assert.equal(summarizeRoom("bath", r, [occ({ dueDate: "2026-11-20" })], TODAY).status, "ok");
  assert.equal(summarizeRoom("bath", r, [occ({ dueDate: "2026-11-12" })], TODAY).status, "soon");
  assert.equal(summarizeRoom("bath", r, [occ({ dueDate: "2026-11-13" })], TODAY).status, "ok");
  assert.equal(summarizeRoom("bath", r, [occ({ dueDate: "2026-11-10" })], TODAY).status, "today");
  assert.equal(summarizeRoom("bath", r, [occ({ dueDate: "2026-11-08" })], TODAY).status, "overdue");
});

test("room: the worst task decides, and a task waiting for days counts once", () => {
  const routines = [routine({ id: "a" }), routine({ id: "b" })];
  const summary = summarizeRoom("bath", routines, [
    occ({ id: "1", routineId: "a", dueDate: "2026-11-03" }),
    occ({ id: "2", routineId: "a", dueDate: "2026-11-07" }),
    occ({ id: "3", routineId: "b", dueDate: "2026-11-10" }),
  ], TODAY);
  assert.equal(summary.status, "overdue");
  assert.equal(summary.dueCount, 2); // a (once) and b
  assert.equal(summary.nextDue, "2026-11-03");
  assert.equal(summary.routineCount, 2);
});

test("room: done tasks and other rooms are left out, a past reminder has just gone by", () => {
  const chore = routine({ id: "a" });
  const other = routine({ id: "x", roomId: "kitchen" });
  const reminder = routine({ id: "k", kind: "reminder", mode: "fixed" });
  const summary = summarizeRoom("bath", [chore, other, reminder], [
    occ({ id: "1", routineId: "a", dueDate: "2026-11-05", status: "done" }),
    occ({ id: "2", routineId: "a", dueDate: "2026-11-24" }),
    occ({ id: "3", routineId: "x", dueDate: "2026-11-01" }),
    occ({ id: "4", routineId: "k", dueDate: "2026-11-04" }),
  ], TODAY);
  assert.equal(summary.status, "ok");
  assert.equal(summary.nextDue, "2026-11-24");
});

test("room: 'no room' is the chores that never got one, and it has a state like any room", () => {
  const stray = routine({ id: "s", roomId: null });
  const reminder = routine({ id: "k", kind: "reminder", mode: "fixed", roomId: null });
  const placed = routine({ id: "p", roomId: "bath" });
  const occs = [
    occ({ id: "1", routineId: "s", dueDate: "2026-11-08" }),
    occ({ id: "2", routineId: "k", dueDate: "2026-11-10" }),
    occ({ id: "3", routineId: "p", dueDate: "2026-11-10" }),
  ];
  const summary = summarizeRoom(null, [stray, reminder, placed], occs, TODAY);
  assert.equal(summary.routineCount, 1); // only the chore without a room
  assert.equal(summary.status, "overdue");
  assert.equal(summaryOf(null, [placed], [occ({ routineId: "p" })]), "empty");
});

function summaryOf(roomId: string | null, routines: Routine[], occurrences: Occurrence[]) {
  return summarizeRoom(roomId, routines, occurrences, TODAY).status;
}

// --- suggestions ---

test("rooms: the icon decides what kind of room it is, with or without a variation selector", () => {
  assert.equal(roomKind("🍳"), "kitchen");
  assert.equal(roomKind("🛋️"), "living");
  assert.equal(roomKind("🛋"), "living");
  assert.equal(roomKind("🛏️"), "bedroom");
  assert.equal(roomKind("🐈"), "other");
});

test("rooms: every kind of room has suggestions with sane rhythms and both languages", () => {
  for (const [kind, list] of Object.entries(ROOM_SUGGESTIONS)) {
    assert.ok(list.length > 0, kind);
    const keys = new Set<string>();
    for (const sug of list) {
      assert.ok(sug.title.en && sug.title.de, `${kind}/${sug.key}`);
      assert.ok(sug.every >= 1, `${kind}/${sug.key}`);
      assert.ok(!keys.has(sug.key), `${kind}/${sug.key} is listed twice`);
      keys.add(sug.key);
    }
  }
  assert.ok(suggestionsFor("🛁").some((x) => x.title.de === "WC putzen"));
});

test("rooms: suggestions that are already planned are not offered again, in either language", () => {
  const all = suggestionsFor("🛁").length;
  assert.equal(remainingSuggestions("🛁", []).length, all);
  assert.equal(remainingSuggestions("🛁", ["WC putzen"]).length, all - 1);
  assert.equal(remainingSuggestions("🛁", ["clean the toilet"]).length, all - 1);
  assert.equal(remainingSuggestions("🛁", ["Something of my own"]).length, all);
});

// --- which occurrence to tick off ---

test("nextOccurrence: a missed chore shows its latest missed date, otherwise the next one", () => {
  const r = routine({});
  assert.equal(nextOccurrence(r, [occ({ id: "a", dueDate: "2026-11-02" }), occ({ id: "b", dueDate: "2026-11-08" }), occ({ id: "c", dueDate: "2026-11-17" })], TODAY)?.id, "b");
  assert.equal(nextOccurrence(r, [occ({ id: "c", dueDate: "2026-11-17" }), occ({ id: "d", dueDate: "2026-11-24" })], TODAY)?.id, "c");
  assert.equal(nextOccurrence(r, [occ({ id: "x", status: "done" })], TODAY), null);
});

test("nextOccurrence: a past reminder is gone, a bill keeps its oldest unpaid date", () => {
  const reminder = routine({ id: "k", kind: "reminder", mode: "fixed" });
  const past = occ({ id: "p", routineId: "k", dueDate: "2026-11-02" });
  const next = occ({ id: "n", routineId: "k", dueDate: "2026-11-12" });
  assert.equal(nextOccurrence(reminder, [past, next], TODAY)?.id, "n");
  assert.equal(nextOccurrence(reminder, [past], TODAY), null);

  const bill = routine({ id: "b", kind: "bill" });
  assert.equal(
    nextOccurrence(bill, [occ({ id: "new", routineId: "b", dueDate: "2026-11-01" }), occ({ id: "old", routineId: "b", dueDate: "2026-10-01" })], TODAY)?.id,
    "old"
  );
});

test("the agenda and nextOccurrence agree on what a chore is waiting for", () => {
  const r = routine({});
  const occs = [occ({ id: "a", dueDate: "2026-11-02" }), occ({ id: "b", dueDate: "2026-11-08" })];
  assert.equal(buildAgenda([r], occs, TODAY)[0].occurrence.id, nextOccurrence(r, occs, TODAY)?.id);
});

// --- labels ---

test("dueLabel: today, tomorrow, then the weekday and date, in both languages", () => {
  assert.equal(dueLabel(0, "2026-11-10", "de"), "Heute");
  assert.equal(dueLabel(0, "2026-11-10", "en"), "Today");
  assert.equal(dueLabel(1, "2026-11-11", "de"), "Morgen");
  assert.equal(dueLabel(1, "2026-11-11", "en"), "Tomorrow");
  assert.match(dueLabel(3, "2026-11-13", "en"), /Fri/);
  assert.match(dueLabel(3, "2026-11-13", "de"), /Fr/);
});

test("waitingLabel: calm wording that gets more exact the longer it waits", () => {
  assert.equal(waitingLabel(-1, "2026-11-09", "de"), "Seit gestern");
  assert.equal(waitingLabel(-1, "2026-11-09", "en"), "Since yesterday");
  assert.match(waitingLabel(-3, "2026-11-07", "de"), /^Seit Sa/);
  assert.match(waitingLabel(-3, "2026-11-07", "en"), /^Since Sat/);
  assert.match(waitingLabel(-20, "2026-10-21", "de"), /^Seit 21\.10/);
});
