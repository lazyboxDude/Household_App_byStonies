// Run with: node --test app/shopping/priceHistory.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, itemKey, summarize, usualPrice, type PriceLogEntry } from "./priceHistory.ts";

let n = 0;
const log = (name: string, price: number, day: number, store: string | null = "Migros"): PriceLogEntry => ({
  id: String(++n),
  item_key: itemKey(name),
  item_name: name,
  store,
  price,
  bought_at: `2026-09-${String(day).padStart(2, "0")}T10:00:00Z`,
});

test("itemKey ignores case, padding and inner spacing", () => {
  assert.equal(itemKey("  Pasta  Penne "), itemKey("pasta penne"));
});

test("usualPrice is the median of the last purchases", () => {
  const entries = [log("Pasta", 1.2, 1), log("Pasta", 1.2, 8), log("Pasta", 1.4, 15)];
  assert.equal(usualPrice(entries, "pasta"), 1.2);
});

test("usualPrice prefers the same store and falls back to all stores", () => {
  const entries = [log("Pasta", 0.9, 1, "Aldi"), log("Pasta", 1.3, 8, "Migros")];
  assert.equal(usualPrice(entries, "pasta", "Aldi"), 0.9);
  assert.equal(usualPrice(entries, "pasta", "Coop"), 1.1);
  assert.equal(usualPrice(entries, "milch"), null);
});

test("usualPrice only looks at the last five purchases", () => {
  const old = [1, 2, 3, 4, 5].map((d) => log("Butter", 2, d));
  const recent = [10, 11, 12, 13, 14].map((d) => log("Butter", 3, d));
  assert.equal(usualPrice([...old, ...recent], "butter"), 3);
});

test("classify treats sub-percent moves as unchanged", () => {
  assert.equal(classify(1.2, null), "new");
  assert.equal(classify(1.2, 1.2), "same");
  assert.equal(classify(1.21, 1.2), "same");
  assert.equal(classify(1.4, 1.2), "up");
  assert.equal(classify(1.0, 1.2), "down");
});

test("summarize reports the pasta that got more expensive, first", () => {
  const entries = [
    log("Milch", 1.5, 2),
    log("Milch", 1.5, 9),
    log("Pasta", 1.2, 3),
    log("Pasta", 1.2, 10),
    log("Pasta", 1.4, 17),
    log("Brot", 3.9, 18),
  ];
  const trends = summarize(entries);
  assert.deepEqual(trends.map((t) => t.key), ["pasta", "milch", "brot"]);
  const pasta = trends[0];
  assert.equal(pasta.direction, "up");
  assert.equal(pasta.usual, 1.2);
  assert.equal(pasta.latest, 1.4);
  assert.equal(pasta.change, 0.2);
  assert.equal(pasta.changePct, 17);
  assert.deepEqual(pasta.history, [1.2, 1.2, 1.4]);
  assert.equal(trends[2].direction, "new");
  assert.equal(trends[2].usual, null);
});

test("summarize does not depend on input order", () => {
  const a = log("Pasta", 1.2, 3);
  const b = log("Pasta", 1.4, 10);
  assert.equal(summarize([b, a])[0].latest, 1.4);
});
