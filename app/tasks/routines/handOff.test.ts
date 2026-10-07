import { test } from "node:test";
import assert from "node:assert/strict";
import { handOffFor } from "./handOff.ts";

const couple = ["me", "anna"];
const wg = ["me", "anna", "tom"];

test("hand off: with two people it is one tap to the other person", () => {
  assert.deepEqual(handOffFor("me", "me", couple), { kind: "direct", toId: "anna", takeOver: false });
  assert.deepEqual(handOffFor(null, "me", couple), { kind: "direct", toId: "anna", takeOver: false });
});

test("hand off: a task that sits with the other person can be taken over in one tap", () => {
  assert.deepEqual(handOffFor("anna", "me", couple), { kind: "direct", toId: "me", takeOver: true });
  assert.deepEqual(handOffFor("tom", "me", wg), { kind: "direct", toId: "me", takeOver: true });
});

test("hand off: with three or more people the person picks, without being offered themselves", () => {
  assert.deepEqual(handOffFor("me", "me", wg), { kind: "choose", optionIds: ["anna", "tom"] });
  assert.deepEqual(handOffFor(null, "anna", wg), { kind: "choose", optionIds: ["me", "tom"] });
});

test("hand off: alone, or when the person is not in the household, there is nobody to hand to", () => {
  assert.deepEqual(handOffFor(null, "me", ["me"]), { kind: "none" });
  assert.deepEqual(handOffFor(null, undefined, couple), { kind: "none" });
  assert.deepEqual(handOffFor(null, "stranger", couple), { kind: "none" });
});
