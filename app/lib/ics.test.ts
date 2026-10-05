// Run with: node --test app/lib/ics.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIcs, escapeText, foldLine } from "./ics.ts";

const NOW = new Date(Date.UTC(2026, 9, 5, 12, 0, 0));
const ev = (over = {}) => ({ id: "abc", title: "Dinner", date: "2026-10-06", time: "18:30", ...over });
const unfold = (ics: string) => ics.replace(/\r\n /g, "");

test("escapeText escapes backslash, semicolon, comma and newlines", () => {
  assert.equal(escapeText("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});

test("foldLine leaves short lines alone and folds at 75 octets", () => {
  assert.equal(foldLine("SUMMARY:short"), "SUMMARY:short");
  const folded = foldLine("SUMMARY:" + "x".repeat(200));
  const physical = folded.split("\r\n");
  assert.ok(physical.length > 1);
  assert.equal(physical[0].length, 75);
  for (const line of physical.slice(1)) {
    assert.ok(line.startsWith(" "));
    assert.ok(line.length <= 75);
  }
  assert.equal(folded.replace(/\r\n /g, ""), "SUMMARY:" + "x".repeat(200));
});

test("foldLine never splits a multi-byte character", () => {
  const original = "SUMMARY:" + "🧹ä".repeat(60);
  const folded = foldLine(original);
  const encoder = new TextEncoder();
  for (const line of folded.split("\r\n")) {
    assert.ok(encoder.encode(line).length <= 75);
    // a split surrogate/UTF-8 sequence would show up as a replacement char
    assert.ok(!line.includes("�"));
  }
  assert.equal(folded.replace(/\r\n /g, ""), original);
});

test("feed has the required calendar wrapper and CRLF endings", () => {
  const ics = buildIcs({ name: "Our home", events: [], now: NOW });
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(ics.includes("X-WR-CALNAME:Our home\r\n"));
  assert.ok(!/[^\r]\n/.test(ics), "bare LF found");
});

test("timed event uses floating local time and a one hour duration", () => {
  const ics = buildIcs({ name: "H", events: [ev()], now: NOW });
  assert.ok(ics.includes("UID:abc@household-app"));
  assert.ok(ics.includes("DTSTAMP:20261005T120000Z"));
  assert.ok(ics.includes("DTSTART:20261006T183000\r\n"));
  assert.ok(ics.includes("DTEND:20261006T193000\r\n"));
});

test("an event ending after midnight rolls DTEND to the next day", () => {
  const ics = buildIcs({ name: "H", events: [ev({ time: "23:30", date: "2026-12-31" })], now: NOW });
  assert.ok(ics.includes("DTSTART:20261231T233000"));
  assert.ok(ics.includes("DTEND:20270101T003000"));
});

test("a time with seconds (HH:mm:ss) is accepted", () => {
  const ics = buildIcs({ name: "H", events: [ev({ time: "09:00:00" })], now: NOW });
  assert.ok(ics.includes("DTSTART:20261006T090000"));
});

test("an unusable time becomes an all-day event", () => {
  const ics = buildIcs({ name: "H", events: [ev({ time: "later" })], now: NOW });
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261006"));
  assert.ok(ics.includes("DTEND;VALUE=DATE:20261007"));
});

test("an event with an invalid date is skipped, the rest of the feed survives", () => {
  const ics = buildIcs({
    name: "H",
    events: [ev({ id: "bad", date: "not-a-date" }), ev({ id: "good" })],
    now: NOW,
  });
  assert.ok(!ics.includes("UID:bad@"));
  assert.ok(ics.includes("UID:good@"));
});

test("title and location are escaped; location and category are optional", () => {
  const ics = buildIcs({
    name: "H",
    events: [ev({ title: "Dinner, with; friends", location: "Café, Bern", type: "event" }), ev({ id: "2", location: null })],
    now: NOW,
  });
  const text = unfold(ics);
  assert.ok(text.includes("SUMMARY:Dinner\\, with\\; friends"));
  assert.ok(text.includes("LOCATION:Café\\, Bern"));
  assert.equal((text.match(/LOCATION:/g) ?? []).length, 1);
});
