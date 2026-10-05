// Plain-German one-liner for a routine's rhythm, e.g. "Jede 2. Woche · Do".

import type { Routine, Schedule } from "./types.ts";

const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const WD_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const NTH: Record<number, string> = { 1: "Erster", 2: "Zweiter", 3: "Dritter", 4: "Vierter", [-1]: "Letzter" };

function monthsLabel(months: number[]): string {
  const sorted = [...months].sort((a, b) => a - b);
  const contiguous = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1);
  if (sorted.length > 2 && contiguous) return `${MONTHS[sorted[0] - 1]}–${MONTHS[sorted[sorted.length - 1] - 1]}`;
  return sorted.map((m) => MONTHS[m - 1]).join(", ");
}

function scheduleLabel(s: Schedule): string {
  switch (s.type) {
    case "interval": {
      if (s.every === 1) {
        return { day: "Jeden Tag", week: "Jede Woche", month: "Jeden Monat", year: "Jedes Jahr" }[s.unit];
      }
      return `Alle ${s.every} ${{ day: "Tage", week: "Wochen", month: "Monate", year: "Jahre" }[s.unit]}`;
    }
    case "weekday": {
      const days = s.weekdays.map((d) => WD[d]).join(", ");
      return s.everyNWeeks && s.everyNWeeks > 1 ? `Jede ${s.everyNWeeks}. Woche · ${days}` : `Jeden ${days}`;
    }
    case "monthday": {
      const day = s.day === "last" ? "Am letzten Tag des Monats" : `Am ${s.day}. des Monats`;
      return s.months && s.months.length > 0 ? `${day} · ${monthsLabel(s.months)}` : day;
    }
    case "nth_weekday": {
      const base = `${NTH[s.nth]} ${WD_LONG[s.weekday]} im Monat`;
      return s.months && s.months.length > 0 ? `${base} · ${monthsLabel(s.months)}` : base;
    }
    case "dates":
      return `${s.dates.length} feste Daten`;
  }
}

export function describeRoutine(r: Routine): string {
  const parts = [scheduleLabel(r.schedule)];
  if (r.mode === "after_done") parts.push("ab dem Erledigen");
  if (r.activeMonths && r.activeMonths.length > 0) parts.push(monthsLabel(r.activeMonths));
  return parts.join(" · ");
}

// Who it is for, in a few words: "Mia", "Reihum: Mia, Jonas", "Fair verteilt", "Jonas zahlt · aufgeteilt".
export function whoLabel(r: Routine, nameOf: (id: string) => string | null): string {
  if (r.kind === "bill") {
    const payer = r.payerId ? nameOf(r.payerId) : null;
    return [payer ? `${payer} zahlt` : null, r.split ? "aufgeteilt" : null].filter(Boolean).join(" · ");
  }
  switch (r.assignment) {
    case "fixed":
      return r.assigneeId ? nameOf(r.assigneeId) ?? "" : "";
    case "rotation":
      return `Reihum: ${(r.rotation ?? []).map((id) => nameOf(id)).filter(Boolean).join(", ")}`;
    case "fair_share":
      return "Fair verteilt";
    default:
      return "";
  }
}
