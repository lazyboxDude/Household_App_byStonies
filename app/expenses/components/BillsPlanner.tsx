"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TrendingUp, Trash2, Pencil, Repeat } from "lucide-react";
import { showToast } from "../../../lib/toast";
import { monthNames, monthShort } from "../constants";
import { useI18n } from "../../context/LanguageContext";
import { chf, fmt } from "../format";
import { IrregularBill } from "../types";
import { useVerteilertopf, ProjectionMonth, monthlySoll } from "../hooks/useVerteilertopf";

export default function BillsPlanner({ vt }: { vt: ReturnType<typeof useVerteilertopf> }) {
  const { settings, bal, bills, routineBills, soll, proj, minP, submitBill, deleteBill } = vt;
  const { t: tr, lang } = useI18n();
  const MON = monthNames(lang);
  const MS = monthShort(lang);
  const msoll = monthlySoll([...bills, ...routineBills]);

  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billMonths, setBillMonths] = useState<number[]>([]);
  const [editBillId, setEditBillId] = useState<string | null>(null);
  const [confirmDeleteBill, setConfirmDeleteBill] = useState<string | null>(null);

  const resetBillForm = () => {
    setBillName(""); setBillAmount(""); setBillMonths([]); setEditBillId(null);
  };
  const startEditBill = (b: IrregularBill) => {
    setEditBillId(b.id); setBillName(b.name); setBillAmount(String(b.amount)); setBillMonths(b.months);
  };
  const toggleMonth = (m: number) => {
    setBillMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, c) => a - c)));
  };
  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(billAmount.replace(",", "."));
    if (!billName.trim() || isNaN(amt) || billMonths.length === 0) {
      showToast(tr("Please enter a name, an amount and at least one month", "Bitte Name, Betrag und mindestens einen Monat angeben"), "error");
      return;
    }
    const ok = await submitBill({ name: billName.trim(), amount: amt, months: billMonths }, editBillId);
    if (ok) showToast(editBillId ? tr("Bill updated", "Rechnung aktualisiert") : tr("Bill added", "Rechnung hinzugefügt"), "success");
    resetBillForm();
  };
  const handleDeleteBill = async (id: string) => {
    setConfirmDeleteBill(null);
    if (editBillId === id) resetBillForm();
    await deleteBill(id);
  };

  return (
    <div className="space-y-6 animate-rise">
      <div className="surface p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-headline">{tr("Bills account: target vs. actual", "Rechnungen-Konto: Soll vs. Ist")}</h3>
          <span className="text-caption">{tr("Standing order", "Dauerauftrag")} {chf(settings.bills)} / {tr("month", "Monat")}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="surface-2 p-3"><div className="text-caption">{tr("Actual balance", "Ist-Stand")}</div><div className="font-mono font-medium">{fmt(bal.bills)}</div></div>
          <div className="surface-2 p-3"><div className="text-caption">{tr("Target balance today", "Soll-Stand heute")}</div><div className="font-mono font-medium">{fmt(soll)}</div></div>
          <div className="surface-2 p-3"><div className="text-caption">{tr("Needed per month", "Nötig pro Monat")}</div><div className="font-mono font-medium">{fmt(msoll)}</div></div>
          <div className="surface-2 p-3">
            <div className="text-caption">{tr("Standing order − target", "Dauerauftrag − Soll")}</div>
            <div className="font-mono font-medium" style={{ color: settings.bills - msoll >= 0 ? "var(--success)" : "var(--danger)" }}>
              {settings.bills - msoll >= 0 ? "+" : ""}{fmt(settings.bills - msoll)}
            </div>
          </div>
        </div>
      </div>

      <div className="surface p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-headline flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {tr("Forecast for the next 12 months", "Prognose nächste 12 Monate")}</h3>
          {minP && (minP.bal < 0
            ? <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{tr(`Shortfall in ${MON[minP.m - 1]}`, `Engpass im ${MON[minP.m - 1]}`)}</span>
            : <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--success-soft)", color: "var(--success)" }}>{tr("All bills covered", "Alle Rechnungen gedeckt")}</span>)}
        </div>
        <ForecastChart proj={proj} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="surface p-4">
          <h3 className="text-headline mb-3">{tr("Irregular bills", "Unregelmässige Rechnungen")}</h3>
          {bills.length === 0 && (
            <p className="text-caption">
              {routineBills.length > 0
                ? tr("Nothing recorded here yet. Your bills from Routines are shown on the right.", "Hier ist noch nichts erfasst. Deine Rechnungen aus den Routinen siehst du rechts.")
                : tr("No bills recorded yet.", "Noch keine Rechnungen erfasst.")}
            </p>
          )}
          <div className="space-y-2">
            {bills.map((b) => (
              <div key={b.id} className="flex items-center justify-between border-t divider pt-2 first:border-0 first:pt-0 text-sm">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{b.months.map((m) => MS[m - 1]).join(", ")} · {chf(b.amount)}/{tr("due date", "Fälligkeit")} · {chf(b.amount * b.months.length)}/{tr("year", "Jahr")}</div>
                </div>
                {confirmDeleteBill === b.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => handleDeleteBill(b.id)} className="btn btn-danger btn-sm">{tr("Delete", "Löschen")}</button>
                    <button onClick={() => setConfirmDeleteBill(null)} className="btn btn-secondary btn-sm">{tr("Cancel", "Abbrechen")}</button>
                  </div>
                ) : (
                  <div className="flex gap-2 text-[var(--text-tertiary)]">
                    <button onClick={() => startEditBill(b)} title={tr("Edit", "Bearbeiten")} aria-label={tr("Edit", "Bearbeiten")} className="press"><Pencil className="w-4 h-4 hover:text-blue-500" /></button>
                    <button onClick={() => setConfirmDeleteBill(b.id)} title={tr("Delete", "Löschen")} aria-label={tr("Delete", "Löschen")} className="press"><Trash2 className="w-4 h-4 hover:text-[var(--danger)]" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
        {routineBills.length > 0 && (
          <div className="surface p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-headline flex items-center gap-2"><Repeat className="w-4 h-4" /> Aus Routinen</h3>
              <Link href="/tasks" className="text-caption underline">Bearbeiten</Link>
            </div>
            <div className="space-y-2">
              {routineBills.map((b) => (
                <div key={b.id} className="border-t divider pt-2 first:border-0 first:pt-0 text-sm">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{b.months.length === 12 ? "Jeden Monat" : b.months.map((m) => MS[m - 1]).join(", ")} · {chf(b.amount)}/Fälligkeit · {chf(b.amount * b.months.length)}/Jahr</div>
                </div>
              ))}
            </div>
            <p className="text-caption mt-3">Diese Rechnungen pflegst du bei den Routinen. Hier fliessen sie in die Prognose ein.</p>
          </div>
        )}
        <div className="surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-headline">{editBillId ? tr("Edit bill", "Rechnung bearbeiten") : tr("Add bill", "Rechnung hinzufügen")}</h3>
            {editBillId && <button onClick={resetBillForm} className="press text-xs text-[var(--text-secondary)] underline">{tr("Cancel", "Abbrechen")}</button>}
          </div>
          <form onSubmit={handleSubmitBill} className="space-y-3">
            <input value={billName} onChange={(e) => setBillName(e.target.value)} placeholder={tr("e.g. Health insurance", "z. B. Krankenkasse")} className="field" />
            <input value={billAmount} onChange={(e) => setBillAmount(e.target.value)} inputMode="decimal" placeholder={tr("Amount per due date (CHF)", "Betrag pro Fälligkeit (CHF)")} className="field font-mono" />
            <div>
              <label className="text-caption block mb-1">{tr("Due in month (several possible)", "Fällig im Monat (mehrere möglich)")}</label>
              <div className="grid grid-cols-6 gap-1">
                {MS.map((m, i) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => toggleMonth(i + 1)}
                    className="press text-xs py-1 rounded-[var(--radius-sm)] border transition-colors duration-300"
                    style={
                      billMonths.includes(i + 1)
                        ? { background: "#2563eb", color: "white", borderColor: "#2563eb" }
                        : { borderColor: "var(--border)", color: "var(--text-secondary)" }
                    }
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full py-2.5">{editBillId ? tr("Save changes", "Änderungen speichern") : tr("Add bill", "Rechnung hinzufügen")}</button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}

function niceStep(range: number) {
  const p = Math.pow(10, Math.floor(Math.log10(range || 1)));
  const n = range / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function ForecastChart({ proj }: { proj: ProjectionMonth[] }) {
  const { t: tr, lang } = useI18n();
  const MON = monthNames(lang);
  const MS = monthShort(lang);
  const W = 720, H = 220, L = 56, R = 10, T = 16, B = 34, iw = W - L - R, ih = H - T - B;
  const vals = proj.map((p) => p.bal);
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  const step = niceStep((hi - lo) / 4 || 1000);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  if (hi === lo) hi = lo + step;
  const y = (v: number) => T + ih - ((v - lo) / (hi - lo)) * ih;
  const bw = iw / (proj.length || 1);
  const gridLines: React.ReactNode[] = [];
  for (let v = lo; v <= hi + 1e-6; v += step) {
    gridLines.push(
      <React.Fragment key={v}>
        <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
        <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.6}>{fmt(v).replace(".00", "")}</text>
      </React.Fragment>
    );
  }
  return (
    <div className="overflow-x-auto text-[var(--text-secondary)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[560px] w-full h-auto" role="img" aria-label={tr("Forecast of the bills account balance", "Prognose Kontostand Rechnungen")}>
        {gridLines}
        <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.5} />
        {proj.map((p, i) => {
          const x = L + i * bw + bw * 0.18, w = bw * 0.64, y0 = y(0), yv = y(p.bal);
          const top = Math.min(y0, yv), h = Math.max(1, Math.abs(yv - y0));
          const col = p.bal < 0 ? "#dc2626" : "#2563eb";
          const isDec = p.m === 12;
          return (
            <g key={i}>
              <rect x={x} y={top} width={w} height={h} rx={3} fill={col} fillOpacity={isDec || p.bal < 0 ? 1 : 0.55}
                style={{ transition: "height var(--dur-slow) var(--ease-spring), y var(--dur-slow) var(--ease-spring)" }}>
                <title>{MON[p.m - 1]} {p.y}: {chf(p.bal)}{p.pay ? ` · ${tr("Payments", "Zahlungen")} ${chf(-p.pay)} (${p.due.map((d) => d.name).join(", ")})` : ""}</title>
              </rect>
              {p.pay > 0 && <circle cx={x + w / 2} cy={H - B + 22} r={3} fill="var(--warning)" />}
              <text x={x + w / 2} y={H - B + 13} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={isDec ? 1 : 0.6}>{MS[p.m - 1]}</text>
            </g>
          );
        })}
      </svg>
      <div className="text-caption mt-1">{tr("● Month with a bill due · Bars = balance at end of month", "● Monat mit fälliger Rechnung · Balken = Kontostand Ende Monat")}</div>
    </div>
  );
}
