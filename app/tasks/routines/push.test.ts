// Run with: node --test app/tasks/routines/push.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { planPushMessages, shouldNotify, todayIn, type PushOccurrence } from "./pushPlan.ts";
import { runPush, type PushDeps, type PushSubscriptionRow } from "./pushRun.ts";
import type { Routine } from "./types.ts";

function routine(p: Partial<Routine>): Routine {
  return {
    id: "r", householdId: "h", kind: "reminder", title: "Kehricht rausstellen", icon: "🗑️", schedule: { type: "weekday", weekdays: [4] },
    mode: "fixed", activeMonths: null, leadDays: 1, assigneeId: null, showInCalendar: true, amount: null, amountKind: null, payerId: null,
    expenseCategory: null, assignment: "open", rotation: null, effort: 2, split: null, roomId: null, supplies: [], ...p,
  };
}
function occ(id: string, dueDate: string, p: Partial<PushOccurrence> = {}): PushOccurrence {
  return { id, routineId: "r", dueDate, assignedTo: null, amount: null, status: "open", notifiedAt: null, ...p };
}
const members = new Map([["h", ["a", "b"]]]);
const today = "2026-11-11";

test("todayIn uses the time zone, not UTC", () => {
  const lateEvening = new Date("2026-11-11T23:30:00Z"); // already the 12th in Zurich
  assert.equal(todayIn("Europe/Zurich", lateEvening), "2026-11-12");
  assert.equal(todayIn("UTC", lateEvening), "2026-11-11");
});

test("shouldNotify: on the heads-up day, not before, not after the due date, once", () => {
  const r = routine({ leadDays: 1 });
  assert.equal(shouldNotify(r, occ("1", "2026-11-12"), today), true); // tomorrow
  assert.equal(shouldNotify(r, occ("2", "2026-11-13"), today), false); // not yet
  assert.equal(shouldNotify(r, occ("3", "2026-11-10"), today), false); // past
  assert.equal(shouldNotify(r, occ("4", "2026-11-12", { notifiedAt: "2026-11-11T16:00:00Z" }), today), false); // already sent
  assert.equal(shouldNotify(r, occ("5", "2026-11-12", { status: "done" }), today), false);
  assert.equal(shouldNotify(routine({ leadDays: 0 }), occ("6", "2026-11-11"), today), true); // on the day
  assert.equal(shouldNotify(routine({ leadDays: 0 }), occ("7", "2026-11-12"), today), false);
});

test("shouldNotify: a missed run still announces it later, as long as it is not past", () => {
  assert.equal(shouldNotify(routine({ leadDays: 3 }), occ("1", "2026-11-12"), today), true);
});

test("plan: an unassigned reminder goes to everyone, an assigned one to that person", () => {
  const all = planPushMessages([routine({})], [occ("1", "2026-11-12")], members, [], today);
  assert.deepEqual(all.map((m) => m.userId), ["a", "b"]);
  assert.equal(all[0].title, "Morgen · Kehricht rausstellen");
  const one = planPushMessages([routine({})], [occ("1", "2026-11-12", { assignedTo: "b" })], members, [], today);
  assert.deepEqual(one.map((m) => m.userId), ["b"]);
});

test("plan: one message per person with everything that applies, long lists are cut", () => {
  const rs = [routine({}), routine({ id: "r2", title: "Papier" })];
  const os = [occ("1", "2026-11-12", { assignedTo: "a" }), { ...occ("2", "2026-11-12", { assignedTo: "a" }), routineId: "r2" }];
  const [msg] = planPushMessages(rs, os, members, [], today);
  assert.equal(msg.title, "2 Dinge stehen an");
  assert.deepEqual(msg.occurrenceIds, ["1", "2"]);
  assert.match(msg.body, /Kehricht rausstellen/);
  const many = Array.from({ length: 6 }, (_, i) => occ(`m${i}`, "2026-11-12", { assignedTo: "a" }));
  assert.match(planPushMessages([routine({})], many, members, [], today)[0].body, /… und 2 weitere/);
});

test("plan: bills go to the payer with the amount; absent people are skipped", () => {
  const bill = routine({ kind: "bill", title: "Strom-Abschlag", leadDays: 7, amount: 95, amountKind: "estimate", payerId: "a" });
  const [msg] = planPushMessages([bill], [occ("1", "2026-11-17")], members, [], today);
  assert.equal(msg.userId, "a");
  assert.equal(msg.title, "Di., 17.11. · Strom-Abschlag · ca. 95.00 CHF");
  const away = [{ id: "x", userId: "b", fromDate: "2026-11-10", toDate: "2026-11-20" }];
  assert.deepEqual(planPushMessages([routine({})], [occ("1", "2026-11-12")], members, away, today).map((m) => m.userId), ["a"]);
});

// --- run ---

function deps(over: Partial<PushDeps> & { subs: PushSubscriptionRow[]; results?: Record<string, "ok" | "gone" | "error"> }) {
  const sent: string[] = [];
  const removed: string[] = [];
  const marked: string[][] = [];
  const d: PushDeps = {
    subscriptions: async () => over.subs,
    loadData: async () => ({ routines: [routine({})], occurrences: [occ("1", "2026-11-12", { assignedTo: "a" })], membersByHousehold: members, absences: [] }),
    send: async (sub) => {
      sent.push(sub.endpoint);
      return over.results?.[sub.endpoint] ?? "ok";
    },
    removeSubscription: async (e) => void removed.push(e),
    markNotified: async (ids) => void marked.push(ids),
    ...over,
  };
  return { d, sent, removed, marked };
}
const sub = (userId: string, endpoint: string): PushSubscriptionRow => ({ userId, endpoint, p256dh: "k", auth: "a" });
const now = new Date("2026-11-11T16:00:00Z");

test("run: sends to the person's devices and marks the occurrences announced", async () => {
  const { d, sent, marked } = deps({ subs: [sub("a", "e1"), sub("a", "e2"), sub("b", "e3")] });
  const summary = await runPush(d, now);
  assert.deepEqual(sent, ["e1", "e2"]); // b has nothing assigned
  assert.deepEqual(marked, [["1"]]);
  assert.deepEqual([summary.messages, summary.delivered, summary.removed, summary.failed], [1, 2, 0, 0]);
});

test("run: devices that are gone are removed; if nothing was delivered it is tried again next time", async () => {
  const { d, removed, marked } = deps({ subs: [sub("a", "e1")], results: { e1: "gone" } });
  const summary = await runPush(d, now);
  assert.deepEqual(removed, ["e1"]);
  assert.deepEqual(marked, []);
  assert.equal(summary.removed, 1);
});

test("run: a failing device does not block the others, and without subscriptions nothing is loaded", async () => {
  const mixed = deps({ subs: [sub("a", "e1"), sub("a", "e2")], results: { e1: "error" } });
  const s = await runPush(mixed.d, now);
  assert.deepEqual([s.delivered, s.failed], [1, 1]);
  assert.deepEqual(mixed.marked, [["1"]]);
  let loaded = false;
  const none = deps({ subs: [], loadData: async () => { loaded = true; throw new Error("not expected"); } });
  assert.equal((await runPush(none.d, now)).messages, 0);
  assert.equal(loaded, false);
});
