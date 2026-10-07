// Run with: node --test app/tasks/routines/team.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { planAssignments, reassignWaiting } from "./rotation.ts";
import { BALANCE_TOLERANCE, fairness, targetShares } from "./fairness.ts";
import { equalSplit, netBalances, splitShares, suggestTransfers } from "./settle.ts";
import type { Absence, Occurrence, Routine } from "./types.ts";

const A = "a";
const B = "b";
const C = "c";

function routine(p: Partial<Routine>): Routine {
  return {
    id: "r", householdId: "h", kind: "reminder", title: "Kehricht", icon: "🗑️",
    schedule: { type: "weekday", weekdays: [4] }, mode: "fixed", activeMonths: null, leadDays: 1,
    assigneeId: null, showInCalendar: true, amount: null, amountKind: null, payerId: null, expenseCategory: null,
    assignment: "rotation", rotation: [A, B, C], effort: 2, split: null, roomId: null, supplies: [],
    ...p,
  };
}
function occ(id: string, dueDate: string, p: Partial<Occurrence> = {}): Occurrence {
  return {
    id, routineId: "r", dueDate, status: "open", assignedTo: null, doneBy: null, doneAt: null,
    amount: null, expenseId: null, vtTxId: null, locked: false, split: null, ...p,
  };
}
function absence(userId: string, fromDate: string, toDate: string): Absence {
  return { id: `${userId}${fromDate}`, userId, fromDate, toDate };
}
const today = "2026-10-05";
const assigned = (changes: { occurrenceId: string; assignedTo: string | null }[]) =>
  Object.fromEntries(changes.map((c) => [c.occurrenceId, c.assignedTo]));

// --- rotation ---

test("rotation: goes round in order, starting with the first person", () => {
  const occs = [occ("1", "2026-10-08"), occ("2", "2026-10-15"), occ("3", "2026-10-22"), occ("4", "2026-10-29")];
  const got = assigned(planAssignments(routine({}), occs, [A, B, C], [], today, {}));
  assert.deepEqual(got, { "1": A, "2": B, "3": C, "4": A });
});

test("rotation: continues after whoever did the last one", () => {
  const occs = [
    occ("old", "2026-10-01", { status: "done", assignedTo: B, doneBy: B }),
    occ("1", "2026-10-08"),
    occ("2", "2026-10-15"),
  ];
  assert.deepEqual(assigned(planAssignments(routine({}), occs, [A, B, C], [], today, {})), { "1": C, "2": A });
});

test("rotation: running it again changes nothing", () => {
  const occs = [occ("1", "2026-10-08", { assignedTo: A }), occ("2", "2026-10-15", { assignedTo: B })];
  assert.deepEqual(planAssignments(routine({}), occs, [A, B, C], [], today, {}), []);
});

test("rotation: someone who is away is skipped, and the turn is not lost for the others", () => {
  const occs = [occ("1", "2026-10-08"), occ("2", "2026-10-15"), occ("3", "2026-10-22")];
  const got = assigned(planAssignments(routine({}), occs, [A, B, C], [absence(A, "2026-10-06", "2026-10-10")], today, {}));
  assert.deepEqual(got, { "1": B, "2": C, "3": A });
});

test("rotation: a swapped (locked) occurrence stays, and the rotation goes on from it", () => {
  const occs = [occ("1", "2026-10-08", { assignedTo: C, locked: true }), occ("2", "2026-10-15"), occ("3", "2026-10-22")];
  const got = assigned(planAssignments(routine({}), occs, [A, B, C], [], today, {}));
  assert.deepEqual(got, { "2": A, "3": B });
});

test("rotation: people who left the household are dropped; fewer than two means nothing to plan", () => {
  const occs = [occ("1", "2026-10-08"), occ("2", "2026-10-15")];
  assert.deepEqual(assigned(planAssignments(routine({}), occs, [A, B], [], today, {})), { "1": A, "2": B });
  assert.deepEqual(planAssignments(routine({}), occs, [A], [], today, {}), []);
});

test("rotation: if everyone is away, the occurrence still gets a person", () => {
  const away = [A, B, C].map((u) => absence(u, "2026-10-01", "2026-10-31"));
  const got = assigned(planAssignments(routine({}), [occ("1", "2026-10-08")], [A, B, C], away, today, {}));
  assert.equal(got["1"], A);
});

