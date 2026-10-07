// Rooms: how clean a room is right now, and what is worth doing in which kind of room.
// Pure, so it is testable (`node --test`).

import type { Bilingual } from "./i18n.ts";
import { daysBetween } from "./schedule.ts";
import type { IntervalUnit, Occurrence, Routine } from "./types.ts";

// --- state of a room ---

// empty: nothing planned here yet. ok: nothing due soon. soon: something comes up in the next
// couple of days. today: something is due today. overdue: something was due before today.
export type RoomStatus = "empty" | "ok" | "soon" | "today" | "overdue";

export interface RoomSummary {
  status: RoomStatus;
  routineCount: number;
  dueCount: number; // tasks that are due today or already waiting
  nextDue: string | null; // earliest open date, may lie in the past
}

export const SOON_DAYS = 2;

// What belongs to a room: its chores and reminders. Bills are not about a room.
// `null` is "no room": the chores that were never given one. Reminders like the trash collection
// do not belong in a room, so they are not part of that.
export function routinesInRoom(roomId: string | null, routines: Routine[]): Routine[] {
  return routines.filter((r) => (roomId === null ? r.roomId === null && r.kind === "chore" : r.roomId === roomId && r.kind !== "bill"));
}

// A room is judged by its chores and reminders. Bills are not about a room.
export function summarizeRoom(
  roomId: string | null,
  routines: Routine[],
  occurrences: Occurrence[],
  today: string,
  soonDays = SOON_DAYS
): RoomSummary {
  const inRoom = routinesInRoom(roomId, routines);
  let overdue = 0;
  let dueToday = 0;
  let soon = 0;
  let nextDue: string | null = null;

  for (const r of inRoom) {
    const open = occurrences.filter((o) => o.routineId === r.id && o.status === "open");
    // A chore waiting for days counts once, however many dates piled up behind it.
    // A reminder that is already past does not count at all, it has simply gone by.
    const dates = open.map((o) => o.dueDate).filter((d) => r.kind === "chore" || d >= today).sort();
    if (dates.length === 0) continue;
    const first = dates[0];
    if (nextDue === null || first < nextDue) nextDue = first;
    if (first < today) overdue++;
    else if (first === today) dueToday++;
    else if (daysBetween(today, first) <= soonDays) soon++;
  }

  const status: RoomStatus =
    inRoom.length === 0 ? "empty" : overdue > 0 ? "overdue" : dueToday > 0 ? "today" : soon > 0 ? "soon" : "ok";
  return { status, routineCount: inRoom.length, dueCount: overdue + dueToday, nextDue };
}

// --- what to suggest in a room ---

export type RoomKind = "living" | "kitchen" | "bath" | "bedroom" | "hall" | "laundry" | "car" | "garden" | "other";

export interface RoomSuggestion {
  key: string;
  title: Bilingual;
  icon: string;
  every: number;
  unit: IntervalUnit;
  effort: 1 | 2 | 3 | 5;
  supplies: string[]; // English names from SUPPLY_SUGGESTIONS
}

const ICON_KIND: Record<string, RoomKind> = {
  "🛋": "living",
  "🍳": "kitchen",
  "🛁": "bath",
  "🛏": "bedroom",
  "🚪": "hall",
  "🧺": "laundry",
  "🚗": "car",
  "🌿": "garden",
};

// Rooms keep the icon people picked, so that is the most reliable hint at what kind of room it is
// (the name is whatever they typed). Icons come with or without a variation selector.
export function roomKind(icon: string): RoomKind {
  return ICON_KIND[icon.replace(/️/g, "")] ?? "other";
}

const s = (
  key: string,
  en: string,
  de: string,
  icon: string,
  every: number,
  unit: IntervalUnit,
  effort: 1 | 2 | 3 | 5,
  supplies: string[] = []
): RoomSuggestion => ({ key, title: { en, de }, icon, every, unit, effort, supplies });

