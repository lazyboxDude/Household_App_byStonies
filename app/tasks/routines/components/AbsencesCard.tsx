"use client";

import { useState } from "react";
import { Plane, Trash2 } from "lucide-react";
import { useI18n } from "../../../context/LanguageContext";
import { localeOf } from "../i18n";
import { absenceDays } from "../rotation";
import type { Absence } from "../types";

// "Ich bin vom 10. bis 24. weg": whoever takes turns skips that person, nobody loses a round.
export default function AbsencesCard({
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
  const { t, lang } = useI18n();
  const [who, setWho] = useState(userId ?? members[0]?.id ?? "");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [message, setMessage] = useState<string | null>(null);
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "?";
  const upcoming = absences.filter((a) => a.toDate >= today);
  const fmt = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(localeOf(lang), { day: "numeric", month: "numeric", timeZone: "UTC" });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!who || !from || !to || from > to) {
      setMessage(t("Something is off with the dates, want to take another look?", "Da stimmt was mit den Daten nicht, magst du nochmal schauen?"));
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
      <h2 className="text-headline flex items-center gap-2 mb-1">
        <Plane className="w-5 h-5" style={{ color: "var(--accent)" }} /> {t("Who is away when?", "Wer ist wann weg?")}
      </h2>
      <p className="text-caption mb-3">
        {t(
          "Whoever is away is skipped when tasks take turns. Nobody else loses a round.",
          "Wer weg ist, wird bei „Abwechselnd“ übersprungen. Die anderen verlieren dabei keine Runde."
        )}
      </p>
      {upcoming.length > 0 && (
        <ul className="mb-3 space-y-1">
          {upcoming.map((a) => {
            const days = absenceDays(a);
            return (
              <li key={a.id} className="group flex items-center justify-between gap-2 text-sm">
                <span>
                  {nameOf(a.userId)} · {lang === "de" ? `${fmt(a.fromDate)} bis ${fmt(a.toDate)}` : `${fmt(a.fromDate)} to ${fmt(a.toDate)}`}{" "}
                  <span className="text-caption">({lang === "de" ? `${days} ${days === 1 ? "Tag" : "Tage"}` : `${days} ${days === 1 ? "day" : "days"}`})</span>
                </span>
                <button
                  type="button"
                  aria-label={t("Delete absence", "Abwesenheit löschen")}
                  className="press row-action text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                  onClick={() => onRemove(a.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={add} className="space-y-2">
        <select aria-label={t("Who", "Wer")} className="field" value={who} onChange={(e) => setWho(e.target.value)}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label={t("From", "Von")} type="date" className="field" value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} />
          <input aria-label={t("To", "Bis")} type="date" className="field" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        {message && <p className="text-sm text-[var(--text-secondary)]">{message}</p>}
        <button type="submit" className="btn btn-secondary btn-sm">{t("Save", "Eintragen")}</button>
      </form>
    </section>
  );
}
