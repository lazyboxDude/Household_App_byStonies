"use client";

import { useState } from "react";
import { Plane, Trash2, Users } from "lucide-react";
import { absenceDays } from "../rotation";
import type { Absence, LivingMode } from "../types";

function fmt(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-CH", { day: "numeric", month: "numeric", timeZone: "UTC" });
}

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

// "Ich bin vom 10. bis 24. weg": the rotation skips that person, nobody loses a turn.
export function AbsencesCard({
  members,
  absences,
  today,
  userId,
  onAdd,
  onRemove,
}: {
  members: { id: string; name: string }[];
  absences: Absence[];
  today: string;
  userId: string | undefined;
  onAdd: (userId: string, from: string, to: string) => Promise<boolean>;
  onRemove: (id: string) => void;
}) {
  const [who, setWho] = useState(userId ?? members[0]?.id ?? "");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [message, setMessage] = useState<string | null>(null);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "?";
  const upcoming = absences.filter((a) => a.toDate >= today);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!who || !from || !to || from > to) {
      setMessage("Da stimmt was mit den Daten nicht, magst du nochmal schauen?");
      return;
    }
    setMessage(null);
    if (await onAdd(who, from, to)) {
      setFrom(today);
      setTo(today);
    }
  };

  return (
    <section className="surface p-5">
      <h2 className="text-headline flex items-center gap-2 mb-1"><Plane className="w-5 h-5" style={{ color: "var(--accent)" }} /> Wer ist wann weg?</h2>
      <p className="text-caption mb-3">Wer weg ist, wird bei „Reihum“ und „Fair verteilt“ übersprungen. Die anderen verlieren dabei keine Runde.</p>
      {upcoming.length > 0 && (
        <ul className="mb-3 space-y-1">
          {upcoming.map((a) => (
            <li key={a.id} className="group flex items-center justify-between gap-2 text-sm">
              <span>{nameOf(a.userId)} · {fmt(a.fromDate)} bis {fmt(a.toDate)} <span className="text-caption">({absenceDays(a)} {absenceDays(a) === 1 ? "Tag" : "Tage"})</span></span>
              <button type="button" aria-label="Abwesenheit löschen" className="press row-action text-[var(--text-tertiary)] hover:text-[var(--danger)]" onClick={() => onRemove(a.id)}>
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="space-y-2">
        <select aria-label="Wer" className="field" value={who} onChange={(e) => setWho(e.target.value)}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Von" type="date" className="field" value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} />
          <input aria-label="Bis" type="date" className="field" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        {message && <p className="text-sm text-[var(--text-secondary)]">{message}</p>}
        <button type="submit" className="btn btn-secondary btn-sm">Eintragen</button>
      </form>
    </section>
  );
}
