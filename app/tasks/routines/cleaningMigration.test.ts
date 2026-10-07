// Run with: node --test app/tasks/routines/cleaningMigration.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { planCleaningMigration, type CleaningTaskRow } from "./cleaningMigration.ts";


const task = (p: Partial<CleaningTaskRow>): CleaningTaskRow => ({
  id: "t1", roomId: "room1", title: "Bad putzen", supplies: ["Sponge"], recurrence: "weekly", assignee: null, nextDue: "2026-11-12", ...p,
});
const bathroom = { name: "Bathroom", icon: "🛁" };
const members = [{ id: "a", name: "Mia" }, { id: "b", name: "Jonas" }];

test("cleaning: recurrences become after-done intervals, monthly is a calendar month", () => {
  const sched = (r: CleaningTaskRow["recurrence"]) => planCleaningMigration(task({ recurrence: r }), bathroom, members).schedule;
  assert.deepEqual(sched("daily"), { type: "interval", every: 1, unit: "day", anchor: "2026-11-12" });
  assert.deepEqual(sched("weekly"), { type: "interval", every: 1, unit: "week", anchor: "2026-11-12" });
  assert.deepEqual(sched("biweekly"), { type: "interval", every: 2, unit: "week", anchor: "2026-11-12" });
  assert.deepEqual(sched("monthly"), { type: "interval", every: 1, unit: "month", anchor: "2026-11-12" });
  assert.equal(planCleaningMigration(task({}), bathroom, members).mode, "after_done");
});

test("cleaning: a one-time task becomes a single fixed date", () => {
  const plan = planCleaningMigration(task({ recurrence: "once" }), bathroom, members);
  assert.deepEqual(plan.schedule, { type: "dates", dates: ["2026-11-12"] });
  assert.equal(plan.mode, "fixed");
});

test("cleaning: the title stays as written, the room becomes a link, supplies and due date are kept", () => {
  const plan = planCleaningMigration(task({ nextDue: "2026-10-01" }), bathroom, members);
  assert.deepEqual([plan.title, plan.icon, plan.roomId, plan.supplies, plan.firstDue], ["Bad putzen", "🛁", "room1", ["Sponge"], "2026-10-01"]);
  const noRoom = planCleaningMigration(task({}), undefined, members);
  assert.deepEqual([noRoom.title, noRoom.icon], ["Bad putzen", "🧹"]);
});

test("cleaning: a free-text assignee only carries over when it names a member", () => {
  assert.deepEqual(
    (({ assignment, assigneeId }) => [assignment, assigneeId])(planCleaningMigration(task({ assignee: " jonas " }), bathroom, members)),
    ["fixed", "b"]
  );
  assert.deepEqual(
    (({ assignment, assigneeId }) => [assignment, assigneeId])(planCleaningMigration(task({ assignee: "Wer Zeit hat" }), bathroom, members)),
    ["open", null]
  );
});
