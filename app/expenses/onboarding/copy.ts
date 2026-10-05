// Centralized microcopy for the money onboarding — every screen imports its
// text from here so tone stays consistent and future edits happen in one
// place. Du-Form, warm, kurz, kein Urteil (see onboarding-tone skill). The
// English version keeps the same voice: friendly, short, never judging.
import { CreditCard, Eye, HelpCircle, Home, Plane, Shield, Target, type LucideIcon } from "lucide-react";
import { chf } from "../format";
import type { AvailableResult } from "./calc.ts";
import type { GoalId, Mood } from "./types.ts";

type Lang = "de" | "en";
type Bi = { de: string; en: string };

export const GOALS: { id: GoalId; label: Bi; icon: LucideIcon }[] = [
  { id: "sicherheit", label: { de: "Sicherheit / Notgroschen", en: "Security / rainy-day fund" }, icon: Shield },
  { id: "reise", label: { de: "Reise", en: "Travel" }, icon: Plane },
  { id: "wohnen", label: { de: "Wohnung / Eigentum", en: "Home / property" }, icon: Home },
  { id: "schulden", label: { de: "Schulden loswerden", en: "Get rid of debt" }, icon: CreditCard },
  { id: "ueberblick", label: { de: "Überblick behalten", en: "Keep an overview" }, icon: Eye },
  { id: "sparziel", label: { de: "Sparen für etwas Bestimmtes", en: "Save for something specific" }, icon: Target },
  { id: "unklar", label: { de: "Weiß ich noch nicht", en: "Not sure yet" }, icon: HelpCircle },
];

export const FIXED_COST_CHIPS: { key: string; label: Bi }[] = [
  { key: "miete", label: { de: "Miete", en: "Rent" } },
  { key: "strom", label: { de: "Strom", en: "Electricity" } },
  { key: "internet", label: { de: "Internet/Handy", en: "Internet/phone" } },
  { key: "versicherungen", label: { de: "Versicherungen", en: "Insurance" } },
  { key: "abos", label: { de: "Abos", en: "Subscriptions" } },
  { key: "abzahlungen", label: { de: "Abzahlungen", en: "Instalments" } },
  { key: "transport", label: { de: "Transport", en: "Transport" } },
];

export const MOOD_OPTIONS: { id: Mood; label: Bi }[] = [
  { id: "entspannt", label: { de: "Entspannt", en: "Relaxed" } },
  { id: "geht_so", label: { de: "Geht so", en: "So-so" } },
  { id: "unsicher", label: { de: "Unsicher", en: "Unsure" } },
  { id: "gestresst", label: { de: "Gestresst", en: "Stressed" } },
];

// One next-step recommendation per goal — no product/investment advice,
// just a small, concrete habit to try.
const NEXT_STEP_BY_GOAL: Record<GoalId, Bi> = {
  sicherheit: {
    de: "Leg einen kleinen, festen Betrag für deinen Notgroschen zur Seite — auch 20 pro Monat zählen.",
    en: "Put a small, fixed amount aside for your rainy-day fund — even 20 a month counts.",
  },
  reise: {
    de: "Richte einen eigenen Topf für deine Reise ein und leg jeden Monat einen kleinen Betrag rein.",
    en: "Set up a pot just for your trip and add a small amount every month.",
  },
  wohnen: {
    de: "Fang mit einem separaten Spartopf für die Wohnung an, auch wenn das Ziel noch weit weg ist.",
    en: "Start a separate savings pot for your home, even if the goal still feels far away.",
  },
  schulden: {
    de: "Wähl eine Schuld aus und leg eine kleine, feste Monatsrate dafür fest.",
    en: "Pick one debt and set a small, fixed monthly payment for it.",
  },
  ueberblick: {
    de: "Schau dir einmal die Woche kurz deine Ausgaben an — mehr braucht es fürs Erste nicht.",
    en: "Take a quick look at your spending once a week — that's all you need for now.",
  },
  sparziel: {
    de: "Leg ein Sparziel mit einem groben Zielbetrag an, den Rest verfeinerst du später.",
    en: "Create a savings goal with a rough target amount — you can fine-tune the rest later.",
  },
  unklar: {
    de: "Fang einfach mit einem kleinen Spartopf an — das Ziel darf sich später noch zeigen.",
    en: "Just start with a small savings pot — the goal can show up later.",
  },
};

export function nextStepFor(goals: GoalId[], lang: Lang): string {
  const primary = goals[0] ?? "unklar";
  return NEXT_STEP_BY_GOAL[primary][lang];
}