test("fixed and open: assigned to the person, or to nobody", () => {
  const occs = [occ("1", "2026-10-08", { assignedTo: B })];
  assert.deepEqual(assigned(planAssignments(routine({ assignment: "fixed", assigneeId: A }), occs, [A, B], [], today, {})), { "1": A });
  assert.deepEqual(assigned(planAssignments(routine({ assignment: "open" }), occs, [A, B], [], today, {})), { "1": null });
});

test("bills are never assigned", () => {
  assert.deepEqual(planAssignments(routine({ kind: "bill", assignment: "rotation" }), [occ("1", "2026-10-08")], [A, B], [], today, {}), []);
});

// --- fair share ---

test("fair share: the least loaded person gets it, and the load is counted", () => {
  const loads = { [A]: 6, [B]: 2, [C]: 4 };
  const occs = [occ("1", "2026-10-08"), occ("2", "2026-10-15"), occ("3", "2026-10-22")];
  const got = assigned(planAssignments(routine({ assignment: "fair_share", rotation: null, effort: 3 }), occs, [A, B, C], [], today, loads));
  // B 2 -> picks 1 (B=5); C 4 is lowest -> picks 2 (C=7); B 5 is lowest -> picks 3
  assert.deepEqual(got, { "1": B, "2": C, "3": B });
});

test("fair share: keeps an existing assignment unless that person is away", () => {
  const occs = [occ("1", "2026-10-08", { assignedTo: A }), occ("2", "2026-10-15", { assignedTo: A })];
  const away = [absence(A, "2026-10-14", "2026-10-16")];
  const got = assigned(planAssignments(routine({ assignment: "fair_share", rotation: null }), occs, [A, B], away, today, { [A]: 0, [B]: 0 }));
  assert.deepEqual(got, { "2": B });
});

// --- fairness ---

test("targetShares: equal by default, weights are normalised", () => {
  assert.deepEqual(targetShares([A, B], null), { a: 50, b: 50 });
  assert.deepEqual(targetShares([A, B], { a: 40, b: 60 }), { a: 40, b: 60 });
  assert.deepEqual(targetShares([A, B], { a: 2, b: 6 }), { a: 25, b: 75 });
  assert.deepEqual(targetShares([A, B], { a: 0, b: 0 }), { a: 50, b: 50 });
});

test("fairness: shares of effort next to the target; bills do not count", () => {
  const rs = [routine({ id: "bad", kind: "chore", effort: 3 }), routine({ id: "strom", kind: "bill", effort: 5 })];
  const done = [
    occ("1", "2026-10-01", { routineId: "bad", status: "done", doneBy: A }),
    occ("2", "2026-10-02", { routineId: "bad", status: "done", doneBy: A }),
    occ("3", "2026-10-03", { routineId: "bad", status: "done", doneBy: B }),
    occ("4", "2026-10-03", { routineId: "strom", status: "done", doneBy: B }),
  ];
  const f = fairness(done, rs, [A, B], null);
  assert.equal(f.total, 9);
  assert.deepEqual(f.rows.map((r) => Math.round(r.share)), [67, 33]);
  assert.equal(f.balanced, false);
  assert.equal(f.mostLoaded, A);
});

test("fairness: a 40/60 split counts 40/60 as balanced", () => {
  const rs = [routine({ id: "x", kind: "chore", effort: 1 })];
  const done = [
    ...[1, 2].map((i) => occ(`a${i}`, "2026-10-01", { routineId: "x", status: "done", doneBy: A })),
    ...[1, 2, 3].map((i) => occ(`b${i}`, "2026-10-01", { routineId: "x", status: "done", doneBy: B })),
  ];
  assert.equal(fairness(done, rs, [A, B], { a: 40, b: 60 }).balanced, true);
  assert.equal(fairness(done, rs, [A, B], null).balanced, true); // 40/60 is within the tolerance of 50/50
  const lopsided = [...done, ...[4, 5, 6, 7].map((i) => occ(`b${i}`, "2026-10-01", { routineId: "x", status: "done", doneBy: B }))];
  assert.equal(fairness(lopsided, rs, [A, B], null).balanced, false);
  assert.ok(BALANCE_TOLERANCE > 0);
});

