// Plain-language one-liner for a task's rhythm, e.g. "Jede 2. Woche · Do" / "Every 2nd week · Thu".

import { MONTHS_SHORT, WEEKDAYS_LONG, WEEKDAYS_SHORT, ordinalEn, type Lang } from "./i18n.ts";
import type { Routine, Schedule } from "./types.ts";

const NTH: Record<Lang, Record<number, string>> = {
  de: { 1: "Erster", 2: "Zweiter", 3: "Dritter", 4: "Vierter", [-1]: "Letzter" },
  en: { 1: "First", 2: "Second", 3: "Third", 4: "Fourth", [-1]: "Last" },
};

const EVERY_ONE: Record<Lang, Record<string, string>> = {
  de: { day: "Jeden Tag", week: "Jede Woche", month: "Jeden Monat", year: "Jedes Jahr" },
  en: { day: "Every day", week: "Every week", month: "Every month", year: "Every year" },
};

const UNITS: Record<Lang, Record<string, string>> = {
  de: { day: "Tage", week: "Wochen", month: "Monate", year: "Jahre" },
  en: { day: "days", week: "weeks", month: "months", year: "years" },
};

function monthsLabel(months: number[], lang: Lang): string {
  const names = MONTHS_SHORT[lang];
  const sorted = [...months].sort((a, b) => a - b);
  const contiguous = sorted.every((m, i) => i === 0 || m === sorted[i - 1] + 1);
  if (sorted.length > 2 && contiguous) return `${names[sorted[0] - 1]}–${names[sorted[sorted.length - 1] - 1]}`;
  return sorted.map((m) => names[m - 1]).join(", ");
}

function scheduleLabel(s: Schedule, lang: Lang): string {
  const de = lang === "de";
  switch (s.type) {
    case "interval":
      if (s.every === 1) return EVERY_ONE[lang][s.unit];
      return de ? `Alle ${s.every} ${UNITS.de[s.unit]}` : `Every ${s.every} ${UNITS.en[s.unit]}`;
    case "weekday": {
      const days = s.weekdays.map((d) => WEEKDAYS_SHORT[lang][d]).join(", ");
      if (s.everyNWeeks && s.everyNWeeks > 1) {
        return de ? `Jede ${s.everyNWeeks}. Woche · ${days}` : `Every ${ordinalEn(s.everyNWeeks)} week · ${days}`;
      }
      return de ? `Jeden ${days}` : `Every ${days}`;
    }
    case "monthday": {
      const day = s.day === "last"
        ? (de ? "Am letzten Tag des Monats" : "On the last day of the month")
        : (de ? `Am ${s.day}. des Monats` : `On the ${ordinalEn(s.day)} of the month`);
      return s.months && s.months.length > 0 ? `${day} · ${monthsLabel(s.months, lang)}` : day;
    }
    case "nth_weekday": {
      const base = de
        ? `${NTH.de[s.nth]} ${WEEKDAYS_LONG.de[s.weekday]} im Monat`
        : `${NTH.en[s.nth]} ${WEEKDAYS_LONG.en[s.weekday]} of the month`;
      return s.months && s.months.length > 0 ? `${base} · ${monthsLabel(s.months, lang)}` : base;
    }
    case "dates":
      if (de) return s.dates.length === 1 ? "Einmalig" : `${s.dates.length} feste Daten`;
      return s.dates.length === 1 ? "Once" : `${s.dates.length} fixed dates`;
  }
}

// `brief` leaves out how the next date is counted and the season, for places with little room.
export function describeRoutine(r: Routine, lang: Lang = "de", brief = false): string {
  const parts = [scheduleLabel(r.schedule, lang)];
  if (brief) return parts[0];
  if (r.mode === "after_done") parts.push(lang === "de" ? "ab dem Erledigen" : "counted from when it's done");
  if (r.activeMonths && r.activeMonths.length > 0) parts.push(monthsLabel(r.activeMonths, lang));
  return parts.join(" · ");
}

// Who it is for, in a few words: "Mia", "Abwechselnd: Mia, Jonas", "Fair verteilt", "Jonas zahlt · aufgeteilt".
export function whoLabel(r: Routine, nameOf: (id: string) => string | null, lang: Lang = "de"): string {
  const de = lang === "de";
  if (r.kind === "bill") {
    const payer = r.payerId ? nameOf(r.payerId) : null;
    return [payer ? (de ? `${payer} zahlt` : `${payer} pays`) : null, r.split ? (de ? "aufgeteilt" : "split") : null]
      .filter(Boolean)
      .join(" · ");
  }
  switch (r.assignment) {
    case "fixed":
      return r.assigneeId ? nameOf(r.assigneeId) ?? "" : "";
    case "rotation": {
      const names = (r.rotation ?? []).map((id) => nameOf(id)).filter(Boolean).join(", ");
      return de ? `Abwechselnd: ${names}` : `Taking turns: ${names}`;
    }
    case "fair_share":
      return de ? "Fair verteilt" : "Shared fairly";
    default:
      return "";
  }
}