export function resultHeadline(result: AvailableResult, lang: Lang): { amount: string; sentence: string } {
  const negative = result.kind === "range" ? result.max < 0 : result.amount < 0;

  if (result.kind === "range") {
    const amount = `${chf(result.min)} – ${chf(result.max)}`;
    const sentence = negative
      ? {
          de: "Je nachdem, wie viel reinkommt, wird es gerade eng. Das ist ein guter Startpunkt, um gemeinsam hinzuschauen.",
          en: "Depending on what comes in, things might get tight. That's a good starting point to look at together.",
        }
      : {
          de: "Je nachdem, wie viel reinkommt, bleibt dir ungefähr das pro Monat.",
          en: "Depending on what comes in, this is roughly what's left for you each month.",
        };
    return { amount, sentence: sentence[lang] };
  }

  const amount = chf(result.amount);
  const sentence = negative
    ? {
        de: "Da ist es gerade eng. Das ist ein guter Startpunkt, um gemeinsam hinzuschauen.",
        en: "Things are tight right now. That's a good starting point to look at together.",
      }
    : {
        de: "Nach deinen festen Kosten bleibt dir ungefähr das pro Monat.",
        en: "After your fixed costs, this is roughly what's left for you each month.",
      };
  return { amount, sentence: sentence[lang] };
}

const COPY = {
  de: {
    steps: ["Willkommen", "Ziele", "Einnahmen", "Feste Kosten", "Bauchgefühl", "Ergebnis", "Nächster Schritt"],
    welcome: {
      title: "Hi, schön, dass du da bist.",
      body: "Wir gehen das in Ruhe an. Keine Zahl muss perfekt sein.",
      cta: "Los geht's",
    },
    goals: {
      title: "Was ist dir wichtig?",
      body: "Wähl ein bis drei Dinge, die dir gerade am meisten bedeuten.",
    },
    income: {
      title: "Was landet jeden Monat ungefähr auf deinem Konto?",
      body: "Schätzungen reichen völlig — genauer wird's später.",
      variableToggle: "Mein Einkommen schwankt (z. B. Freelance, Schichtarbeit)",
      addEntry: "+ Weiterer Eintrag",
      feedback: "Gut, das reicht schon.",
      perMonth: "pro Monat.",
      label: "Bezeichnung",
      from: "von",
      to: "bis",
      defaultLabels: ["Gehalt / Hauptverdienst", "Nebenverdienst", "Sonstiges"],
      newEntryLabel: "Weiterer Posten",
    },
    fixedCosts: {
      title: "Was geht jeden Monat automatisch weg?",
      body: "Tipp einfach an, was auf dich zutrifft — alles andere lässt du weg.",
      addCustom: "+ Eigener Posten",
      customPlaceholder: "Eigener Posten",
      together: "Zusammen",
      perMonth: "pro Monat.",
    },
    mood: {
      title: "Wie fühlst du dich gerade bei deinem Geld?",
      body: "Das beeinflusst nur, wie wir mit dir sprechen — mehr nicht.",
    },
    result: {
      title: "Dein erstes Ergebnis",
      stepByStep: "Schritt für Schritt:",
    },
    nextStep: {
      title: "Dein nächster kleiner Schritt",
      doIt: "Machen wir",
      later: "Später",
      done: "Geschafft. Jetzt siehst du, wo du stehst.",
    },
    nav: {
      back: "Zurück",
      next: "Weiter",
      finish: "Fertig",
      skip: "Weiß ich gerade nicht",
    },
    toastDone: "Geschafft — hier ist deine erste Übersicht.",
  },
  en: {
    steps: ["Welcome", "Goals", "Income", "Fixed costs", "Gut feeling", "Result", "Next step"],
    welcome: {
      title: "Hi, great to have you here.",
      body: "We'll take this slowly. No number has to be perfect.",
      cta: "Let's go",
    },
    goals: {
      title: "What matters to you?",
      body: "Pick one to three things that mean the most to you right now.",
    },
    income: {
      title: "Roughly what lands in your account each month?",
      body: "Estimates are fine — we'll get more precise later.",
      variableToggle: "My income varies (e.g. freelance, shift work)",
      addEntry: "+ Another entry",
      feedback: "Good, that's plenty.",
      perMonth: "per month.",
      label: "Label",
      from: "from",
      to: "to",
      defaultLabels: ["Salary / main income", "Side income", "Other"],
      newEntryLabel: "Another item",
    },
    fixedCosts: {
      title: "What leaves your account automatically each month?",
      body: "Just tap what applies to you — leave out the rest.",
      addCustom: "+ Custom item",
      customPlaceholder: "Custom item",
      together: "Together",
      perMonth: "per month.",
    },
    mood: {
      title: "How do you feel about your money right now?",
      body: "This only changes how we talk to you — nothing more.",
    },
    result: {
      title: "Your first result",
      stepByStep: "Step by step:",
    },
    nextStep: {
      title: "Your next small step",
      doIt: "Let's do it",
      later: "Later",
      done: "Done. Now you can see where you stand.",
    },
    nav: {
      back: "Back",
      next: "Next",
      finish: "Finish",
      skip: "Not sure right now",
    },
    toastDone: "Done — here's your first overview.",
  },
} as const;

export function copyFor(lang: Lang) {
  return COPY[lang];
}
