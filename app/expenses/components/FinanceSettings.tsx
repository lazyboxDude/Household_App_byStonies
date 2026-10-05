"use client";

import React, { useState } from "react";
import { Settings2 } from "lucide-react";
import { showToast } from "../../../lib/toast";
import { ACCOUNTS } from "../constants";
import { chf, r2 } from "../format";
import { AccountId } from "../types";
import { useVerteilertopf } from "../hooks/useVerteilertopf";
import { useI18n } from "../../context/LanguageContext";

export default function FinanceSettings({ vt }: { vt: ReturnType<typeof useVerteilertopf> }) {
  const { settings, bal, saveSettings, applyBalances } = vt;
  const { t: tr, lang } = useI18n();

  const [setTaxes, setSetTaxes] = useState(String(settings.taxes));
  const [setBills, setSetBills] = useState(String(settings.bills));
  const [setJoint, setSetJoint] = useState(String(settings.joint));
  const [setMin, setSetMin] = useState(String(settings.minBuffer));

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseFloat(setTaxes.replace(",", ".")) || 0;
    const b = parseFloat(setBills.replace(",", ".")) || 0;
    const j = parseFloat(setJoint.replace(",", ".")) || 0;
    const mb = parseFloat(setMin.replace(",", ".")) || 0;
    await saveSettings({ taxes: r2(t), bills: r2(b), joint: r2(j), minBuffer: r2(mb) });
    showToast(tr("Settings saved", "Einstellungen gespeichert"), "success");
  };

  const [balInputs, setBalInputs] = useState<Record<AccountId, string>>(() =>
    Object.fromEntries(ACCOUNTS.map((a) => [a.id, String(bal[a.id])])) as Record<AccountId, string>
  );
  const handleApplyBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = Object.fromEntries(
      ACCOUNTS.map((a) => [a.id, parseFloat((balInputs[a.id] || "0").replace(",", "."))])
    ) as Record<AccountId, number>;
    await applyBalances(entered);
    showToast(tr("Balances applied", "Kontostände übernommen"), "success");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-rise">
      <div className="surface p-4">
        <h3 className="text-headline mb-3 flex items-center gap-2"><Settings2 className="w-4 h-4" /> {tr("Standing orders & buffer", "Daueraufträge & Puffer")}</h3>
        <form onSubmit={handleSaveSettings} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-caption block mb-1">{tr("Taxes / month", "Steuern / Monat")}</label><input value={setTaxes} onChange={(e) => setSetTaxes(e.target.value)} className="field font-mono" /></div>
            <div><label className="text-caption block mb-1">{tr("Bills / month", "Rechnungen / Monat")}</label><input value={setBills} onChange={(e) => setSetBills(e.target.value)} className="field font-mono" /></div>
            <div><label className="text-caption block mb-1">{tr("Shared household / month", "Gemeinsamer Haushalt / Monat")}</label><input value={setJoint} onChange={(e) => setSetJoint(e.target.value)} className="field font-mono" /></div>
            <div><label className="text-caption block mb-1">{tr("Minimum buffer, main account", "Mindestpuffer Hauptkonto")}</label><input value={setMin} onChange={(e) => setSetMin(e.target.value)} className="field font-mono" /></div>
          </div>
          <p className="text-caption">{tr("Total fixed deductions", "Summe Fixabzüge")}: <b className="text-[var(--text)]">{chf(settings.taxes + settings.bills + settings.joint)}</b> {tr("per month. Changes apply to future distributions.", "pro Monat. Änderungen gelten für künftige Verteilungen.")}</p>
          <button type="submit" className="btn btn-primary w-full py-2.5">{tr("Save", "Speichern")}</button>
        </form>
      </div>
      <div className="surface p-4">
        <h3 className="text-headline mb-3">{tr("Reconcile balances", "Kontostände abgleichen")}</h3>
        <p className="text-caption mb-3">{tr("Enter the real balance from your e-banking. The app books the difference as the opening balance.", "Trag den echten Saldo aus dem E-Banking ein. Die App bucht die Differenz als Startsaldo.")}</p>
        <form onSubmit={handleApplyBalances} className="space-y-3">
          {ACCOUNTS.map((a) => (
            <div key={a.id}>
              <label className="text-caption block mb-1">{a.name[lang]}</label>
              <input
                value={balInputs[a.id] ?? ""}
                onChange={(e) => setBalInputs((p) => ({ ...p, [a.id]: e.target.value }))}
                className="field font-mono"
              />
            </div>
          ))}
          <button type="submit" className="btn btn-secondary w-full py-2.5">{tr("Apply balances", "Kontostände übernehmen")}</button>
        </form>
      </div>
    </div>
  );
}
