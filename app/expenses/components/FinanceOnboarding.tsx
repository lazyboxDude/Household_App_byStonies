"use client";

import React, { useState } from "react";
import { Check, Coins, PiggyBank, Receipt, Sparkles, Wallet } from "lucide-react";
import { showToast } from "../../../lib/toast";
import { chf, r2 } from "../format";
import { useVerteilertopf } from "../hooks/useVerteilertopf";
import { useDebts } from "../hooks/useDebts";
import { usePots } from "../hooks/usePots";
import { useBudgets } from "../hooks/useBudgets";
import { CreateDebtForm } from "./Debts";

const STEPS = ["Willkommen", "Lohn verteilen", "Budgets", "Schulden", "Sparziele"] as const;

export default function FinanceOnboarding({
  vt,
  debts,
  pots,
  budgets,
}: {
  vt: ReturnType<typeof useVerteilertopf>;
  debts: ReturnType<typeof useDebts>;
  pots: ReturnType<typeof usePots>;
  budgets: ReturnType<typeof useBudgets>;
}) {
  const [step, setStep] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const lastStep = STEPS.length - 1;

  const handleFinish = async () => {
    setIsFinishing(true);
    await vt.completeOnboarding();
    setIsFinishing(false);
    showToast("Finanzen eingerichtet — los geht's!", "success");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="surface p-8 animate-sheet">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className="h-1.5 rounded-full"
              style={{
                width: i === step ? "1.75rem" : "0.5rem",
                background: i <= step ? "var(--accent)" : "var(--surface-3)",
                transition: "width var(--dur-base) var(--ease-spring), background-color var(--dur-base) var(--ease-out)",
              }}
            />
          ))}
        </div>

        <div key={step} className="animate-rise">
          {step === 0 && <WelcomeStep />}
          {step === 1 && <IncomeStep vt={vt} />}
          {step === 2 && <BudgetStep budgets={budgets} />}
          {step === 3 && <DebtsStep debts={debts} />}
          {step === 4 && <SavingsStep pots={pots} />}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t divider">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn btn-ghost px-4 py-2"
          >
            Zurück
          </button>
          {step < lastStep ? (
            <button onClick={() => setStep((s) => Math.min(lastStep, s + 1))} className="btn btn-primary px-6 py-2.5">
              {step === 0 ? "Los geht's" : "Weiter"}
            </button>
          ) : (
            <button onClick={handleFinish} disabled={isFinishing} className="btn btn-primary px-6 py-2.5">
              {isFinishing ? "Wird gespeichert..." : "Fertig"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--accent-soft)" }}>
        <Sparkles className="w-8 h-8" style={{ color: "var(--accent)" }} />
      </div>
      <h1 className="text-title mb-2">Finanzen einrichten</h1>
      <p className="text-body text-[var(--text-secondary)] mb-6">
        Vier kurze Schritte, dann läuft der Lohn verteilen automatisch mit den richtigen Zahlen. Budgets, Schulden und
        Sparziele kannst du hier gleich anlegen — oder überspringen und später in den Tabs nachtragen.
      </p>
      <ul className="text-left space-y-2 max-w-sm mx-auto">
        {[
          { icon: Wallet, text: "Daueraufträge & Puffer für den Lohneingang festlegen" },
          { icon: Coins, text: "Budgets pro Kategorie festlegen (optional)" },
          { icon: Receipt, text: "Bestehende Schulden erfassen (optional)" },
          { icon: PiggyBank, text: "Erste Sparziele anlegen (optional)" },
        ].map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
            <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function IncomeStep({ vt }: { vt: ReturnType<typeof useVerteilertopf> }) {
  const { settings, saveSettings } = vt;
  const [taxes, setTaxes] = useState(String(settings.taxes || ""));
  const [bills, setBills] = useState(String(settings.bills || ""));
  const [joint, setJoint] = useState(String(settings.joint || ""));
  const [minBuffer, setMinBuffer] = useState(String(settings.minBuffer || ""));

  // Persist on every change so "Weiter"/"Zurück" never lose what's typed —
  // the wizard has no separate save step, this step's fields are the save.
  const commit = async (next: { taxes: string; bills: string; joint: string; minBuffer: string }) => {
    await saveSettings({
      taxes: r2(parseFloat(next.taxes.replace(",", ".")) || 0),
      bills: r2(parseFloat(next.bills.replace(",", ".")) || 0),
      joint: r2(parseFloat(next.joint.replace(",", ".")) || 0),
      minBuffer: r2(parseFloat(next.minBuffer.replace(",", ".")) || 0),
    });
  };

  return (
    <div>
      <h2 className="text-headline mb-1">Wie soll der Lohn verteilt werden?</h2>
      <p className="text-caption mb-4">
        Der ganze Lohn landet zuerst auf dem Hauptkonto. Diese Beträge gehen danach automatisch als Daueraufträge raus —
        der Rest bleibt als Puffer.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-caption block mb-1">Steuern / Monat</label>
          <input
            value={taxes}
            onChange={(e) => setTaxes(e.target.value)}
            onBlur={() => commit({ taxes, bills, joint, minBuffer })}
            placeholder="0"
            className="field font-mono"
          />
        </div>
        <div>
          <label className="text-caption block mb-1">Rechnungen / Monat</label>
          <input
            value={bills}
            onChange={(e) => setBills(e.target.value)}
            onBlur={() => commit({ taxes, bills, joint, minBuffer })}
            placeholder="0"
            className="field font-mono"
          />
        </div>
        <div>
          <label className="text-caption block mb-1">Gemeinsamer Haushalt / Monat</label>
          <input
            value={joint}
            onChange={(e) => setJoint(e.target.value)}
            onBlur={() => commit({ taxes, bills, joint, minBuffer })}
            placeholder="0"
            className="field font-mono"
          />
        </div>
        <div>
          <label className="text-caption block mb-1">Mindestpuffer Hauptkonto</label>
          <input
            value={minBuffer}
            onChange={(e) => setMinBuffer(e.target.value)}
            onBlur={() => commit({ taxes, bills, joint, minBuffer })}
            placeholder="0"
            className="field font-mono"
          />
        </div>
      </div>
      <p className="text-caption mt-3">
        Summe Fixabzüge:{" "}
        <b className="text-[var(--text)]">
          {chf(
            (parseFloat(taxes.replace(",", ".")) || 0) + (parseFloat(bills.replace(",", ".")) || 0) + (parseFloat(joint.replace(",", ".")) || 0)
          )}
        </b>{" "}
        pro Monat. Alles hier lässt sich später jederzeit unter Einstellungen anpassen.
      </p>
    </div>
  );
}

function BudgetStep({ budgets: b }: { budgets: ReturnType<typeof useBudgets> }) {
  const { budgets, addBudget } = b;
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  // Commit on blur too, not just the "Anlegen" click — otherwise a budget
  // typed right before "Weiter"/"Fertig" (which never fires that click) is
  // silently dropped.
  const commitPending = () => {
    const amt = parseFloat(amount.replace(",", "."));
    if (!category || isNaN(amt)) return;
    addBudget(category, r2(amt));
    setCategory("");
    setAmount("");
  };

  return (
    <div>
      <h2 className="text-headline mb-1">Erste Budgets anlegen</h2>
      <p className="text-caption mb-4">
        Leg pro Kategorie ein monatliches Budget fest. Optional — überspringen geht jederzeit, weitere Budgets lassen
        sich später unter Budgets &amp; Ausgaben anlegen.
      </p>
      <div className="flex flex-wrap gap-2">
        <input value={category} onChange={(e) => setCategory(e.target.value)} onBlur={commitPending} placeholder="Kategorie" className="field" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={commitPending} placeholder="Betrag pro Monat" className="field w-36" />
        <button onClick={commitPending} className="btn btn-primary">
          Anlegen
        </button>
      </div>
      {budgets.length > 0 && (
        <div className="space-y-2 mt-3">
          {budgets.map((budget) => (
            <div key={budget.id} className="surface-2 p-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4" style={{ color: "var(--success)" }} />
                {budget.category}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">{budget.amount.toFixed(2)} CHF / Monat</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DebtsStep({ debts: d }: { debts: ReturnType<typeof useDebts> }) {
  const { debts, createDebt } = d;
  return (
    <div>
      <h2 className="text-headline mb-1">Gibt es Schulden?</h2>
      <p className="text-caption mb-4">Trag bestehende Kredite oder Schulden ein, um sie mit einer monatlichen Rate abzubauen. Optional — überspringen geht jederzeit.</p>
      <CreateDebtForm onCreate={createDebt} />
      {debts.length > 0 && (
        <div className="space-y-2 mt-3">
          {debts.map((debt) => (
            <div key={debt.id} className="surface-2 p-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4" style={{ color: "var(--success)" }} />
                {debt.name}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">{debt.total.toFixed(2)} CHF</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SavingsStep({ pots: p }: { pots: ReturnType<typeof usePots> }) {
  const { pots, createPot } = p;
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [shared, setShared] = useState(false);

  // Commit on blur too, not just the "Anlegen" click — otherwise a goal
  // typed right before "Fertig" (which never fires that click) is silently
  // dropped.
  const commitPending = () => {
    const t = parseFloat(target.replace(",", "."));
    if (!name || isNaN(t)) return;
    createPot(name, t, shared);
    setName("");
    setTarget("");
    setShared(false);
  };

  return (
    <div>
      <h2 className="text-headline mb-1">Erste Sparziele anlegen</h2>
      <p className="text-caption mb-4">Wofür wollt ihr sparen? Optional — überspringen geht jederzeit, weitere Ziele lassen sich später unter Sparziele anlegen.</p>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={commitPending} placeholder="Name des Sparziels" className="field" />
          <input value={target} onChange={(e) => setTarget(e.target.value)} onBlur={commitPending} placeholder="Zielbetrag" className="field w-36" />
          <button onClick={commitPending} className="btn btn-primary">
            Anlegen
          </button>
        </div>
        <label className="flex items-center gap-2 text-caption cursor-pointer w-fit">
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
          Mit Haushalt teilen (gemeinsames Konto) — aus lässt es privat
        </label>
      </div>
      {pots.length > 0 && (
        <div className="space-y-2 mt-3">
          {pots.map((pot) => (
            <div key={pot.id} className="surface-2 p-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4" style={{ color: "var(--success)" }} />
                {pot.name}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">{pot.target.toFixed(2)} CHF</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
