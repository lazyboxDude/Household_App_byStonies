"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Sparkles } from "lucide-react";
import { showToast } from "../../../lib/toast";
import { chf, r2, uid } from "../format";
import { calcAvailable } from "./calc";
import { FIXED_COST_CHIPS, GOALS, MOOD_OPTIONS, T, nextStepFor, resultHeadline } from "./copy";
import type { FixedCostEntry, GoalId, IncomeEntry, Mood } from "./types";
import type { useMoneyOnboarding } from "./useMoneyOnboarding";

const STEPS = ["Willkommen", "Ziele", "Einnahmen", "Feste Kosten", "Bauchgefühl", "Ergebnis", "Nächster Schritt"] as const;

const DEFAULT_INCOME_LABELS = ["Gehalt / Hauptverdienst", "Nebenverdienst", "Sonstiges"];

function parseAmount(text: string): number {
  return parseFloat(text.replace(",", ".")) || 0;
}

// A plain controlled input bound to a numeric value round-trips every
// keystroke through parseFloat, which strips a trailing "," or "." before
// the person can type the decimal digits after it. This keeps its own text
// while typing and only re-syncs from the outside when the numeric value
// changes for some other reason (e.g. loaded from the server).
function MoneyInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(value ? String(value).replace(".", ",") : "");

  useEffect(() => {
    if (parseAmount(text) !== value) {
      setText(value ? String(value).replace(".", ",") : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only resync when the external value itself changes
  }, [value]);

  return (
    <input
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseAmount(e.target.value));
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

export default function MoneyOnboarding({
  data,
  onDone,
}: {
  data: ReturnType<typeof useMoneyOnboarding>;
  onDone: () => void;
}) {
  const { goals, income, incomeVariable, fixedCosts, mood, step: savedStep, save } = data;
  const [step, setStep] = useState(savedStep || 0);
  const [isFinishing, setIsFinishing] = useState(false);
  const lastStep = STEPS.length - 1;

  const goToStep = (next: number) => {
    const clamped = Math.max(0, Math.min(lastStep, next));
    setStep(clamped);
    save({ step: clamped });
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    await save({ completed: true });
    setIsFinishing(false);
    showToast("Geschafft — hier ist deine erste Übersicht.", "success");
    onDone();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="surface p-8 animate-sheet">
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
          {step === 1 && <GoalsStep goals={goals} onChange={(g) => save({ goals: g })} />}
          {step === 2 && (
            <IncomeStep
              income={income}
              incomeVariable={incomeVariable}
              onChangeIncome={(next) => save({ income: next })}
              onToggleVariable={(v) => save({ incomeVariable: v })}
            />
          )}
          {step === 3 && <FixedCostsStep fixedCosts={fixedCosts} onChange={(next) => save({ fixedCosts: next })} />}
          {step === 4 && <MoodStep mood={mood} onChange={(m) => save({ mood: m })} />}
          {step === 5 && <ResultStep income={income} incomeVariable={incomeVariable} fixedCosts={fixedCosts} mood={mood} />}
          {step === 6 && <NextStepStep goals={goals} onFinish={handleFinish} isFinishing={isFinishing} />}
        </div>

        {step < lastStep && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t divider">
            <button onClick={() => goToStep(step - 1)} disabled={step === 0} className="btn btn-ghost px-4 py-2">
              {T.nav.back}
            </button>
            <button onClick={() => goToStep(step + 1)} className="btn btn-primary px-6 py-2.5">
              {step === 0 ? T.welcome.cta : T.nav.next}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="text-center">
      <Image
        src="/mascot/snail-welcome.webp"
        alt=""
        width={377}
        height={488}
        priority
        className="mx-auto mb-4 h-52 w-auto drop-shadow-lg"
      />
      <h1 className="text-title mb-2">{T.welcome.title}</h1>
      <p className="text-body text-[var(--text-secondary)]">{T.welcome.body}</p>
    </div>
  );
}

function GoalsStep({ goals, onChange }: { goals: GoalId[]; onChange: (goals: GoalId[]) => void }) {
  const toggle = (id: GoalId) => {
    if (goals.includes(id)) {
      onChange(goals.filter((g) => g !== id));
      return;
    }
    if (goals.length >= 3) return; // 1–3 wählbar
    onChange([...goals, id]);
  };

  return (
    <div>
      <h2 className="text-headline mb-1">{T.goals.title}</h2>
      <p className="text-caption mb-4">{T.goals.body}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {GOALS.map(({ id, label, icon: Icon }) => {
          const active = goals.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className="press surface-2 p-3 flex items-center gap-3 text-left rounded-[var(--radius-md)] border"
              style={{
                borderColor: active ? "var(--accent)" : "var(--border)",
                background: active ? "var(--accent-soft)" : "var(--surface-2)",
              }}
            >
              <Icon className="w-5 h-5 shrink-0" style={{ color: active ? "var(--accent)" : "var(--text-secondary)" }} />
              <span className="text-sm font-medium flex-1">{label}</span>
              {active && <Check className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IncomeStep({
  income,
  incomeVariable,
  onChangeIncome,
  onToggleVariable,
}: {
  income: IncomeEntry[];
  incomeVariable: boolean;
  onChangeIncome: (next: IncomeEntry[]) => void;
  onToggleVariable: (v: boolean) => void;
}) {
  // Seed the three suggested fields on first visit — still just a starting
  // point, any of them can be left at 0 and ignored.
  const entries = income.length > 0 ? income : DEFAULT_INCOME_LABELS.map((label) => ({ id: uid(), label, amount: 0, min: 0, max: 0 }));

  const update = (id: string, patch: Partial<IncomeEntry>) => {
    onChangeIncome(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };
  const addEntry = () => onChangeIncome([...entries, { id: uid(), label: "Weiterer Posten", amount: 0, min: 0, max: 0 }]);

  const total = incomeVariable
    ? { min: r2(entries.reduce((s, e) => s + (e.min || 0), 0)), max: r2(entries.reduce((s, e) => s + (e.max || 0), 0)) }
    : r2(entries.reduce((s, e) => s + (e.amount || 0), 0));
  const hasAnyIncome = incomeVariable
    ? entries.some((e) => e.min > 0 || e.max > 0)
    : entries.some((e) => e.amount > 0);

  return (
    <div>
      <h2 className="text-headline mb-1">{T.income.title}</h2>
      <p className="text-caption mb-4">{T.income.body}</p>

      <label className="flex items-center gap-2 text-caption cursor-pointer w-fit mb-4">
        <input type="checkbox" checked={incomeVariable} onChange={(e) => onToggleVariable(e.target.checked)} />
        {T.income.variableToggle}
      </label>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="flex flex-wrap items-center gap-2">
            <input
              value={entry.label}
              onChange={(e) => update(entry.id, { label: e.target.value })}
              placeholder="Bezeichnung"
              className="field flex-1 min-w-[10rem]"
            />
            {incomeVariable ? (
              <>
                <MoneyInput value={entry.min} onChange={(min) => update(entry.id, { min })} placeholder="von" className="field w-24 font-mono" />
                <span className="text-caption">–</span>
                <MoneyInput value={entry.max} onChange={(max) => update(entry.id, { max })} placeholder="bis" className="field w-24 font-mono" />
              </>
            ) : (
              <MoneyInput value={entry.amount} onChange={(amount) => update(entry.id, { amount })} placeholder="0" className="field w-28 font-mono" />
            )}
          </div>
        ))}
      </div>

      <button onClick={addEntry} className="btn btn-ghost btn-sm mt-3">
        {T.income.addEntry}
      </button>

      {hasAnyIncome && (
        <p className="text-caption mt-4">
          {T.income.feedback}{" "}
          <b className="text-[var(--text)]">
            {typeof total === "number" ? chf(total) : `${chf(total.min)} – ${chf(total.max)}`}
          </b>
          {" "}pro Monat.
        </p>
      )}
    </div>
  );
}

function FixedCostsStep({ fixedCosts, onChange }: { fixedCosts: FixedCostEntry[]; onChange: (next: FixedCostEntry[]) => void }) {
  const activeChip = (key: string) => fixedCosts.find((c) => c.chipKey === key);

  const toggleChip = (key: string, label: string) => {
    const existing = activeChip(key);
    if (existing) {
      onChange(fixedCosts.filter((c) => c.id !== existing.id));
    } else {
      onChange([...fixedCosts, { id: uid(), label, amount: 0, chipKey: key }]);
    }
  };
  const addCustom = () => onChange([...fixedCosts, { id: uid(), label: "", amount: 0, chipKey: null }]);
  const removeCustom = (id: string) => onChange(fixedCosts.filter((c) => c.id !== id));
  const updateAmount = (id: string, amount: number) => onChange(fixedCosts.map((c) => (c.id === id ? { ...c, amount } : c)));
  const updateLabel = (id: string, label: string) => onChange(fixedCosts.map((c) => (c.id === id ? { ...c, label } : c)));

  const total = r2(fixedCosts.reduce((s, c) => s + (c.amount || 0), 0));

  return (
    <div>
      <h2 className="text-headline mb-1">{T.fixedCosts.title}</h2>
      <p className="text-caption mb-4">{T.fixedCosts.body}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {FIXED_COST_CHIPS.map(({ key, label }) => (
          <button key={key} type="button" className="chip" data-active={!!activeChip(key)} onClick={() => toggleChip(key, label)}>
            {label}
          </button>
        ))}
      </div>

      {fixedCosts.length > 0 && (
        <div className="space-y-2 mb-3">
          {fixedCosts.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-2">
              <input
                value={c.label}
                onChange={(e) => updateLabel(c.id, e.target.value)}
                placeholder="Eigener Posten"
                className="field flex-1 min-w-[8rem]"
              />
              <MoneyInput value={c.amount} onChange={(amount) => updateAmount(c.id, amount)} placeholder="0" className="field w-28 font-mono" />
              {!c.chipKey && (
                <button onClick={() => removeCustom(c.id)} className="press text-[var(--text-tertiary)] hover:text-[var(--danger)] text-sm px-2">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button onClick={addCustom} className="btn btn-ghost btn-sm">
        {T.fixedCosts.addCustom}
      </button>

      {total > 0 && (
        <p className="text-caption mt-4">
          Zusammen <b className="text-[var(--text)]">{chf(total)}</b> pro Monat.
        </p>
      )}
    </div>
  );
}

function MoodStep({ mood, onChange }: { mood: Mood | null; onChange: (m: Mood) => void }) {
  return (
    <div>
      <h2 className="text-headline mb-1">{T.mood.title}</h2>
      <p className="text-caption mb-4">{T.mood.body}</p>
      <div className="grid grid-cols-2 gap-2">
        {MOOD_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className="chip justify-center py-3"
            data-active={mood === id}
            style={{ width: "100%" }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultStep({
  income,
  incomeVariable,
  fixedCosts,
  mood,
}: {
  income: IncomeEntry[];
  incomeVariable: boolean;
  fixedCosts: FixedCostEntry[];
  mood: Mood | null;
}) {
  const result = calcAvailable(income, fixedCosts, incomeVariable);
  const { amount, sentence } = resultHeadline(result);
  const negative = result.kind === "range" ? result.max < 0 : result.amount < 0;

  // Mood only softens the lead-in line — never a judgment, never shown as a score.
  const leadIn = mood === "gestresst" || mood === "unsicher" ? "Schritt für Schritt:" : null;

  return (
    <div className="text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ background: negative ? "var(--surface-2)" : "var(--accent-soft)" }}
      >
        <Sparkles className="w-8 h-8" style={{ color: negative ? "var(--text-secondary)" : "var(--accent)" }} />
      </div>
      {leadIn && <p className="text-caption mb-1">{leadIn}</p>}
      <h1 className="text-title mb-2">{T.result.title}</h1>
      <div className="text-4xl font-semibold my-3">{amount}</div>
      <p className="text-body text-[var(--text-secondary)] max-w-sm mx-auto">{sentence}</p>
    </div>
  );
}

function NextStepStep({ goals, onFinish, isFinishing }: { goals: GoalId[]; onFinish: () => void; isFinishing: boolean }) {
  return (
    <div className="text-center">
      <h2 className="text-headline mb-1">{T.nextStep.title}</h2>
      <p className="text-body text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">{nextStepFor(goals)}</p>
      <div className="flex items-center justify-center gap-3 mb-6">
        <button onClick={onFinish} disabled={isFinishing} className="btn btn-primary px-6 py-2.5">
          {isFinishing ? "..." : T.nextStep.doIt}
        </button>
        <button onClick={onFinish} disabled={isFinishing} className="btn btn-ghost px-6 py-2.5">
          {T.nextStep.later}
        </button>
      </div>
      <p className="text-caption">{T.nextStep.done}</p>
    </div>
  );
}
