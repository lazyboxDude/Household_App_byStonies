// Centralized microcopy for the money onboarding — every screen imports its
// text from here so tone stays consistent and future edits happen in one
// place. Du-Form, warm, kurz, kein Urteil (see onboarding-tone skill).
import { CreditCard, Eye, HelpCircle, Home, Plane, Shield, Target, type LucideIcon } from "lucide-react";
import { chf } from "../format";
import type { AvailableResult } from "./calc.ts";
import type { GoalId, Mood } from "./types.ts";

export const GOALS: { id: GoalId; label: string; icon: LucideIcon }[] = [
  { id: "sicherheit", label: "Sicherheit / Notgroschen", icon: Shield },
  { id: "reise", label: "Reise", icon: Plane },
  { id: "wohnen", label: "Wohnung / Eigentum", icon: Home },
  { id: "schulden", label: "Schulden loswerden", icon: CreditCard },
  { id: "ueberblick", label: "Überblick behalten", icon: Eye },
  { id: "sparziel", label: "Sparen für etwas Bestimmtes", icon: Target },
  { id: "unklar", label: "Weiß ich noch nicht", icon: HelpCircle },
];

export const FIXED_COST_CHIPS: { key: string; label: string }[] = [
  { key: "miete", label: "Miete" },
  { key: "strom", label: "Strom" },
  { key: "internet", label: "Internet/Handy" },
  { key: "versicherungen", label: "Versicherungen" },
  { key: "abos", label: "Abos" },
  { key: "abzahlungen", label: "Abzahlungen" },
  { key: "transport", label: "Transport" },
];

export const MOOD_OPTIONS: { id: Mood; label: string }[] = [
  { id: "entspannt", label: "Entspannt" },
  { id: "geht_so", label: "Geht so" },
  { id: "unsicher", label: "Unsicher" },
  { id: "gestresst", label: "Gestresst" },
];

// One next-step recommendation per goal — no product/investment advice,
// just a small, concrete habit to try.
const NEXT_STEP_BY_GOAL: Record<GoalId, string> = {
  sicherheit: "Leg einen kleinen, festen Betrag für deinen Notgroschen zur Seite — auch 20 pro Monat zählen.",
  reise: "Richte einen eigenen Topf für deine Reise ein und leg jeden Monat einen kleinen Betrag rein.",
  wohnen: "Fang mit einem separaten Spartopf für die Wohnung an, auch wenn das Ziel noch weit weg ist.",
  schulden: "Wähl eine Schuld aus und leg eine kleine, feste Monatsrate dafür fest.",
  ueberblick: "Schau dir einmal die Woche kurz deine Ausgaben an — mehr braucht es fürs Erste nicht.",
  sparziel: "Leg ein Sparziel mit einem groben Zielbetrag an, den Rest verfeinerst du später.",
  unklar: "Fang einfach mit einem kleinen Spartopf an — das Ziel darf sich später noch zeigen.",
};

export function nextStepFor(goals: GoalId[]): string {
  const primary = goals[0] ?? "unklar";
  return NEXT_STEP_BY_GOAL[primary];
}

export function resultHeadline(result: AvailableResult): { amount: string; sentence: string } {
  const negative = result.kind === "range" ? result.max < 0 : result.amount < 0;

  if (result.kind === "range") {
    const amount = `${chf(result.min)} – ${chf(result.max)}`;
    const sentence = negative
      ? "Je nachdem, wie viel reinkommt, wird es gerade eng. Das ist ein guter Startpunkt, um gemeinsam hinzuschauen."
      : "Je nachdem, wie viel reinkommt, bleibt dir ungefähr das pro Monat.";
    return { amount, sentence };
  }

  const amount = chf(result.amount);
  const sentence = negative
    ? "Da ist es gerade eng. Das ist ein guter Startpunkt, um gemeinsam hinzuschauen."
    : "Nach deinen festen Kosten bleibt dir ungefähr das pro Monat.";
  return { amount, sentence };
}

export const T = {
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
  },
  fixedCosts: {
    title: "Was geht jeden Monat automatisch weg?",
    body: "Tipp einfach an, was auf dich zutrifft — alles andere lässt du weg.",
    addCustom: "+ Eigener Posten",
  },
  mood: {
    title: "Wie fühlst du dich gerade bei deinem Geld?",
    body: "Das beeinflusst nur, wie wir mit dir sprechen — mehr nicht.",
  },
  result: {
    title: "Dein erstes Ergebnis",
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
} as const;
