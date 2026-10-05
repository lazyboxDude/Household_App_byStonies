// Pure schedule engine for Routinen. No React, no Supabase — so it can be tested
// with `node --test` (type-stripping: keep imports with .ts and avoid enums).
//
// All dates are yyyy-mm-dd strings and are calculated in UTC on purpose: going
// through local time and toISOString() shifts days around DST and time zones.

import type { IntervalUnit, Schedule } from "./types.ts";

const DAY_MS = 86_400_000;

export function parseISO(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function toUTC(iso: string): number {
  const { y, m, d } = parseISO(iso);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

// Today as yyyy-mm-dd in the person's own time zone (not UTC).
export function todayLocalISO(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  return fromUTC(toUTC(iso) + days * DAY_MS);
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((toUTC(toISO) - toUTC(fromISO)) / DAY_MS);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// Adds calendar months and clamps to the end of the month (31 Jan + 1 month = 28/29 Feb).
export function addMonths(iso: string, months: number): string {
  const { y, m, d } = parseISO(iso);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12 + 12) % 12 + 1;
  const nd = Math.min(d, daysInMonth(ny, nm));
  return fromUTC(Date.UTC(ny, nm - 1, nd));
}

export function weekdayOf(iso: string): number {
  return new Date(toUTC(iso)).getUTCDay();
}

function monthOf(iso: string): number {
  return parseISO(iso).m;
}

// Monday of the week that contains `iso`.
function weekStart(iso: string): string {
  const wd = weekdayOf(iso);
  return addDays(iso, -((wd + 6) % 7));
}

function addInterval(iso: string, every: number, unit: IntervalUnit): string {
  switch (unit) {
    case "day": return addDays(iso, every);
    case "week": return addDays(iso, every * 7);
    case "month": return addMonths(iso, every);
    case "year": return addMonths(iso, every * 12);
  }
}

// n-th interval step counted from the anchor (not cumulatively, so a clamped
// 28 Feb does not drag every later month down to the 28th).
function intervalStep(anchor: string, every: number, unit: IntervalUnit, n: number): string {
  return addInterval(anchor, every * n, unit);
}

function nthWeekdayOfMonth(y: number, m: number, weekday: number, nth: number): string | null {
  const dim = daysInMonth(y, m);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  if (nth === -1) {
    const last = new Date(Date.UTC(y, m - 1, dim)).getUTCDay();
    const day = dim - ((last - weekday + 7) % 7);
    return fromUTC(Date.UTC(y, m - 1, day));
  }
  const day = 1 + ((weekday - first + 7) % 7) + (nth - 1) * 7;
  return day <= dim ? fromUTC(Date.UTC(y, m - 1, day)) : null;
}

function monthsInRange(from: string, to: string): { y: number; m: number }[] {
  const a = parseISO(from);
  const b = parseISO(to);
  const out: { y: number; m: number }[] = [];
  let y = a.y;
  let m = a.m;
  while (y < b.y || (y === b.y && m <= b.m)) {
    out.push({ y, m });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// All due dates of a fixed schedule within [from, to] (both inclusive), ascending.
// `activeMonths` (1-12) drops everything outside the season.
export function occurrencesBetween(
  schedule: Schedule,
  from: string,
  to: string,
  activeMonths?: number[] | null
): string[] {
  if (from > to) return [];
  let dates: string[] = [];

  switch (schedule.type) {
    case "interval": {
      const every = Math.max(1, Math.floor(schedule.every));
      // Start near `from` instead of at the anchor, so old anchors stay cheap.
      let n = 0;
      if (schedule.anchor < from) {
        const gap = daysBetween(schedule.anchor, from);
        // Longest possible step, so the estimate can only undershoot, never skip a date.
        const perStep = schedule.unit === "day" ? every
          : schedule.unit === "week" ? every * 7
          : schedule.unit === "month" ? every * 31
          : every * 366;
        n = Math.max(0, Math.floor(gap / perStep) - 1);
      }
      for (let guard = 0; guard < 5000; guard++, n++) {
        const d = intervalStep(schedule.anchor, every, schedule.unit, n);
        if (d > to) break;
        if (d >= from) dates.push(d);
      }
      break;
    }
    case "weekday": {
      const every = Math.max(1, Math.floor(schedule.everyNWeeks ?? 1));
      const anchorWeek = schedule.anchor ? weekStart(schedule.anchor) : null;
      for (let d = from; d <= to; d = addDays(d, 1)) {
        if (!schedule.weekdays.includes(weekdayOf(d))) continue;
        if (every > 1 && anchorWeek) {
          const weeks = Math.floor(daysBetween(anchorWeek, weekStart(d)) / 7);
          if (((weeks % every) + every) % every !== 0) continue;
        }
        dates.push(d);
      }
      break;
    }
    case "monthday": {
      for (const { y, m } of monthsInRange(from, to)) {
        if (schedule.months && schedule.months.length > 0 && !schedule.months.includes(m)) continue;
        const dim = daysInMonth(y, m);
        const day = schedule.day === "last" ? dim : Math.min(schedule.day, dim);
        const d = `${y}-${pad(m)}-${pad(day)}`;
        if (d >= from && d <= to) dates.push(d);
      }
      break;
    }
    case "nth_weekday": {
      for (const { y, m } of monthsInRange(from, to)) {
        if (schedule.months && schedule.months.length > 0 && !schedule.months.includes(m)) continue;
        const d = nthWeekdayOfMonth(y, m, schedule.weekday, schedule.nth);
        if (d && d >= from && d <= to) dates.push(d);
      }
      break;
    }
    case "dates": {
      dates = schedule.dates.filter((d) => d >= from && d <= to);
      break;
    }
  }

  if (activeMonths && activeMonths.length > 0) {
    dates = dates.filter((d) => activeMonths.includes(monthOf(d)));
  }
  return [...new Set(dates)].sort();
}

// For after_done routines: when the next one is due, counted from the day it was done.
export function nextAfterDone(schedule: Schedule, doneISO: string): string | null {
  if (schedule.type !== "interval") return null;
  return addInterval(doneISO, Math.max(1, Math.floor(schedule.every)), schedule.unit);
}

// Accepts "2026-11-05", "05.11.2026" and "5.11.26", separated by newlines, commas or semicolons.
// Returns valid ISO dates (sorted, unique) and the entries it could not read.
export function parseDateList(text: string): { dates: string[]; invalid: string[] } {
  const dates = new Set<string>();
  const invalid: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const token = raw.trim();
    if (!token) continue;
    let y: number, m: number, d: number;
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(token);
    const de = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(token);
    if (iso) {
      y = +iso[1]; m = +iso[2]; d = +iso[3];
    } else if (de) {
      d = +de[1]; m = +de[2]; y = +de[3];
      if (de[3].length === 2) y += 2000;
    } else {
      invalid.push(token);
      continue;
    }
    if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) {
      invalid.push(token);
      continue;
    }
    dates.add(`${y}-${pad(m)}-${pad(d)}`);
  }
  return { dates: [...dates].sort(), invalid };
}