test("fairness: no data yet is balanced and shows the targets", () => {
  const f = fairness([], [], [A, B], null);
  assert.equal(f.balanced, true);
  assert.deepEqual(f.rows.map((r) => r.share), [50, 50]);
});

// --- splits and settle-up ---

test("equalSplit adds up to 100 even for three", () => {
  const s = equalSplit([A, B, C]);
  assert.equal(Math.round((s[A] + s[B] + s[C]) * 100) / 100, 100);
  assert.deepEqual(equalSplit([A, B]), { a: 50, b: 50 });
});

test("splitShares always adds up to the amount", () => {
  const shares = splitShares(100, equalSplit([A, B, C]), B);
  assert.equal(Math.round(Object.values(shares).reduce((s, v) => s + v, 0) * 100) / 100, 100);
  const odd = splitShares(0.05, { a: 50, b: 50 }, A);
  assert.equal(Math.round((odd.a + odd.b) * 100) / 100, 0.05);
});

test("netBalances: the payer is owed everyone else's share", () => {
  const net = netBalances([{ paidBy: A, amount: 60, split: { a: 50, b: 50 } }], []);
  assert.deepEqual(net, { b: -30, a: 30 });
});

test("netBalances: bills without a split are ignored, paybacks reduce what is owed", () => {
  const net = netBalances(
    [
      { paidBy: A, amount: 60, split: { a: 50, b: 50 } },
      { paidBy: B, amount: 1850, split: null },
    ],
    [{ from: B, to: A, amount: 10 }]
  );
  assert.deepEqual(net, { b: -20, a: 20 });
});

test("netBalances: three flatmates, balances cancel out", () => {
  const net = netBalances(
    [
      { paidBy: A, amount: 90, split: equalSplit([A, B, C]) },
      { paidBy: B, amount: 30, split: equalSplit([A, B, C]) },
    ],
    []
  );
  assert.equal(Math.round(Object.values(net).reduce((s, v) => s + v, 0) * 100) / 100, 0);
  assert.equal(net[A], 50);
  assert.equal(net[C], -40);
});

test("suggestTransfers settles everything with as few payments as possible", () => {
  assert.deepEqual(suggestTransfers({ a: 50, b: -10, c: -40 }), [
    { from: C, to: A, amount: 40 },
    { from: B, to: A, amount: 10 },
  ]);
  assert.deepEqual(suggestTransfers({ a: 0, b: 0 }), []);
  // Following the suggestions leads to zero for everyone.
  const bills = [{ paidBy: A, amount: 100, split: { a: 50, b: 25, c: 25 } }];
  const settled = netBalances(bills, suggestTransfers(netBalances(bills, [])));
  for (const id of [A, B, C]) assert.equal(Math.abs(settled[id] ?? 0), 0, id);
});

// --- a waiting date follows a change of who does it

test("reassignWaiting: an overdue date follows the new setting", () => {
  const day = "2026-11-10";
  const waiting = occ("w", "2026-11-07");
  assert.deepEqual(reassignWaiting(routine({ assignment: "fixed", assigneeId: B }), waiting, day), { assignedTo: B });
  assert.deepEqual(reassignWaiting(routine({ assignment: "rotation", rotation: [A, B] }), waiting, day), { assignedTo: A });
  assert.deepEqual(reassignWaiting(routine({ assignment: "open" }), occ("w", "2026-11-07", { assignedTo: B }), day), { assignedTo: null });
});

test("reassignWaiting: nothing to do when it already fits, is handed over by hand, is not overdue or is over", () => {
  const day = "2026-11-10";
  const fixed = routine({ assignment: "fixed", assigneeId: B });
  assert.equal(reassignWaiting(fixed, occ("w", "2026-11-07", { assignedTo: B }), day), null);
  assert.equal(reassignWaiting(fixed, occ("w", "2026-11-07", { assignedTo: A, locked: true }), day), null);
  assert.equal(reassignWaiting(fixed, occ("w", "2026-11-10"), day), null); // today is the plan's job
  assert.equal(reassignWaiting(fixed, occ("w", "2026-11-07", { status: "done" }), day), null);
  assert.equal(reassignWaiting(routine({ assignment: "fair_share" }), occ("w", "2026-11-07"), day), null);
});
