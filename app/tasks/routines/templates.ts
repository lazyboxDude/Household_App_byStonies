// Starter pack: typical Swiss household reminders, chores and bills. A template only pre-fills the
// form — the person still picks the weekday that matches their Gemeinde. The title is stored as
// text in the language the person is using when they pick it.

import type { Bilingual } from "./i18n.ts";
import type { AmountKind, RoutineKind, RoutineMode, Schedule } from "./types.ts";

export interface RoutineTemplate {
  key: string;
  title: Bilingual;
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
    title: { en: "Put out the trash", de: "Kehricht rausstellen" },
    icon: "🗑️",
    kind: "reminder",
    mode: "fixed",
    leadDays: 1,
    activeMonths: null,
    schedule: (today) => ({ type: "weekday", weekdays: [4], everyNWeeks: 2, anchor: today }),
  },
  {
    key: "gruenabfuhr",
    title: { en: "Green waste collection", de: "Grünabfuhr" },
    icon: "🌿",
    kind: "reminder",
    mode: "fixed",
    leadDays: 1,
    activeMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    schedule: () => ({ type: "weekday", weekdays: [2] }),
  },
  {
    key: "karton",
    title: { en: "Cardboard collection", de: "Kartonsammlung" },
    icon: "📦",
    kind: "reminder",
    mode: "fixed",
    leadDays: 1,
    activeMonths: null,
    schedule: () => ({ type: "nth_weekday", nth: 1, weekday: 1 }),
  },
  {
    key: "papier",
    title: { en: "Paper collection", de: "Papiersammlung" },
    icon: "♻️",
    kind: "reminder",
    mode: "fixed",
    leadDays: 1,
    activeMonths: null,
    schedule: () => ({ type: "dates", dates: [] }),
  },
  {
    key: "bad",
    title: { en: "Clean the bathroom", de: "Bad putzen" },
    icon: "🛁",
    kind: "chore",
    mode: "after_done",
    leadDays: 0,
    activeMonths: null,
    schedule: (today) => ({ type: "interval", every: 1, unit: "week", anchor: today }),
  },
  {
    key: "staubsaugen",
    title: { en: "Vacuum", de: "Staubsaugen" },
    icon: "🧹",
    kind: "chore",
    mode: "after_done",
    leadDays: 0,
    activeMonths: null,
    schedule: (today) => ({ type: "interval", every: 1, unit: "week", anchor: today }),
  },
  {
    key: "pflanzen",
    title: { en: "Water the plants", de: "Pflanzen giessen" },
    icon: "🪴",
    kind: "chore",
    mode: "after_done",
    leadDays: 0,
    activeMonths: null,
    schedule: (today) => ({ type: "interval", every: 4, unit: "day", anchor: today }),
  },

  // Bills. The form does not offer them for now (parked, see docs/tasks-rethink.html), the data
  // model and the Rechnungen-Planer still understand them.
  {
    key: "miete",
    title: { en: "Rent", de: "Miete" },
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
    title: { en: "Electricity advance", de: "Strom-Abschlag" },
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
    title: { en: "Electricity: check the annual statement", de: "Strom: Jahresabrechnung prüfen" },
    icon: "📬",
    kind: "reminder",
    mode: "fixed",
    leadDays: 7,
    activeMonths: null,
    schedule: () => ({ type: "monthday", day: 15, months: [3] }),
  },
  {
    key: "internet",
    title: { en: "Internet", de: "Internet" },
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
    title: { en: "Health insurance", de: "Krankenkasse" },
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
    title: { en: "Serafe (TV and radio fee)", de: "Serafe" },
    icon: "📺",
    kind: "bill",
    mode: "fixed",
    leadDays: 14,
    activeMonths: null,
    amountKind: "fixed",
    schedule: () => ({ type: "monthday", day: 1, months: [1, 4, 7, 10] }),
  },
];