export const ROOM_SUGGESTIONS: Record<RoomKind, RoomSuggestion[]> = {
  living: [
    s("vacuum", "Vacuum", "Staubsaugen", "🧹", 1, "week", 2, ["Vacuum cleaner"]),
    s("dust", "Dust the surfaces", "Staub wischen", "🧽", 1, "week", 1, ["Microfiber cloth"]),
    s("windows", "Clean the windows", "Fenster putzen", "🪟", 2, "month", 3, ["Glass cleaner", "Microfiber cloth"]),
    s("plants", "Water the plants", "Pflanzen giessen", "🪴", 4, "day", 1),
  ],
  kitchen: [
    s("counters", "Wipe counters and stove", "Ablagen und Herd abwischen", "🧽", 1, "week", 1, ["All-purpose cleaner", "Sponge"]),
    s("floor", "Mop the floor", "Boden wischen", "🧹", 1, "week", 2, ["Mop & bucket"]),
    s("trash", "Take out the trash", "Müll rausbringen", "🗑️", 3, "day", 1, ["Trash bags"]),
    s("fridge", "Clean the fridge", "Kühlschrank reinigen", "🧊", 1, "month", 2, ["All-purpose cleaner", "Sponge"]),
    s("oven", "Clean the oven", "Backofen reinigen", "🔥", 3, "month", 3, ["All-purpose cleaner"]),
  ],
  bath: [
    s("shower", "Clean shower and tub", "Dusche und Badewanne putzen", "🚿", 1, "week", 2, ["All-purpose cleaner", "Sponge"]),
    s("toilet", "Clean the toilet", "WC putzen", "🚽", 1, "week", 2, ["Toilet cleaner"]),
    s("sink", "Sink and mirror", "Waschbecken und Spiegel", "🪞", 1, "week", 1, ["Glass cleaner", "Microfiber cloth"]),
    s("floor", "Mop the floor", "Boden wischen", "🧹", 2, "week", 2, ["Mop & bucket"]),
    s("towels", "Fresh towels", "Handtücher wechseln", "🧺", 1, "week", 1),
  ],
  bedroom: [
    s("bedding", "Change the bed linen", "Bettwäsche wechseln", "🛏️", 2, "week", 2),
    s("vacuum", "Vacuum", "Staubsaugen", "🧹", 1, "week", 2, ["Vacuum cleaner"]),
    s("dust", "Dust the surfaces", "Staub wischen", "🧽", 2, "week", 1, ["Microfiber cloth"]),
    s("wardrobe", "Sort out the wardrobe", "Kleiderschrank ausmisten", "👕", 3, "month", 3),
  ],
  hall: [
    s("floor", "Mop the floor", "Boden wischen", "🧹", 2, "week", 2, ["Mop & bucket"]),
    s("shoes", "Tidy the shoes", "Schuhe aufräumen", "👟", 1, "week", 1),
    s("mat", "Shake out the door mat", "Fussmatte ausklopfen", "🚪", 2, "week", 1),
  ],
  laundry: [
    s("laundry", "Do the laundry", "Wäsche waschen", "🧺", 1, "week", 2),
    s("machine", "Clean the washing machine", "Waschmaschine reinigen", "🫧", 1, "month", 2, ["All-purpose cleaner"]),
  ],
  car: [
    s("vacuum", "Vacuum the car", "Auto saugen", "🧹", 1, "month", 2, ["Vacuum cleaner"]),
    s("wash", "Wash the car", "Auto waschen", "🚗", 1, "month", 3),
    s("tyres", "Check the tyre pressure", "Reifendruck prüfen", "🛞", 1, "month", 1),
  ],
  garden: [
    s("plants", "Water the plants", "Pflanzen giessen", "🪴", 3, "day", 1),
    s("sweep", "Sweep the balcony", "Balkon wischen", "🧹", 2, "week", 2),
  ],
  other: [
    s("vacuum", "Vacuum", "Staubsaugen", "🧹", 1, "week", 2, ["Vacuum cleaner"]),
    s("floor", "Mop the floor", "Boden wischen", "🧹", 1, "week", 2, ["Mop & bucket"]),
    s("dust", "Dust the surfaces", "Staub wischen", "🧽", 1, "week", 1, ["Microfiber cloth"]),
  ],
};

export function suggestionsFor(icon: string): RoomSuggestion[] {
  return ROOM_SUGGESTIONS[roomKind(icon)];
}

// Suggestions that are not already planned in this room (compared by title, in either language).
export function remainingSuggestions(icon: string, existingTitles: string[]): RoomSuggestion[] {
  const have = new Set(existingTitles.map((t) => t.trim().toLowerCase()));
  return suggestionsFor(icon).filter(
    (sug) => !have.has(sug.title.en.toLowerCase()) && !have.has(sug.title.de.toLowerCase())
  );
}
