"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet } from 'lucide-react';
import { MascotLoader } from '@/components/Mascot';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { localizeLabel } from './format';
import { supabase } from '../lib/supabase';
import FeatureOnboarding from '../components/FeatureOnboarding';
import FinanceOnboarding from './components/FinanceOnboarding';
import MoneyOnboarding from './onboarding/MoneyOnboarding';
import { useMoneyOnboarding } from './onboarding/useMoneyOnboarding';
import type { GoalId } from './onboarding/types';
import FinanceOverview from './components/FinanceOverview';
import IncomeDistribution from './components/IncomeDistribution';
import BudgetsExpenses from './components/BudgetsExpenses';
import BillsPlanner from './components/BillsPlanner';
import Debts from './components/Debts';
import SavingsGoals from './components/SavingsGoals';
import FinanceSettings from './components/FinanceSettings';
import { useVerteilertopf } from './hooks/useVerteilertopf';
import { useBudgets } from './hooks/useBudgets';
import { usePots } from './hooks/usePots';
import { useDebts } from './hooks/useDebts';
import { Expense, FinanceTab } from './types';

const TABS: { key: FinanceTab; label: { de: string; en: string } }[] = [
  { key: 'uebersicht', label: { de: 'Übersicht', en: 'Overview' } },
  { key: 'lohn', label: { de: 'Lohn verteilen', en: 'Distribute income' } },
  { key: 'budgets', label: { de: 'Budgets & Ausgaben', en: 'Budgets & expenses' } },
  { key: 'planer', label: { de: 'Rechnungen-Planer', en: 'Bill planner' } },
  { key: 'schulden', label: { de: 'Schulden', en: 'Debts' } },
  { key: 'sparziele', label: { de: 'Sparziele', en: 'Savings goals' } },
  { key: 'einstellungen', label: { de: 'Einstellungen', en: 'Settings' } },
];

