"use client";

import { DoorOpen, ListChecks, Repeat, Users, X } from "lucide-react";
import { useI18n } from "../../context/LanguageContext";

export default function TaskOnboarding({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useI18n();
  const points = [
    {
      icon: ListChecks,
      text: t(
        "Today shows what is due. Tick it off with one tap, or hand it to someone else.",
        "Heute zeigt, was ansteht. Hak es mit einem Tipp ab oder gib es weiter."
      ),
    },
    {
      icon: DoorOpen,
      text: t(
        "Rooms gives the kitchen, the bathroom and the rest their own tasks, with ideas to start from.",
        "Räume gibt Küche, Bad und Co. ihre eigenen Aufgaben, mit Ideen zum Loslegen."
      ),
    },
    {
      icon: Repeat,
      text: t(
        "Anything that comes back, like the trash collection or cleaning, you write down once. It reminds you by itself.",
        "Was wiederkommt, schreibst du nur einmal auf. Es meldet sich von selbst."
      ),
    },
    {
      icon: Users,
      text: t("Everyone in the household sees the same list, live.", "Alle im Haushalt sehen dieselbe Liste, live."),
    },
  ];

  return (
    <div className="surface p-6 mb-6 animate-rise relative">
      <button
        onClick={onDismiss}
        className="press absolute top-4 right-4 text-[var(--text-tertiary)] hover:text-[var(--text)]"
        aria-label={t("Dismiss", "Schliessen")}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
          <ListChecks className="w-6 h-6" style={{ color: "var(--accent)" }} />
        </div>
        <div className="flex-1">
          <h2 className="text-headline mb-1">{t("Welcome to Household Tasks", "Willkommen bei den Haushaltsaufgaben")}</h2>
          <p className="text-body text-[var(--text-secondary)] mb-4">
            {t("The page has three views. Here is what each one is for:", "Die Seite hat drei Ansichten. Wofür jede gut ist:")}
          </p>
          <ul className="space-y-2 mb-4">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
                {text}
              </li>
            ))}
          </ul>
          <button onClick={onDismiss} className="btn btn-primary px-5 py-2">
            {t("Got it", "Verstanden")}
          </button>
        </div>
      </div>
    </div>
  );
}
