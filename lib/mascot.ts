import type { MascotMood } from "@/components/Mascot";

// Everything the mascot says lives here, so the voice stays in one place.
// House tone (see .claude/skills/onboarding-tone): du-Form, warm, kurz,
// kein Urteil, keine Ausrufezeichen, kein Emoji.

interface Greeting {
  mood: MascotMood;
  text: string;
}

export function dashboardGreeting({
  pendingTasks,
  eventsToday,
}: {
  pendingTasks: number;
  eventsToday: number;
}): Greeting {
  if (pendingTasks === 0 && eventsToday === 0) {
    return { mood: "sleepy", text: "Gerade ist alles ruhig. Ich leg mich kurz hin." };
  }
  if (eventsToday > 0) {
    return { mood: "happy", text: "Heute steht etwas im Kalender." };
  }
  if (pendingTasks <= 3) {
    return { mood: "happy", text: "Nur ein paar Kleinigkeiten offen." };
  }
  return { mood: "happy", text: "Ein Schritt nach dem anderen. Ich bin dabei." };
}
