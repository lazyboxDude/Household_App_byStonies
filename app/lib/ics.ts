// Builds an iCalendar (RFC 5545) feed from household calendar events, for the
// subscription URL served by app/api/calendar/feed/[token]/route.ts.
// Pure functions only, so they can be tested with `node --test` (no framework).

export interface FeedEvent {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  time: string; // HH:mm (a text column — may be malformed, so it's validated)
  location?: string | null;
  type?: string | null;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)/;
const EVENT_DURATION_MINUTES = 60;

// RFC 5545 §3.3.11: escape backslash, semicolon, comma and newlines in TEXT values.
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// RFC 5545 §3.1: lines are limited to 75 octets and folded with CRLF + one space.
// Folds are made on UTF-8 character boundaries so multi-byte characters
// (umlauts, emoji) are never split.
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  // The first line holds 75 octets; continuation lines hold 74 plus the leading space.
  let limit = 75;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
      limit = 74;
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toUtcStamp(date: Date) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

// Floating local time (no TZID/Z): the event lands at the same wall-clock time
// in whatever timezone the subscriber's calendar uses. That matches how the app
// stores events (a date plus a plain "HH:mm"), and avoids shipping a VTIMEZONE.
function localStamp(date: string, hours: number, minutes: number) {
  const [, y, m, d] = date.match(DATE_RE)!;
  return `${y}${m}${d}T${pad(hours)}${pad(minutes)}00`;
}

function addDays(date: string, days: number) {
  const [, y, m, d] = date.match(DATE_RE)!;
  const next = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + days));
  return `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
}

function buildEvent(event: FeedEvent, stamp: string): string[] | null {
  // A bad date can't be placed on a calendar — skip the event instead of
  // failing the whole feed.
  if (!DATE_RE.test(event.date)) return null;

  const lines = ["BEGIN:VEVENT", `UID:${event.id}@household-app`, `DTSTAMP:${stamp}`];

  const time = event.time.match(TIME_RE);
  if (time) {
    const hours = Number(time[1]);
    const minutes = Number(time[2]);
    const endTotal = hours * 60 + minutes + EVENT_DURATION_MINUTES;
    // An end past midnight rolls over to the next day.
    const endDate = endTotal >= 24 * 60 ? addDays(event.date, 1) : event.date.replace(/-/g, "");
    const endMinutesOfDay = endTotal % (24 * 60);
    lines.push(
      `DTSTART:${localStamp(event.date, hours, minutes)}`,
      `DTEND:${endDate}T${pad(Math.floor(endMinutesOfDay / 60))}${pad(endMinutesOfDay % 60)}00`
    );
  } else {
    // No usable time → all-day event (DTEND is exclusive).
    lines.push(
      `DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${addDays(event.date, 1)}`
    );
  }

  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.type) lines.push(`CATEGORIES:${escapeText(event.type)}`);
  lines.push("END:VEVENT");
  return lines;
}

export function buildIcs(params: { name: string; events: FeedEvent[]; now?: Date }): string {
  const stamp = toUtcStamp(params.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Household App byStonies//Calendar Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(params.name)}`,
    // Hints for clients that honour them (Google mostly ignores them and polls
    // on its own schedule, typically every few hours).
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const event of params.events) {
    const built = buildEvent(event, stamp);
    if (built) lines.push(...built);
  }

  lines.push("END:VCALENDAR");
  // Every line, including the last, ends with CRLF.
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