export default function ExpensesPage() {
  const { user, household } = useAuth();
  const { t, lang } = useI18n();
  const userId = user?.id;
  const householdId = household?.id;
  const isEnabled = household?.enabledFeatures.includes("expenses") ?? false;

  const [tab, setTab] = useState<FinanceTab>('uebersicht');

  const vt = useVerteilertopf(householdId);
  const budgetsHook = useBudgets(userId, householdId);
  const potsHook = usePots(userId, householdId);
  const debtsHook = useDebts(userId, householdId);
  const moneyOnboarding = useMoneyOnboarding(householdId);
  const isLoading = vt.isLoading || budgetsHook.isLoading || potsHook.isLoading || debtsHook.isLoading || moneyOnboarding.isLoading;

  // The Shopping list auto-creates an expense (via Supabase) when an item is
  // checked off, then dispatches this event so we can offer an undo banner.
  const [undoableExpense, setUndoableExpense] = useState<Expense | null>(null);
  useEffect(() => {
    if (!undoableExpense) return;
    const timer = setTimeout(() => setUndoableExpense(null), 8000);
    return () => clearTimeout(timer);
  }, [undoableExpense]);

  useEffect(() => {
    const undoHandler = (ev: Event) => {
      const custom = ev as CustomEvent<Expense>;
      if (custom.detail?.id) setUndoableExpense(custom.detail);
    };
    window.addEventListener('expense:undoable', undoHandler as EventListener);
    return () => window.removeEventListener('expense:undoable', undoHandler as EventListener);
  }, []);

  const handleUndoExpense = async (id?: string) => {
    const eid = id || undoableExpense?.id;
    if (!eid) return;
    budgetsHook.setExpenses((prev) => prev.filter((e) => e.id !== eid));
    await supabase.from('expenses').delete().eq('id', eid);
    setUndoableExpense(null);
  };

  if (!householdId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-display mb-6 animate-rise">{t("Finances", "Finanzen")}</h1>
        <div className="surface p-8 text-center animate-rise">
          <p className="text-body text-[var(--text-secondary)] mb-4">
            {t("Join or create a household first. Your budget stays private to you — the Verteilertopf and pots can optionally be shared.", "Tritt zuerst einem Haushalt bei oder erstelle einen. Dein Budget bleibt privat – Verteilertopf und Sparziele kannst du optional teilen.")}
          </p>
          <Link href="/login" className="btn btn-primary inline-flex">
            {t("Go to Login", "Zur Anmeldung")}
          </Link>
        </div>
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <FeatureOnboarding
        feature="expenses"
        icon={Wallet}
        title={t("Finances", "Finanzen")}
        description={t(
          "One feature for the whole flow of money: distribute income, plan bills, keep an eye on budgets and save together.",
          "Ein Feature für den ganzen Geldfluss: Lohn verteilen, Rechnungen planen, Budgets im Blick behalten und gemeinsam sparen."
        )}
        bullets={[
          t("Verteilertopf: plans how your income is split between taxes, bills and buffer", "Verteilertopf: plant, wie der Lohn auf Steuern, Rechnungen und Puffer aufgeteilt wird"),
          t("Budgets and expenses are private by default", "Budgets und Ausgaben sind standardmässig privat"),
          t("Savings goals can stay private or be shared with the household", "Sparziele können privat bleiben oder mit dem Haushalt geteilt werden"),
        ]}
      />
    );
  }

  if (isLoading) {
    return (
      <MascotLoader className="py-24" label={t('Loading', 'Lädt')} />
    );
  }

  // The warm, goal-first onboarding (goals, income, fixed costs, mood, first
  // result) replaces the old Verteilertopf setup wizard as the first thing a
  // household sees — finishing it goes straight to the dashboard instead of
  // chaining into that more technical wizard (still reachable later from the
  // "Lohn verteilen" / "Einstellungen" tabs, whenever someone wants it).
  // The fixed costs typed in during that onboarding are the only numbers it
  // collects that the dashboard can show directly, so they're carried over
  // into real Budget rows here — otherwise they'd be saved in the
  // money_onboarding row and never surface anywhere in the app.
  if (!moneyOnboarding.completed) {
    return (
      <MoneyOnboarding
        data={moneyOnboarding}
        onDone={async (openNextStep) => {
          const existing = new Set(budgetsHook.budgets.map((b) => b.category.trim().toLowerCase()));
          for (const cost of moneyOnboarding.fixedCosts) {
            const label = cost.label.trim();
            if (cost.amount > 0 && label && !existing.has(label.toLowerCase())) {
              existing.add(label.toLowerCase());
              await budgetsHook.addBudget(label, cost.amount);
            }
          }
          if (!vt.onboardingCompleted) await vt.completeOnboarding();
          if (openNextStep) setTab(nextStepTab(moneyOnboarding.goals[0]));
        }}
      />
    );
  }

  if (!vt.onboardingCompleted) {
    return <FinanceOnboarding vt={vt} debts={debtsHook} pots={potsHook} budgets={budgetsHook} />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {undoableExpense && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] border animate-rise flex items-center justify-between" style={{ background: 'var(--warning-soft)', borderColor: 'transparent' }}>
          <div>
            <div className="font-medium">{t("Expense recorded", "Ausgabe erfasst")}: {undoableExpense.title}</div>
            <div className="text-xs text-[var(--text-secondary)]">{undoableExpense.amount.toFixed(2)} CHF · {localizeLabel(undoableExpense.category, lang)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleUndoExpense()} className="btn btn-secondary btn-sm">{t("Undo", "Rückgängig")}</button>
            <button onClick={() => setUndoableExpense(null)} className="press px-2 py-1 text-sm text-[var(--text-secondary)]">{t("Close", "Schliessen")}</button>
          </div>
        </div>
      )}
      <h1 className="text-display mb-1 animate-rise">{t("Finances", "Finanzen")}</h1>
      <p className="text-caption mb-6 animate-rise">{t("Verteilertopf, budgets and savings goals — in one place. Budgets stay private, savings goals can be shared.", "Verteilertopf, Budgets und Sparziele — an einem Ort. Budgets bleiben privat, Sparziele können geteilt werden.")}</p>

      <div className="flex gap-2 mb-6 border-b divider overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="press px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors duration-300"
            style={
              tab === key
                ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                : { borderColor: 'transparent', color: 'var(--text-secondary)' }
            }
          >
            {label[lang]}
          </button>
        ))}
      </div>

      {tab === 'uebersicht' && (
        <FinanceOverview
          vt={vt}
          budgets={budgetsHook.budgets}
          spentByCategory={budgetsHook.spentByCategory(currentMonth())}
          pots={potsHook.pots}
          debts={debtsHook.debts}
          onNavigate={setTab}
        />
      )}
      {tab === 'lohn' && <IncomeDistribution vt={vt} />}
      {tab === 'budgets' && <BudgetsExpenses budgets={budgetsHook} />}
      {tab === 'planer' && <BillsPlanner vt={vt} />}
      {tab === 'schulden' && <Debts debts={debtsHook} />}
      {tab === 'sparziele' && <SavingsGoals pots={potsHook} />}
      {tab === 'einstellungen' && <FinanceSettings vt={vt} />}
    </div>
  );
}

// "Machen wir" on the last onboarding step lands on the tab where that goal's
// recommended next step actually happens.
function nextStepTab(goal: GoalId | undefined): FinanceTab {
  if (goal === 'schulden') return 'schulden';
  if (goal === 'ueberblick') return 'budgets';
  return 'sparziele';
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
