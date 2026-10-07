"use client";

import { useState } from "react";
import { useI18n } from "../../../context/LanguageContext";
import { chf } from "../../../expenses/format";
import { parseAmount } from "../formModel";
import { splitShares } from "../settle";
import type { Occurrence, Routine } from "../types";
import type { PayInput } from "../useRoutines";

interface Props {
  routine: Routine;
  occurrence: Occurrence;
  finance: { expensesEnabled: boolean; hasVerteilertopf: boolean };
  members: { id: string; name: string }[];
  userId: string | undefined;
  onConfirm: (input: PayInput) => Promise<boolean>;
  onCancel: () => void;
}

const ACCOUNTS: { value: NonNullable<PayInput["account"]>; en: string; de: string }[] = [
  { value: "bills", en: "Bills", de: "Rechnungen" },
  { value: "joint", en: "Shared household", de: "Gemeinsamer Haushalt" },
  { value: "main", en: "Main account", de: "Hauptkonto" },
  { value: "taxes", en: "Taxes", de: "Steuern" },
];

// Inline "paid" panel under a bill. Paying only closes the bill; the bookings are optional.
export default function PayPanel({ routine, occurrence, finance, members, userId, onConfirm, onCancel }: Props) {
  const { t, lang } = useI18n();
  const planned = occurrence.amount ?? routine.amount;
  const [amountText, setAmountText] = useState(planned != null ? String(planned) : "");
  const [paidBy, setPaidBy] = useState(routine.payerId ?? userId ?? members[0]?.id ?? "");
  const [bookExpense, setBookExpense] = useState(finance.expensesEnabled);
  const [account, setAccount] = useState<PayInput["account"]>(finance.hasVerteilertopf ? "bills" : null);
  const [keepAmount, setKeepAmount] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const amount = parseAmount(amountText);
  const differs = amount !== null && amount !== routine.amount;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === null) {
      setMessage(t("Something is off with the amount, want to take another look?", "Da stimmt was mit dem Betrag nicht, magst du nochmal schauen?"));
      return;
    }
    setSaving(true);
    const ok = await onConfirm({ paidBy, amount, bookExpense: bookExpense && paidBy === userId, account, keepAmount });
    setSaving(false);
    if (!ok) setMessage(t("That didn't work. Try again in a moment.", "Das hat nicht geklappt. Versuch es gleich nochmal."));
  };

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-md)] p-3 space-y-3" style={{ background: "var(--surface-2)" }}>
      <div>
        <label className="text-caption mb-1 block" htmlFor={`pay-${occurrence.id}`}>
          {t("How much was it?", "Wie viel war es?")}{routine.amountKind === "estimate" ? t(" Roughly is fine.", " Ungefähr reicht.") : ""}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`pay-${occurrence.id}`}
            className="field font-mono"
            inputMode="decimal"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            autoFocus
          />
          <span className="text-sm text-[var(--text-secondary)]">CHF</span>
        </div>
      </div>

      {members.length > 1 && (
        <div>
          <label className="text-caption mb-1 block" htmlFor={`by-${occurrence.id}`}>{t("Who paid?", "Wer hat bezahlt?")}</label>
          <select id={`by-${occurrence.id}`} className="field" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {routine.split && amount !== null && (
            <p className="text-caption mt-1">
              {t("Split", "Aufgeteilt")}: {Object.entries(splitShares(amount, routine.split, paidBy))
                .map(([id, share]) => `${members.find((m) => m.id === id)?.name ?? "?"} ${chf(share)}`)
                .join(" · ")}
            </p>
          )}
        </div>
      )}

      {differs && routine.amountKind !== "fixed" && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={keepAmount} onChange={(e) => setKeepAmount(e.target.checked)} />
          {t("Use this amount next time", "Beim nächsten Mal mit diesem Betrag rechnen")}
        </label>
      )}

      {finance.expensesEnabled && (paidBy === userId ? (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={bookExpense} onChange={(e) => setBookExpense(e.target.checked)} />
          {t("Add it to Finances as my expense", "Als meine Ausgabe in Finanzen eintragen")}
        </label>
      ) : (
        <p className="text-caption">{t("In Finances everyone enters their own expenses.", "In Finanzen trägt jede Person ihre Ausgaben selbst ein.")}</p>
      ))}

      {finance.hasVerteilertopf && (
        <div>
          <label className="text-caption mb-1 block" htmlFor={`acc-${occurrence.id}`}>{t("Which account did it come from?", "Von welchem Konto ging es weg?")}</label>
          <select
            id={`acc-${occurrence.id}`}
            className="field"
            value={account ?? ""}
            onChange={(e) => setAccount((e.target.value || null) as PayInput["account"])}
          >
            <option value="">{t("Don't record it anywhere", "Nirgends eintragen")}</option>
            {ACCOUNTS.map((a) => <option key={a.value} value={a.value}>{a[lang]}</option>)}
          </select>
        </div>
      )}

      {message && <p className="text-sm text-[var(--text-secondary)]">{message}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>{t("Cancel", "Abbrechen")}</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{t("Paid", "Bezahlt")}</button>
      </div>
    </form>
  );
}
