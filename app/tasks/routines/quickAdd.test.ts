import { test } from "node:test";
import assert from "node:assert/strict";
import { buildQuickRoutine, buildSuggestedRoutine, turnOrder, whenToSchedule, type QuickAddInput } from "./quickAdd.ts";
import { missingOccurrences } from "./ensure.ts";
import { ROOM_SUGGESTIONS } from "./rooms.ts";
import { occurrencesBetween } from "./schedule.ts";

const TODAY = "2026-11-10"; // a Tuesday

function input(p: Partial<QuickAddInput> = {}): QuickAddInput {
  return {
    title: "Bad putzen",
    when: "weekly",
    who: { type: "open" },
    roomId: null,
    today: TODAY,
    userId: "me",
    memberIds: ["anna", "me"],
    ...p,
  };
}

test("quick add: today and tomorrow are single fixed dates", () => {
  assert.deepEqual(whenToSchedule("today", TODAY), { schedule: { type: "dates", dates: [TODAY] }, mode: "fixed" });
  assert.deepEqual(whenToSchedule("tomorrow", TODAY), { schedule: { type: "dates", dates: ["2026-11-11"] }, mode: "fixed" });
});

test("quick add: recurring tasks count from when they were done, starting today", () => {
  const cases: [Parameters<typeof whenToSchedule>[0], number, string][] = [
    ["daily", 1, "day"], ["weekly", 1, "week"], ["biweekly", 2, "week"], ["monthly", 1, "month"],
  ];
  for (const [when, every, unit] of cases) {
    const { schedule, mode } = whenToSchedule(when, TODAY);
    assert.deepEqual(schedule, { type: "interval", every, unit, anchor: TODAY }, when);
    assert.equal(mode, "after_done", when);
  }
});

test("quick add: the first date of a new task is today, so it shows up right away", () => {
  const built = buildQuickRoutine(input({ when: "weekly" }));
  assert.ok(built);
  const routine = { ...built, id: "r", householdId: "h" };
  assert.deepEqual(missingOccurrences([routine], [], TODAY), [{ routineId: "r", dueDate: TODAY }]);
});

test("quick add: a task for tomorrow produces exactly one date", () => {
  const built = buildQuickRoutine(input({ when: "tomorrow" }));
  assert.ok(built);
  assert.deepEqual(occurrencesBetween(built.schedule, TODAY, "2027-12-31"), ["2026-11-11"]);
});

test("quick add: an empty title builds nothing", () => {
  assert.equal(buildQuickRoutine(input({ title: "   " })), null);
});

test("quick add: who does it", () => {
  const open = buildQuickRoutine(input());
  assert.ok(open);
  assert.deepEqual([open.assignment, open.assigneeId, open.rotation], ["open", null, null]);

  const anna = buildQuickRoutine(input({ who: { type: "member", id: "anna" } }));
  assert.ok(anna);
  assert.deepEqual([anna.assignment, anna.assigneeId, anna.rotation], ["fixed", "anna", null]);

  const turns = buildQuickRoutine(input({ who: { type: "turns" } }));
  assert.ok(turns);
  assert.deepEqual([turns.assignment, turns.assigneeId, turns.rotation], ["rotation", null, ["me", "anna"]]);
});

test("quick add: taking turns needs two people, alone it stays open", () => {
  const alone = buildQuickRoutine(input({ who: { type: "turns" }, memberIds: ["me"] }));
  assert.ok(alone);
  assert.deepEqual([alone.assignment, alone.rotation], ["open", null]);
});

test("quick add: turns start with the person who adds the task", () => {
  assert.deepEqual(turnOrder(["anna", "me", "tom"], "me"), ["me", "anna", "tom"]);
  assert.deepEqual(turnOrder(["anna", "me"], undefined), ["anna", "me"]);
  assert.deepEqual(turnOrder(["anna", "me"], "stranger"), ["anna", "me"]);
});

test("quick add: room, supplies and effort carry over, bills and splits stay out", () => {
  const built = buildQuickRoutine(input({ roomId: "bath", supplies: ["Sponge"], effort: 3, icon: "🛁" }));
  assert.ok(built);
  assert.equal(built.roomId, "bath");
  assert.deepEqual(built.supplies, ["Sponge"]);
  assert.equal(built.effort, 3);
  assert.equal(built.icon, "🛁");
  assert.equal(built.kind, "chore");
  assert.equal(built.amount, null);
  assert.equal(built.split, null);
});

test("quick add: default icons tell a one-off from something that comes back", () => {
  assert.equal(buildQuickRoutine(input({ when: "today" }))?.icon, "📌");
  assert.equal(buildQuickRoutine(input({ when: "weekly" }))?.icon, "🔁");
});

test("suggestion: one tap makes an open chore in that room, in the language that is read", () => {
  const shower = ROOM_SUGGESTIONS.bath.find((x) => x.key === "shower")!;
  const de = buildSuggestedRoutine(shower, { roomId: "bath", lang: "de", today: TODAY });
  assert.equal(de.title, "Dusche und Badewanne putzen");
  assert.equal(buildSuggestedRoutine(shower, { roomId: "bath", lang: "en", today: TODAY }).title, "Clean shower and tub");
  assert.deepEqual(de.schedule, { type: "interval", every: 1, unit: "week", anchor: TODAY });
  assert.deepEqual([de.mode, de.assignment, de.roomId, de.kind], ["after_done", "open", "bath", "chore"]);
  assert.deepEqual(de.supplies, ["All-purpose cleaner", "Sponge"]);
});

test("suggestion: every suggestion builds a task that is due today and keeps coming back", () => {
  for (const [kind, list] of Object.entries(ROOM_SUGGESTIONS)) {
    for (const sug of list) {
      const built = buildSuggestedRoutine(sug, { roomId: "r", lang: "en", today: TODAY });
      const routine = { ...built, id: "x", householdId: "h" };
      assert.deepEqual(missingOccurrences([routine], [], TODAY), [{ routineId: "x", dueDate: TODAY }], `${kind}/${sug.key}`);
    }
  }
});
