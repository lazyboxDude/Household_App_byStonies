// PARKED: not mounted anywhere right now (see docs/tasks-rethink.html). The text is German only;
// translate it with t("English", "Deutsch") before it goes back on a page.
"use client";

import { useState } from "react";
import { Scale, Handshake } from "lucide-react";
import { chf } from "../../../expenses/format";
import type { Fairness } from "../fairness";
import type { Payback } from "../settle";

// The Fairness-Waage: a calm look at who carried how much lately. No ranking, no points.
export function FairnessCard({
  fairness,
  nameOf,
  weights,
  memberIds,
  onSaveWeights,
}: {
  fairness: Fairness;
  nameOf: (id: string) => string;
  weights: Record<string, number> | null;
  memberIds: string[];
  onSaveWeights: (weights: Record<string, number> | null) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const startEdit = () => {
    setDraft(Object.fromEntries(fairness.rows.map((r) => [r.userId, String(Math.round(r.target))])));
    setMessage(null);
    setEditing(true);
  };
  const save = async () => {
    const parsed = Object.fromEntries(memberIds.map((id) => [id, Number((draft[id] ?? "").replace(",", "."))]));
    const total = Object.values(parsed).reduce((a, b) => a + b, 0);
    if (Object.values(parsed).some((v) => !Number.isFinite(v) || v < 0) || Math.abs(total - 100) > 0.01) {
      setMessage(`Die Anteile ergeben zusammen ${Number.isFinite(total) ? total : "?"}. Es sollten 100 sein.`);
      return;
    }
    if (await onSaveWeights(parsed)) setEditing(false);
  };

  return (
    <section className="surface p-5">
      <h2 className="text-headline flex items-center gap-2 mb-1"><Scale className="w-5 h-5" style={{ color: "var(--accent)" }} /> Wer hat zuletzt was übernommen?</h2>
      <p className="text-caption mb-3">Die letzten 30 Tage, nach Aufwand gerechnet. Der Strich zeigt euren Wunsch-Anteil.</p>

      {fairness.total === 0 ? (
        <p className="text-caption">Sobald ihr etwas abgehakt habt, seht ihr hier die Verteilung.</p>
      ) : (
        <div className="space-y-3">
          {fairness.rows.map((r) => (
            <div key={r.userId}>
              <div className="flex justify-between text-sm mb-1">
                <span>{nameOf(r.userId)}</span>
                <span className="font-mono">{Math.round(r.share)} %</span>
              </div>
              <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }} role="img" aria-label={`${nameOf(r.userId)}: ${Math.round(r.share)} Prozent, Wunsch ${Math.round(r.target)} Prozent`}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.share)}%`, background: "var(--accent)" }} />
                <div className="absolute top-0 h-full w-0.5" style={{ left: `${Math.min(100, r.target)}%`, background: "var(--text)" }} />
              </div>
            </div>
          ))}
          <p className="text-sm">
            {fairness.balanced
              ? "Das ist gerade ziemlich ausgeglichen."
              : `${nameOf(fairness.mostLoaded!)} hat zuletzt etwas mehr übernommen.`}
          </p>
        </div>
      )}

      {editing ? (
        <div className="mt-4 space-y-2">
          <div className="text-caption">Wunsch-Anteil in Prozent (zum Beispiel 40 und 60, wenn jemand weniger arbeitet)</div>
          {memberIds.map((id) => (
            <div key={id} className="flex items-center gap-2">
              <span className="text-sm w-28 truncate">{nameOf(id)}</span>
              <input
                className="field w-24 font-mono"
                inputMode="decimal"
                aria-label={`Anteil ${nameOf(id)}`}
                value={draft[id] ?? ""}
                onChange={(e) => setDraft({ ...draft, [id]: e.target.value })}
              />
              <span className="text-sm text-[var(--text-secondary)]">%</span>
            </div>
          ))}
          {message && <p className="text-sm text-[var(--text-secondary)]">{message}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={save}>Speichern</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Abbrechen</button>
            {weights && <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { if (await onSaveWeights(null)) setEditing(false); }}>Alle gleich</button>}
          </div>
        </div>
      ) : (
        <button type="button" className="text-caption underline mt-3" onClick={startEdit}>Anteile anpassen</button>
      )}
    </section>
  );
}

// "Wer schuldet wem": what the splits of paid bills add up to, minus what was already paid back.
export function SettleUpCard({
  transfers,
  nameOf,
  onSettle,
}: {
  transfers: Payback[];
  nameOf: (id: string) => string;
  onSettle: (t: Payback) => Promise<boolean>;
}) {
  return (
    <section className="surface p-5">
      <h2 className="text-headline flex items-center gap-2 mb-1"><Handshake className="w-5 h-5" style={{ color: "var(--accent)" }} /> Wer schuldet wem?</h2>
      <p className="text-caption mb-3">Aus den aufgeteilten Rechnungen, die schon bezahlt sind.</p>
      {transfers.length === 0 ? (
        <p className="text-sm">Gerade ist alles ausgeglichen.</p>
      ) : (
        <ul className="space-y-2">
          {transfers.map((t) => (
            <li key={`${t.from}-${t.to}`} className="flex items-center justify-between gap-2 text-sm">
              <span>{nameOf(t.from)} schuldet {nameOf(t.to)} <span className="font-mono">{chf(t.amount)}</span></span>
              <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={() => onSettle(t)}>Ausgeglichen</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
