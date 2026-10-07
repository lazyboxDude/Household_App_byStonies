// PARKED: not mounted anywhere right now (see docs/tasks-rethink.html). The text is German only;
// translate it with t("English", "Deutsch") before it goes back on a page.
"use client";

import { Users } from "lucide-react";
import type { LivingMode } from "../types";

// "Wie wohnt ihr?" only changes the starting point of new routines: a WG rotates chores and splits
// bills equally, a couple starts open and unsplit.
export function LivingModeCard({ mode, isAuto, onChange }: { mode: LivingMode; isAuto: boolean; onChange: (m: LivingMode | null) => void }) {
  return (
    <section className="surface p-5">
      <h2 className="text-headline flex items-center gap-2 mb-2"><Users className="w-5 h-5" style={{ color: "var(--accent)" }} /> Wie wohnt ihr?</h2>
      <div className="grid grid-cols-2 gap-2">
        {([["couple", "Als Paar"], ["wg", "In einer WG"]] as const).map(([value, label]) => (
          <button key={value} type="button" className="chip justify-center py-2.5" data-active={mode === value} onClick={() => onChange(value)}>
            {label}
          </button>
        ))}
      </div>
      <p className="text-caption mt-2">
        {mode === "wg"
          ? "Neue Routinen wechseln reihum, Rechnungen teilt ihr gleichmässig auf."
          : "Neue Routinen sind erstmal offen, Rechnungen ohne Aufteilung. Ihr zahlt ja oft vom gemeinsamen Konto."}
        {isAuto ? " Das stellt sich nach der Anzahl Personen ein." : ""}
      </p>
      {!isAuto && (
        <button type="button" className="text-caption underline mt-1" onClick={() => onChange(null)}>
          Wieder automatisch
        </button>
      )}
    </section>
  );
}
