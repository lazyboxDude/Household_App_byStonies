import { Recurrence, Room } from "./types";

export const RECURRENCE_OPTIONS: { value: Recurrence; label: string; days: number | null }[] = [
  { value: "daily", label: "Daily", days: 1 },
  { value: "weekly", label: "Weekly", days: 7 },
  { value: "biweekly", label: "Every 2 weeks", days: 14 },
  { value: "monthly", label: "Monthly", days: 30 },
  { value: "once", label: "One-time", days: null },
];

export const ROOM_ICON_PRESETS = ["🛋️", "🍳", "🛁", "🛏️", "🚪", "🧺", "🚗", "🌿"];

export const DEFAULT_ROOMS: Room[] = [
  { id: "living-room", name: "Living Room", icon: "🛋️" },
  { id: "kitchen", name: "Kitchen", icon: "🍳" },
  { id: "bathroom", name: "Bathroom", icon: "🛁" },
  { id: "bedroom", name: "Bedroom", icon: "🛏️" },
];

export const SUPPLY_SUGGESTIONS = [
  "All-purpose cleaner",
  "Glass cleaner",
  "Microfiber cloth",
  "Vacuum cleaner",
  "Mop & bucket",
  "Toilet cleaner",
  "Sponge",
  "Trash bags",
  "Disinfectant",
];
