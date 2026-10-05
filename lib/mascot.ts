import type { MascotMood } from "@/components/Mascot";
import type { Language } from "@/app/context/LanguageContext";

// Everything the mascot says lives here, so the voice stays in one place.
// House tone (see .claude/skills/onboarding-tone): du-Form, warm, kurz,
// kein Urteil, keine Ausrufezeichen, kein Emoji.

interface Greeting {
  mood: MascotMood;
  text: string;
}

const LINES = {
  quiet: { en: "All quiet right now. I'll take a little nap.", de: "Gerade ist alles ruhig. Ich leg mich kurz hin." },
  events: { en: "There's something in the calendar today.", de: "Heute steht etwas im Kalender." },
  few: { en: "Just a few small things left.", de: "Nur ein paar Kleinigkeiten offen." },
  many: { en: "One step at a time. I'm with you.", de: "Ein Schritt nach dem anderen. Ich bin dabei." },
};

export function dashboardGreeting(
  lang: Language,
  { pendingTasks, eventsToday }: { pendingTasks: number; eventsToday: number }
): Greeting {
  if (pendingTasks === 0 && eventsToday === 0) return { mood: "sleepy", text: LINES.quiet[lang] };
  if (eventsToday > 0) return { mood: "happy", text: LINES.events[lang] };
  if (pendingTasks <= 3) return { mood: "happy", text: LINES.few[lang] };
  return { mood: "happy", text: LINES.many[lang] };
}
