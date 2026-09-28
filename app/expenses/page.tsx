"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import FeatureOnboarding from '../components/FeatureOnboarding';
import FinanceOnboarding from './components/FinanceOnboarding';
import MoneyOnboarding from './onboarding/MoneyOnboarding';
import { useMoneyOnboarding } from './onboarding/useMoneyOnboarding';
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

const TABS: { key: FinanceTab; label: string }[] = [
  { key: 'uebersicht', label: 'Übersicht' },
  { key: 'lohn', label: 'Lohn verteilen' },
  { key: 'budgets', label: 'Budgets & Ausgaben' },
  { key: 'planer', label: 'Rechnungen-Planer' },
  { key: 'schulden', label: 'Schulden' },
  { key: 'sparziele', label: 'Sparziele' },
  { key: 'einstellungen', label: 'Einstellungen' },
];

export default function ExpensesPage() {
  const { user, household } = useAuth();
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
    const t = setTimeout(() => setUndoableExpense(null), 8000);
    return () => clearTimeout(t);
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
        <h1 className="text-display mb-6 animate-rise">Finanzen</h1>
        <div className="surface p-8 text-center animate-rise">
          <p className="text-body text-[var(--text-secondary)] mb-4">
            Join or create a household first. Your budget stays private to you — the Verteilertopf and pots can optionally be shared.
          </p>
          <Link href="/login" className="btn btn-primary inline-flex">
            Go to Login
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
        title="Finanzen"
        description="Ein Feature für den ganzen Geldfluss: Lohn verteilen, Rechnungen planen, Budgets im Blick behalten und gemeinsam sparen."
        bullets={[
          "Verteilertopf: plant, wie der Lohn auf Steuern, Rechnungen und Puffer aufgeteilt wird",
          "Budgets und Ausgaben sind standardmässig privat",
          "Sparziele können privat bleiben oder mit dem Haushalt geteilt werden",
        ]}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
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
        onDone={async () => {
          for (const cost of moneyOnboarding.fixedCosts) {
            if (cost.amount > 0 && cost.label.trim()) {
              await budgetsHook.addBudget(cost.label.trim(), cost.amount);
            }
          }
          if (!vt.onboardingCompleted) vt.completeOnboarding();
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
            <div className="font-medium">Ausgabe erfasst: {undoableExpense.title}</div>
            <div className="text-xs text-[var(--text-secondary)]">{undoableExpense.amount.toFixed(2)} CHF · {undoableExpense.category}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleUndoExpense()} className="btn btn-secondary btn-sm">Rückgängig</button>
            <button onClick={() => setUndoableExpense(null)} className="press px-2 py-1 text-sm text-[var(--text-secondary)]">Schliessen</button>
          </div>
        </div>
      )}
      <h1 className="text-display mb-1 animate-rise">Finanzen</h1>
      <p className="text-caption mb-6 animate-rise">Verteilertopf, Budgets und Sparziele — an einem Ort. Budgets bleiben privat, Sparziele können geteilt werden.</p>

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
            {label}
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

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
