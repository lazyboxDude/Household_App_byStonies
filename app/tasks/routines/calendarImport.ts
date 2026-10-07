// Reads an Entsorgungskalender (.ics or a simple CSV/text list) into dates per waste type, and
// plans what to do with them. Pure, so it is testable.
//
// ICS: single events and the usual repeat rules are read. Repeat rules that need more than the
// schedule engine can express (e.g. "last Friday of every second month") are reported, not guessed.

import { addMonths, occurrencesBetween, parseDateList, parseISO, weekdayOf } from "./schedule.ts";
import type { Routine, Schedule } from "./types.ts";

export interface CalendarEvent {
  title: string;
  date: string; // yyyy-mm-dd
}

export interface ParsedCalendar {
  events: CalendarEvent[];
  unsupported: string[]; // titles of entries whose repeat rule could not be read
}

export interface DateGroup {
  title: string;
  dates: string[]; // sorted, unique
}

const WEEKDAY_CODES: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const MAX_YEARS = 3;

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescapeText(s: string): string {
  return s.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

// 20261112, 20261112T060000, 20261112T060000Z -> 2026-11-12 (the date part as written)
function icsDate(value: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(value.trim());
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const { y, m: mo, d } = parseISO(iso);
  return mo >= 1 && mo <= 12 && d >= 1 && d <= new Date(Date.UTC(y, mo, 0)).getUTCDate() ? iso : null;
}

function parseRule(rule: string): Record<string, string> {
  return Object.fromEntries(rule.split(";").map((p) => p.split("=") as [string, string]).filter(([k, v]) => k && v));
}

// Turns an RRULE into a Schedule of ours, or null when it can't be expressed.
function ruleToSchedule(rule: Record<string, string>, start: string): Schedule | null {
  const every = Math.max(1, Number(rule.INTERVAL ?? 1));
  if (!Number.isInteger(every)) return null;
  const byDay = rule.BYDAY ? rule.BYDAY.split(",") : null;
  switch (rule.FREQ) {
    case "DAILY":
      return rule.BYDAY || rule.BYMONTHDAY || rule.BYMONTH ? null : { type: "interval", every, unit: "day", anchor: start };
    case "WEEKLY": {
      if (rule.BYMONTHDAY || rule.BYMONTH) return null;
      const days = byDay ? byDay.map((c) => WEEKDAY_CODES[c]) : [weekdayOf(start)];
      if (days.some((d) => d === undefined)) return null;
      return { type: "weekday", weekdays: days, everyNWeeks: every, anchor: start };
    }
    case "MONTHLY": {
      if (every !== 1 || rule.BYMONTH) return null;
      if (rule.BYMONTHDAY && !byDay) {
        const day = Number(rule.BYMONTHDAY);
        return Number.isInteger(day) && day >= 1 && day <= 31 ? { type: "monthday", day } : rule.BYMONTHDAY === "-1" ? { type: "monthday", day: "last" } : null;
      }
      if (byDay && byDay.length === 1 && !rule.BYMONTHDAY) {
        const m = /^(-1|[1-4])(MO|TU|WE|TH|FR|SA|SU)$/.exec(byDay[0]);
        return m ? { type: "nth_weekday", nth: Number(m[1]) as 1 | 2 | 3 | 4 | -1, weekday: WEEKDAY_CODES[m[2]] } : null;
      }
      return !rule.BYDAY && !rule.BYMONTHDAY ? { type: "interval", every, unit: "month", anchor: start } : null;
    }
    case "YEARLY":
      return rule.BYDAY || rule.BYMONTHDAY || rule.BYMONTH ? null : { type: "interval", every, unit: "year", anchor: start };
    default:
      return null;
  }
}

function expandRule(rule: Record<string, string>, start: string): string[] | null {
  const schedule = ruleToSchedule(rule, start);
  if (!schedule) return null;
  const until = rule.UNTIL ? icsDate(rule.UNTIL) : null;
  const limit = addMonths(start, MAX_YEARS * 12);
  let dates = occurrencesBetween(schedule, start, until && until < limit ? until : limit);
  // The rule always includes its own first date.
  if (dates[0] !== start && schedule.type !== "dates") dates = [start, ...dates.filter((d) => d !== start)];
  if (rule.COUNT) dates = dates.slice(0, Number(rule.COUNT));
  return dates;
}

export function parseIcs(text: string): ParsedCalendar {
  const events: CalendarEvent[] = [];
  const unsupported: string[] = [];
  let cur: { summary: string; start: string | null; rule: string | null; exdates: string[] } | null = null;

  for (const line of unfold(text)) {
    const upper = line.toUpperCase();
    if (upper === "BEGIN:VEVENT") {
      cur = { summary: "", start: null, rule: null, exdates: [] };
      continue;
    }
    if (upper === "END:VEVENT" && cur) {
      const title = cur.summary || "Entsorgung";
      if (cur.start) {
        if (cur.rule) {
          const dates = expandRule(parseRule(cur.rule), cur.start);
          if (dates) {
            for (const d of dates) if (!cur.exdates.includes(d)) events.push({ title, date: d });
          } else {
            unsupported.push(title);
          }
        } else if (!cur.exdates.includes(cur.start)) {
          events.push({ title, date: cur.start });
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).split(";")[0].toUpperCase();
    const value = line.slice(colon + 1);
    if (name === "SUMMARY") cur.summary = unescapeText(value);
    else if (name === "DTSTART") cur.start = icsDate(value);
    else if (name === "RRULE") cur.rule = value;
    else if (name === "EXDATE") for (const v of value.split(",")) { const d = icsDate(v); if (d) cur.exdates.push(d); }
  }
  return { events, unsupported };
}

// "12.11.2026;Kehricht", "Papier, 2026-12-10", or just a list of dates (then `defaultTitle` is used).
export function parseCsvCalendar(text: string, defaultTitle = "Entsorgung"): ParsedCalendar {
  const events: CalendarEvent[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.split(/[;\t,]/).map((c) => c.trim().replace(/^"|"$/g, "")).filter(Boolean);
    const dateCells = cells.filter((c) => parseDateList(c).dates.length === 1);
    if (dateCells.length === 0) continue; // header or noise
    const title = cells.filter((c) => !dateCells.includes(c)).join(" ").trim() || defaultTitle;
    for (const c of dateCells) events.push({ title, date: parseDateList(c).dates[0] });
  }
  return { events, unsupported: [] };
}

export function parseCalendarFile(text: string, defaultTitle?: string): ParsedCalendar {
  return /BEGIN:VCALENDAR/i.test(text) ? parseIcs(text) : parseCsvCalendar(text, defaultTitle);
}

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function groupEvents(events: CalendarEvent[]): DateGroup[] {
  const groups = new Map<string, { title: string; dates: Set<string> }>();
  for (const e of events) {
    const key = normalizeTitle(e.title);
    const g = groups.get(key) ?? { title: e.title.trim().replace(/\s+/g, " "), dates: new Set<string>() };
    g.dates.add(e.date);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({ title: g.title, dates: [...g.dates].sort() })).sort((a, b) => a.title.localeCompare(b.title));
}

const ICONS: [RegExp, string][] = [
  [/papier/i, "♻️"],
  [/karton/i, "📦"],
  [/gr(ü|u)n|garten|häcksel|haecksel|bio|kompost/i, "🌿"],
  [/sperr/i, "🛋️"],
  [/glas/i, "🍾"],
  [/metall|blech|dosen|alu/i, "🥫"],
  [/textil|kleider/i, "👕"],
  [/elektro|schrott/i, "🔌"],
  [/kehricht|abfall|müll|muell|kehr/i, "🗑️"],
];

export function guessIcon(title: string): string {
  return ICONS.find(([re]) => re.test(title))?.[1] ?? "♻️";
}

export interface ImportItem {
  title: string;
  icon: string;
  dates: string[]; // from today on
  action: "create" | "update" | "nothing";
  routineId?: string; // for "update"
  added: number; // new dates
  existingDates?: string[];
}

// What to do with each waste type: create a new reminder, add the new dates to the reminder that
// already has this name (the yearly re-import), or nothing when there is nothing new.
export function planCalendarImport(groups: DateGroup[], routines: Routine[], today: string): ImportItem[] {
  return groups.map((g) => {
    const future = g.dates.filter((d) => d >= today);
    const existing = routines.find(
      (r) => r.kind === "reminder" && r.schedule.type === "dates" && normalizeTitle(r.title) === normalizeTitle(g.title)
    );
    if (existing && existing.schedule.type === "dates") {
      const have = new Set(existing.schedule.dates);
      const added = future.filter((d) => !have.has(d)).length;
      return {
        title: existing.title,
        icon: existing.icon,
        dates: future,
        action: added > 0 ? "update" : "nothing",
        routineId: existing.id,
        added,
        existingDates: existing.schedule.dates,
      } as ImportItem;
    }
    return { title: g.title, icon: guessIcon(g.title), dates: future, action: future.length > 0 ? "create" : "nothing", added: future.length } as ImportItem;
  });
}

// The dates a routine keeps after an update: everything it had plus the new ones.
export function mergedDates(item: ImportItem): string[] {
  return [...new Set([...(item.existingDates ?? []), ...item.dates])].sort();
}
