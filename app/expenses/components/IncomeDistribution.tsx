"use client";

import React, { useState } from "react";
import { showToast } from "../../../lib/toast";
import { ACC } from "../constants";
import { chf, fdate, fmt, r2, todayIso } from "../format";
import { useVerteilertopf } from "../hooks/useVerteilertopf";

export default function IncomeDistribution({ vt }: { vt: ReturnType<typeof useVerteilertopf> }) {
  const { settings, bal, ft, dists, alreadyDistributedThisMonth, distributeIncome } = vt;
  const [incomeInput, setIncomeInput] = useState("");
  const [incomeDate, setIncomeDate] = useState(todayIso());

  const incomeVal = parseFloat(incomeInput.replace(",", "."));
  const validIncome = !isNaN(incomeVal) && incomeVal > 0;
  const rest = validIncome ? r2(incomeVal - ft) : 0;
  const afterMain = validIncome ? r2(bal.main + rest) : bal.main;

  const handleDistribute = async () => {
    if (!validIncome) return;
    const ok = await distributeIncome(incomeVal, incomeDate);
    if (ok) {
      setIncomeInput("");
      showToast(`Lohn verteilt: ${chf(incomeVal)}`, "success");
    } else {
      showToast("Lohn verteilen fehlgeschlagen. Bitte erneut versuchen.", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-rise">
      <div className="surface p-4">
        <h3 className="text-headline mb-1">Lohneingang erfassen</h3>
        <p className="text-caption mb-4">Der ganze Lohn landet zuerst auf dem Hauptkonto. Danach gehen die Daueraufträge raus, der Rest bleibt als Puffer.</p>
        <div className="space-y-3">
          <div>
            <label className="text-caption block mb-1">Lohn diesen Monat (CHF)</label>
            <input
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              inputMode="decimal"
              placeholder="z. B. 4200"
              className="field text-2xl font-mono py-3"
            />
          </div>
          <div>
            <label className="text-caption block mb-1">Datum Lohneingang</label>
            <input type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} className="field w-auto" />
          </div>
          {alreadyDistributedThisMonth && (
            <div className="text-xs p-2 rounded-[var(--radius-sm)]" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
              Diesen Monat wurde bereits verteilt. Ein zweiter Lohn würde die Daueraufträge erneut abziehen.
            </div>
          )}
          {validIncome && (
            <div className="surface-2 p-3 space-y-1 text-sm animate-scale-in">
              <div className="flex justify-between"><span>Lohneingang Hauptkonto</span><span className="font-mono" style={{ color: "var(--success)" }}>{chf(incomeVal, true)}</span></div>
              {(["taxes", "bills", "joint"] as const).map((id) => (
                <div key={id} className="flex justify-between"><span>→ {ACC[id].name}</span><span className="font-mono">{chf(-settings[id])}</span></div>
              ))}
              <div className="flex justify-between font-semibold border-t divider pt-1">
                <span>{rest >= 0 ? "Bleibt als Puffer" : "Puffer schrumpft um"}</span>
                <span className="font-mono" style={{ color: rest >= 0 ? "var(--success)" : "var(--danger)" }}>{chf(rest, true)}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Hauptkonto danach</span><span className="font-mono">{chf(afterMain)}</span></div>
              {rest < 0 && <div className="text-xs pt-1" style={{ color: "var(--danger)" }}>Der Lohn deckt die Fixabzüge nicht. Fehlbetrag {chf(-rest)} kommt aus dem Puffer.</div>}
            </div>
          )}
          <button onClick={handleDistribute} disabled={!validIncome} className="btn btn-primary w-full py-2.5">
            Lohn verteilen
          </button>
        </div>
      </div>
      <div className="surface p-4">
        <h3 className="text-headline mb-3">Lohnverlauf</h3>
        {dists.length === 0 && <p className="text-caption">Noch kein Lohn verteilt.</p>}
        <div className="space-y-2">
          {dists.slice(0, 12).map((d) => (
            <div key={d.id} className="flex items-center gap-3 text-sm">
              <span className="w-16 text-xs text-[var(--text-secondary)] font-mono">{fdate(d.date).slice(0, 6)}</span>
              <div className="flex-1 h-2 rounded bg-[var(--surface-2)] overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.min(100, (d.amount / Math.max(...dists.map((x) => x.amount), 1)) * 100)}%`,
                    background: d.amount < ft ? "var(--warning)" : "var(--success)",
                    transition: "width var(--dur-slow) var(--ease-spring)",
                  }}
                />
              </div>
              <span className="w-20 text-right font-mono text-xs">{fmt(d.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
