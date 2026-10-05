"use client";

import React, { useState } from "react";
import { showToast } from "../../../lib/toast";
import { fmt } from "../format";
import { useI18n } from "../../context/LanguageContext";
import { useDebts } from "../hooks/useDebts";

export default function Debts({ debts: d }: { debts: ReturnType<typeof useDebts> }) {
  const { debts, createDebt, recordPayment, editDebt, deleteDebt } = d;
  const { t: tr } = useI18n();

  const handleEditDebt = async (id: string) => {
    const debt = debts.find((x) => x.id === id);
    if (!debt) return;
    const newName = window.prompt(tr("Edit name", "Namen bearbeiten"), debt.name);
    if (newName === null) return;
    const newTotalRaw = window.prompt(tr("Edit total amount", "Gesamtbetrag bearbeiten"), String(debt.total));
    if (newTotalRaw === null) return;
    const newTotal = parseFloat(newTotalRaw.replace(",", "."));
    if (isNaN(newTotal)) return showToast(tr("Invalid amount", "Ungültiger Betrag"), "error");
    const newPaymentRaw = window.prompt(tr("Edit monthly payment", "Monatliche Rate bearbeiten"), String(debt.monthlyPayment));
    if (newPaymentRaw === null) return;
    const newPayment = parseFloat(newPaymentRaw.replace(",", "."));
    if (isNaN(newPayment)) return showToast(tr("Invalid amount", "Ungültiger Betrag"), "error");
    await editDebt(id, newName, newTotal, newPayment);
  };

  const handleDeleteDebt = async (id: string, name: string) => {
    if (!window.confirm(tr(`Really delete "${name}"?`, `«${name}» wirklich löschen?`))) return;
    await deleteDebt(id);
  };

  return (
    <div className="surface p-4 animate-rise">
      <h2 className="text-headline mb-3">{tr("Debts", "Schulden")}</h2>
      <CreateDebtForm onCreate={createDebt} />
      <div className="space-y-3 mt-3">
        {debts.length === 0 && <p className="text-caption">{tr("No debts recorded — add them here to keep an overview.", "Keine Schulden erfasst — trag sie hier ein, um den Überblick zu behalten.")}</p>}
        {debts.map((debt) => {
          const paid = debt.total - debt.remaining;
          const pct = debt.total > 0 ? Math.min(100, Math.round((paid / debt.total) * 100)) : 0;
          const isShared = debt.ownerUserId === null;
          const isPaidOff = debt.remaining <= 0;
          return (
            <div key={debt.id} className="surface-2 p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    {debt.name}
                    <span
                      className="text-micro normal-case px-1.5 py-0.5 rounded-full"
                      style={
                        isShared
                          ? { background: "var(--accent-soft)", color: "var(--accent)" }
                          : { background: "var(--surface-3)", color: "var(--text-tertiary)" }
                      }
                    >
                      {isShared ? tr("Shared", "Gemeinsam") : tr("Private", "Privat")}
                    </span>
                    {isPaidOff && (
                      <span className="text-micro normal-case px-1.5 py-0.5 rounded-full" style={{ background: "var(--success-soft)", color: "var(--success)" }}>
                        {tr("Paid off", "Abbezahlt")}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {tr(`${fmt(debt.remaining)} of ${fmt(debt.total)} CHF open`, `${fmt(debt.remaining)} von ${fmt(debt.total)} CHF offen`)} · {fmt(debt.monthlyPayment)} CHF/{tr("mo.", "Mt.")}
                  </div>
                </div>
                <div className="text-sm font-medium">{pct}%</div>
              </div>
              <div className="w-full bg-[var(--surface-3)] h-2 rounded mt-2 overflow-hidden">
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: isPaidOff ? "var(--success)" : "#f97316",
                    transition: "width var(--dur-slow) var(--ease-spring)",
                  }}
                />
              </div>
              {!isPaidOff && (
                <div className="mt-3 flex gap-2">
                  <input type="number" placeholder={tr("Amount", "Betrag")} id={`pay-${debt.id}`} className="field w-32 py-1.5 text-sm" />
                  <button
                    onClick={() => {
                      const el = document.getElementById(`pay-${debt.id}`) as HTMLInputElement | null;
                      if (!el || !el.value) return;
                      const amt = parseFloat(el.value.replace(",", "."));
                      if (isNaN(amt)) return;
                      recordPayment(debt.id, amt);
                      el.value = "";
                    }}
                    className="btn btn-sm"
                    style={{ background: "var(--success)", color: "white" }}
                  >
                    {tr("Record payment", "Zahlung erfassen")}
                  </button>
                  <button onClick={() => handleEditDebt(debt.id)} className="btn btn-sm" style={{ background: "#2563eb", color: "white" }}>
                    {tr("Edit", "Bearbeiten")}
                  </button>
                  <button onClick={() => handleDeleteDebt(debt.id, debt.name)} className="btn btn-sm btn-danger">
                    {tr("Delete", "Löschen")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CreateDebtForm({
  onCreate,
}: {
  onCreate: (name: string, total: number, monthlyPayment: number, shared: boolean) => void;
}) {
  const { t: tr } = useI18n();
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [shared, setShared] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Name of the debt", "Name der Schuld")} className="field" />
        <input value={total} onChange={(e) => setTotal(e.target.value)} placeholder={tr("Total amount", "Gesamtbetrag")} className="field w-36" />
        <input value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} placeholder={tr("Payment / month", "Rate / Monat")} className="field w-32" />
        <button
          onClick={() => {
            const t = parseFloat(total.replace(",", "."));
            const mp = parseFloat((monthlyPayment || "0").replace(",", "."));
            if (!name || isNaN(t)) return;
            onCreate(name, t, isNaN(mp) ? 0 : mp, shared);
            setName("");
            setTotal("");
            setMonthlyPayment("");
            setShared(false);
          }}
          className="btn btn-primary"
        >
          {tr("Create", "Anlegen")}
        </button>
      </div>
      <label className="flex items-center gap-2 text-caption cursor-pointer w-fit">
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
        {tr("Share with household (joint debt) — leave off to keep it private", "Mit Haushalt teilen (gemeinsame Schuld) — aus lässt es privat")}
      </label>
    </div>
  );
}
