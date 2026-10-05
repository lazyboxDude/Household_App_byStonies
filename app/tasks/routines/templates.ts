// Starter pack: typical Swiss household routines, chores and bills. A template only pre-fills the
// form — the person still picks the weekday that matches their Gemeinde.

import type { AmountKind, RoutineKind, RoutineMode, Schedule } from "./types.ts";

export interface RoutineTemplate {
  key: string;
  title: string;
  icon: string;
  kind: RoutineKind;
  mode: RoutineMode;
  leadDays: number;
  activeMonths: number[] | null;
  amountKind?: AmountKind; // bills only; the amount itself is up to the household
  // The schedule is built from today's date so intervals start right away.
  schedule: (todayISO: string) => Schedule;
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    key: "kehricht",
    title: "Kehricht rausstellen",
    icon: "🗑️",
    kind: "reminder",
    mode: "fixed",
    leadDays: 1,
    activeMonths: null,
    schedule: (today) => ({ type: "weekday", weekdays: [4], everyNWeeks: 2, anchor: today }),
  },
  {
    key: "gruenabfuhr",
    title: "Grünabfuhr",
    icon: "🌿",
    kind: "reminder",
    mode: "fixed",
    leadDays: 1,
    activeMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    schedule: () => ({ type: "weekday", weekdays: [2] }),
  },
  {
    key: "karton",
    title: "Kartonsammlung",
    icon: "📦",
    kind: "reminder",
    mode: "fixed",
    leadDays: 1,
    activeMonths: null,
    schedule: () => ({ type: "nth_weekday", nth: 1, weekday: 1 }),
  },
  {
    key: "papier",
    title: "Papiersammlung",
    icon: "♻️",
    kind: "reminder",
    mode: "fixed",
    leadDays: 1,
    activeMonths: null,
    schedule: () => ({ type: "dates", dates: [] }),
  },
  {
    key: "bad",
    title: "Bad putzen",
    icon: "🛁",
    kind: "chore",
    mode: "after_done",
    leadDays: 0,
    activeMonths: null,
    schedule: (today) => ({ type: "interval", every: 1, unit: "week", anchor: today }),
  },
  {
    key: "staubsaugen",
    title: "Staubsaugen",
    icon: "🧹",
    kind: "chore",
    mode: "after_done",
    leadDays: 0,
    activeMonths: null,
    schedule: (today) => ({ type: "interval", every: 1, unit: "week", anchor: today }),
  },
  {
    key: "pflanzen",
    title: "Pflanzen giessen",
    icon: "🪴",
    kind: "chore",
    mode: "after_done",
    leadDays: 0,
    activeMonths: null,
    schedule: (today) => ({ type: "interval", every: 4, unit: "day", anchor: today }),
  },

  {
    key: "miete",
    title: "Miete",
    icon: "🏠",
    kind: "bill",
    mode: "fixed",
    leadDays: 7,
    activeMonths: null,
    amountKind: "fixed",
    schedule: () => ({ type: "monthday", day: 1 }),
  },
  {
    key: "strom",
    title: "Strom-Abschlag",
    icon: "💡",
    kind: "bill",
    mode: "fixed",
    leadDays: 7,
    activeMonths: null,
    amountKind: "estimate",
    schedule: () => ({ type: "monthday", day: 1 }),
  },
  {
    key: "strom-abrechnung",
    title: "Strom: Jahresabrechnung prüfen",
    icon: "📬",
    kind: "reminder",
    mode: "fixed",
    leadDays: 7,
    activeMonths: null,
    schedule: () => ({ type: "monthday", day: 15, months: [3] }),
  },
  {
    key: "internet",
    title: "Internet",
    icon: "🌐",
    kind: "bill",
    mode: "fixed",
    leadDays: 7,
    activeMonths: null,
    amountKind: "fixed",
    schedule: () => ({ type: "monthday", day: 1 }),
  },
  {
    key: "krankenkasse",
    title: "Krankenkasse",
    icon: "🩺",
    kind: "bill",
    mode: "fixed",
    leadDays: 7,
    activeMonths: null,
    amountKind: "fixed",
    schedule: () => ({ type: "monthday", day: 1 }),
  },
  {
    key: "serafe",
    title: "Serafe",
    icon: "📺",
    kind: "bill",
    mode: "fixed",
    leadDays: 14,
    activeMonths: null,
    amountKind: "fixed",
    schedule: () => ({ type: "monthday", day: 1, months: [1, 4, 7, 10] }),
  },
];
