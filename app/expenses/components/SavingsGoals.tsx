"use client";

import React, { useState } from "react";
import { showToast } from "../../../lib/toast";
import { fmt } from "../format";
import { useI18n } from "../../context/LanguageContext";
import { usePots } from "../hooks/usePots";

export default function SavingsGoals({ pots: p }: { pots: ReturnType<typeof usePots> }) {
  const { pots, createPot, addToPot, editPot } = p;
  const { t: tr } = useI18n();

  const handleEditPot = async (id: string) => {
    const pot = pots.find((x) => x.id === id);
    if (!pot) return;
    const newName = window.prompt(tr("Edit name", "Namen bearbeiten"), pot.name);
    if (newName === null) return;
    const newTargetRaw = window.prompt(tr("Edit target amount", "Zielbetrag bearbeiten"), String(pot.target));
    if (newTargetRaw === null) return;
    const newTarget = parseFloat(newTargetRaw.replace(",", "."));
    if (isNaN(newTarget)) return showToast(tr("Invalid amount", "Ungültiger Betrag"), "error");
    await editPot(id, newName, newTarget);
  };

  return (
    <div className="surface p-4 animate-rise">
      <h2 className="text-headline mb-3">{tr("Savings goals", "Sparziele")}</h2>
      <CreatePotForm onCreate={createPot} />
      <div className="space-y-3 mt-3">
        {pots.length === 0 && <p className="text-caption">{tr("No savings goals yet — create one to save for something special.", "Noch keine Sparziele — leg eins an, um für etwas Besonderes zu sparen.")}</p>}
        {pots.map((p) => {
          const pct = p.target > 0 ? Math.min(100, Math.round((p.saved / p.target) * 100)) : 0;
          const isShared = p.ownerUserId === null;
          return (
            <div key={p.id} className="surface-2 p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    {p.name}
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
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">{tr(`${fmt(p.saved)} of ${fmt(p.target)} CHF`, `${fmt(p.saved)} von ${fmt(p.target)} CHF`)}</div>
                </div>
                <div className="text-sm font-medium">{pct}%</div>
              </div>
              <div className="w-full bg-[var(--surface-3)] h-2 rounded mt-2 overflow-hidden">
                <div style={{ width: `${pct}%`, height: "100%", background: pct > 80 ? "#3b82f6" : "#93c5fd", transition: "width var(--dur-slow) var(--ease-spring)" }} />
              </div>
              <div className="mt-3 flex gap-2">
                <input type="number" placeholder={tr("Amount", "Betrag")} id={`add-to-${p.id}`} className="field w-32 py-1.5 text-sm" />
                <button
                  onClick={() => {
                    const el = document.getElementById(`add-to-${p.id}`) as HTMLInputElement | null;
                    if (!el || !el.value) return;
                    const amt = parseFloat(el.value.replace(",", "."));
                    if (isNaN(amt)) return;
                    addToPot(p.id, amt);
                    el.value = "";
                  }}
                  className="btn btn-sm"
                  style={{ background: "var(--success)", color: "white" }}
                >
                  {tr("Deposit", "Einzahlen")}
                </button>
                <button onClick={() => handleEditPot(p.id)} className="btn btn-sm" style={{ background: "#2563eb", color: "white" }}>{tr("Edit", "Bearbeiten")}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreatePotForm({ onCreate }: { onCreate: (name: string, target: number, shared: boolean) => void }) {
  const { t: tr } = useI18n();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [shared, setShared] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Name of the savings goal", "Name des Sparziels")} className="field" />
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder={tr("Target amount", "Zielbetrag")} className="field w-36" />
        <button
          onClick={() => {
            const t = parseFloat(target.replace(",", "."));
            if (!name || isNaN(t)) return;
            onCreate(name, t, shared);
            setName("");
            setTarget("");
            setShared(false);
          }}
          className="btn btn-primary"
        >
          {tr("Create", "Anlegen")}
        </button>
      </div>
      <label className="flex items-center gap-2 text-caption cursor-pointer w-fit">
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
        {tr("Share with household (joint account) — leave off to keep it private", "Mit Haushalt teilen (gemeinsames Konto) — aus lässt es privat")}
      </label>
    </div>
  );
}
