import type { Language } from "../context/LanguageContext";
import type { Bilingual } from "./routines/i18n";

export const ROOM_ICON_PRESETS = ["🛋️", "🍳", "🛁", "🛏️", "🚪", "🧺", "🚗", "🌿"];

// Rooms and supplies are stored in the database under their English name, and
// shown in the current language via `localizeKnown` — so a household that
// switches language sees "Wohnzimmer" instead of "Living Room" without any
// data migration. Names people typed themselves are shown as they wrote them.
export const DEFAULT_ROOMS: { id: string; name: Bilingual; icon: string }[] = [
  { id: "living-room", name: { en: "Living Room", de: "Wohnzimmer" }, icon: "🛋️" },
  { id: "kitchen", name: { en: "Kitchen", de: "Küche" }, icon: "🍳" },
  { id: "bathroom", name: { en: "Bathroom", de: "Badezimmer" }, icon: "🛁" },
  { id: "bedroom", name: { en: "Bedroom", de: "Schlafzimmer" }, icon: "🛏️" },
];

export const SUPPLY_SUGGESTIONS: Bilingual[] = [
  { en: "All-purpose cleaner", de: "Allzweckreiniger" },
  { en: "Glass cleaner", de: "Glasreiniger" },
  { en: "Microfiber cloth", de: "Mikrofasertuch" },
  { en: "Vacuum cleaner", de: "Staubsauger" },
  { en: "Mop & bucket", de: "Wischmopp & Eimer" },
  { en: "Toilet cleaner", de: "WC-Reiniger" },
  { en: "Sponge", de: "Schwamm" },
  { en: "Trash bags", de: "Müllsäcke" },
  { en: "Disinfectant", de: "Desinfektionsmittel" },
];

/** Show a stored value in `lang` if it's one of the known presets (in either language); otherwise as typed. */
export function localizeKnown(value: string, presets: Bilingual[], lang: Language): string {
  const match = presets.find((p) => p.en === value || p.de === value);
  return match ? match[lang] : value;
}

export const ROOM_PRESETS: Bilingual[] = DEFAULT_ROOMS.map((r) => r.name);
