"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Wallet } from 'lucide-react';
import { showToast } from '../../lib/toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Verteilertopf from './components/Verteilertopf';
import FeatureOnboarding from '../components/FeatureOnboarding';

interface Budget {
  id: string;
  category: string;
  amount: number; // monthly budget
}

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string; // ISO
  category: string;
  note?: string;
}

interface Pot {
  id: string;
  name: string;
  target: number;
  saved: number;
  ownerUserId: string | null; // null = shared/joint pot, visible to the whole household
}

type PageTab = 'budget' | 'verteilertopf';

export default function ExpensesPage() {
  const { user, household } = useAuth();
  const userId = user?.id;
  const householdId = household?.id;
  const isEnabled = household?.enabledFeatures.includes("expenses") ?? false;

  const [pageTab, setPageTab] = useState<PageTab>('budget');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pots, setPots] = useState<Pot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [categoryInput, setCategoryInput] = useState('');
  const [budgetAmountInput, setBudgetAmountInput] = useState('');

  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseNote, setExpenseNote] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [undoableExpense, setUndoableExpense] = useState<Expense | null>(null);
  useEffect(() => {
    if (!undoableExpense) return;
    const t = setTimeout(() => setUndoableExpense(null), 8000);
    return () => clearTimeout(t);
  }, [undoableExpense]);

  // The Shopping list auto-creates an expense (via Supabase) when an item is
  // checked off, then dispatches this event so we can offer an undo banner.
  useEffect(() => {
    const undoHandler = (ev: Event) => {
      const custom = ev as CustomEvent<Expense>;
      if (custom.detail?.id) setUndoableExpense(custom.detail);
    };
    window.addEventListener('expense:undoable', undoHandler as EventListener);
    return () => window.removeEventListener('expense:undoable', undoHandler as EventListener);
  }, []);

  const loadBudgets = useCallback(async () => {
    if (!userId || !householdId) return;
    const { data } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });
    setBudgets((data ?? []).map((b) => ({ id: b.id, category: b.category, amount: b.amount })));
  }, [userId, householdId]);

  const loadExpenses = useCallback(async () => {
    if (!userId || !householdId) return;
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .eq('household_id', householdId)
      .order('date', { ascending: false });
    setExpenses(
      (data ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        amount: e.amount,
        date: e.date,
        category: e.category,
        note: e.note ?? undefined,
      }))
    );
  }, [userId, householdId]);

  const loadPots = useCallback(async () => {
    if (!householdId) return;
    // RLS already limits this to the caller's own private pots plus every
    // shared (owner_user_id null) pot in the household.
    const { data } = await supabase
      .from('pots')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });
    setPots(
      (data ?? []).map((p) => ({ id: p.id, name: p.name, target: p.target, saved: p.saved, ownerUserId: p.owner_user_id }))
    );
  }, [householdId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadBudgets(), loadExpenses(), loadPots()]).finally(() => setIsLoading(false));
  }, [loadBudgets, loadExpenses, loadPots]);

  useEffect(() => {
    if (!userId || !householdId) return;
    const channel = supabase
      .channel(`expenses-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${userId}` }, loadBudgets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${userId}` }, loadExpenses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pots', filter: `household_id=eq.${householdId}` }, loadPots)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, householdId, loadBudgets, loadExpenses, loadPots]);

  const createPot = async (name: string, target: number, shared: boolean) => {
    if (!householdId || !userId) return;
    const { data, error } = await supabase
      .from('pots')
      .insert({ household_id: householdId, name, target, owner_user_id: shared ? null : userId })
      .select()
      .single();
    if (!error && data) {
      setPots((prev) => [...prev, { id: data.id, name: data.name, target: data.target, saved: data.saved, ownerUserId: data.owner_user_id }]);
    }
  };

  const addToPot = async (id: string, amount: number) => {
    const pot = pots.find((p) => p.id === id);
    if (!pot) return;
    const nextSaved = pot.saved + amount;
    setPots((prev) => prev.map((p) => (p.id === id ? { ...p, saved: nextSaved } : p)));
    await supabase.from('pots').update({ saved: nextSaved }).eq('id', id);
  };

  // CSV import/export helpers
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportCSV = () => {
    try {
      const rows = expenses.map(e => ({ id: e.id, title: e.title, amount: e.amount, date: e.date, category: e.category, note: e.note || '' }));
      const header = Object.keys(rows[0] || {}).join(',');
      const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `expenses_${new Date().toISOString().slice(0,10)}.csv`; a.click();
      URL.revokeObjectURL(url);
      showToast('Exported expenses CSV', 'success');
    } catch { showToast('Failed to export CSV', 'error'); }
  };

  const importCSV = (file: File) => {
    if (!userId || !householdId) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result || '');
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) return showToast('CSV empty or invalid', 'error');
        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
        const imported = lines.slice(1).map(line => {
            const parts = line.match(/(?:\"((?:\\\"|[^\"])*)\"|[^,]+)/g) || [];
            const vals = parts.map(p => p.replace(/^"|"$/g, ''));
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h.trim()] = vals[i] || ''; });
          return {
            household_id: householdId,
            user_id: userId,
            title: obj.title || 'Imported',
            amount: parseFloat(obj.amount || '0') || 0,
            date: obj.date || new Date().toISOString(),
            category: obj.category || 'Uncategorized',
            note: obj.note || null,
          };
        });
        const { data, error } = await supabase.from('expenses').insert(imported).select();
        if (error) throw error;
        setExpenses((prev) => [
          ...(data ?? []).map((e) => ({ id: e.id, title: e.title, amount: e.amount, date: e.date, category: e.category, note: e.note ?? undefined })),
          ...prev,
        ]);
        showToast(`Imported ${data?.length ?? 0} expenses`, 'success');
      } catch (err) { console.error(err); showToast('Failed to import CSV', 'error'); }
    };
    reader.readAsText(file);
  };

  const addBudget = async () => {
    if (!categoryInput || !budgetAmountInput || !userId || !householdId) return;
    const { data, error } = await supabase
      .from('budgets')
      .insert({ household_id: householdId, user_id: userId, category: categoryInput.trim(), amount: Number(budgetAmountInput) })
      .select()
      .single();
    if (!error && data) {
      setBudgets((prev) => [...prev, { id: data.id, category: data.category, amount: data.amount }]);
      setCategoryInput(''); setBudgetAmountInput('');
    }
  };

  const deleteBudget = async (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    await supabase.from('budgets').delete().eq('id', id);
  };

  const editBudget = async (id: string) => {
    const b = budgets.find(x => x.id === id);
    if (!b) return;
    const newCat = window.prompt('Edit budget category', b.category);
    if (newCat === null) return;
    const newAmtRaw = window.prompt('Edit budget monthly amount', String(b.amount));
    if (newAmtRaw === null) return;
    const newAmt = parseFloat(newAmtRaw);
    if (isNaN(newAmt)) return showToast('Invalid amount', 'error');
    setBudgets(prev => prev.map(x => x.id === id ? { ...x, category: newCat.trim(), amount: newAmt } : x));
    await supabase.from('budgets').update({ category: newCat.trim(), amount: newAmt }).eq('id', id);
    showToast('Budget updated', 'success');
  };

  const editExpense = async (id: string) => {
    const ex = expenses.find(x => x.id === id);
    if (!ex) return;
    const newTitle = window.prompt('Edit expense title', ex.title);
    if (newTitle === null) return;
    const newAmtRaw = window.prompt('Edit amount', String(ex.amount));
    if (newAmtRaw === null) return;
    const newAmt = parseFloat(newAmtRaw);
    if (isNaN(newAmt)) return showToast('Invalid amount', 'error');
    const newCat = window.prompt('Edit category', ex.category) || ex.category;
    const newNote = window.prompt('Edit note', ex.note || '') || undefined;
    setExpenses(prev => prev.map(x => x.id === id ? { ...x, title: newTitle, amount: newAmt, category: newCat, note: newNote } : x));
    await supabase.from('expenses').update({ title: newTitle, amount: newAmt, category: newCat, note: newNote ?? null }).eq('id', id);
    showToast('Expense updated', 'success');
  };

  const editPot = async (id: string) => {
    const p = pots.find(x => x.id === id);
    if (!p) return;
    const newName = window.prompt('Edit pot name', p.name);
    if (newName === null) return;
    const newTargetRaw = window.prompt('Edit target amount', String(p.target));
    if (newTargetRaw === null) return;
    const newTarget = parseFloat(newTargetRaw);
    if (isNaN(newTarget)) return showToast('Invalid amount', 'error');
    setPots(prev => prev.map(x => x.id === id ? { ...x, name: newName, target: newTarget } : x));
    await supabase.from('pots').update({ name: newName, target: newTarget }).eq('id', id);
    showToast('Pot updated', 'success');
  };

  const addExpense = async () => {
    if (!expenseTitle || !expenseAmount || !userId || !householdId) return;
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        household_id: householdId,
        user_id: userId,
        title: expenseTitle,
        amount: Number(expenseAmount),
        date: new Date(expenseDate).toISOString(),
        category: expenseCategory || 'Uncategorized',
        note: expenseNote || null,
      })
      .select()
      .single();
    if (!error && data) {
      setExpenses((prev) => [
        { id: data.id, title: data.title, amount: data.amount, date: data.date, category: data.category, note: data.note ?? undefined },
        ...prev,
      ]);
      setExpenseTitle(''); setExpenseAmount(''); setExpenseNote('');
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    await supabase.from('expenses').delete().eq('id', id);
  };

  const summaryCache = React.useMemo(() => {
    // compute spent per category for selected month
    const [y, m] = selectedMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    const sums: Record<string, { spent: number }> = {};
    expenses.forEach(exp => {
      const d = new Date(exp.date);
      if (d >= start && d < end) {
        const cat = exp.category || 'Uncategorized';
        sums[cat] = sums[cat] || { spent: 0 };
        sums[cat].spent += exp.amount;
      }
    });
    return sums;
  }, [expenses, selectedMonth]);

  const handleUndoExpense = async (id?: string) => {
    const eid = id || undoableExpense?.id;
    if (!eid) return;
    setExpenses(prev => prev.filter(e => e.id !== eid));
    await supabase.from('expenses').delete().eq('id', eid);
    setUndoableExpense(null);
  };

  if (!householdId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-display mb-6 animate-rise">Expenses & Budget Planner</h1>
        <div className="surface p-8 text-center animate-rise">
          <p className="text-body text-[var(--text-secondary)] mb-4">
            Join or create a household first. Your budget stays private to you — pots can optionally be shared.
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
        title="Expenses & Budget"
        description="Track your own spending against a monthly budget, and optionally share savings pots with your household like a joint account."
        bullets={[
          "Your budgets and expenses are private to you, by default",
          "Savings pots can be kept private or shared with the household",
          "Verteilertopf: plan how a paycheck splits across taxes, bills, and buffer",
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {undoableExpense && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] border animate-rise flex items-center justify-between" style={{ background: 'var(--warning-soft)', borderColor: 'transparent' }}>
          <div>
            <div className="font-medium">Expense added: {undoableExpense.title}</div>
            <div className="text-xs text-[var(--text-secondary)]">${undoableExpense.amount.toFixed(2)} · {undoableExpense.category}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleUndoExpense()} className="btn btn-secondary btn-sm">Undo</button>
            <button onClick={() => setUndoableExpense(null)} className="press px-2 py-1 text-sm text-[var(--text-secondary)]">Dismiss</button>
          </div>
        </div>
      )}
      <h1 className="text-display mb-1 animate-rise">Expenses & Budget Planner</h1>
      <p className="text-caption mb-6 animate-rise">Private to you · pots can be shared with your household</p>

      <div className="relative flex gap-2 mb-6 border-b divider">
        <button
          onClick={() => setPageTab('budget')}
          className={`press px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-300 ${
            pageTab === 'budget'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          Budgets &amp; Ausgaben
        </button>
        <button
          onClick={() => setPageTab('verteilertopf')}
          className={`press px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-300 ${
            pageTab === 'verteilertopf'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]'
          }`}
        >
          Verteilertopf
        </button>
      </div>

      {pageTab === 'verteilertopf' ? (
        <div className="animate-rise">
          <Verteilertopf householdId={householdId} />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-rise">
        {/* Left: Budgets */}
        <div className="surface p-4">
          <h2 className="text-headline mb-3">Budgets</h2>
          <div className="space-y-2 mb-4">
            <input placeholder="Category" value={categoryInput} onChange={e => setCategoryInput(e.target.value)} className="field" />
            <input placeholder="Monthly amount" value={budgetAmountInput} onChange={e => setBudgetAmountInput(e.target.value)} className="field" />
            <button onClick={addBudget} className="btn btn-primary w-full">Add Budget</button>
          </div>

          <div className="space-y-2">
            {budgets.length === 0 && <p className="text-caption">No budgets yet.</p>}
            {budgets.map(b => (
              <div key={b.id} className="flex items-center justify-between border divider p-2 rounded-[var(--radius-sm)]">
                <div>
                  <div className="font-medium text-sm">{b.category}</div>
                  <div className="text-xs text-[var(--text-secondary)]">${b.amount.toFixed(2)} / month</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => editBudget(b.id)} className="press text-blue-500 text-sm">Edit</button>
                  <button onClick={() => deleteBudget(b.id)} className="press text-[var(--danger)] text-sm">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Add Expense */}
        <div className="surface p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-headline">Add Expense</h2>
            <div className="flex items-center gap-2">
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="field py-1.5 text-sm w-auto" />
              <button onClick={exportCSV} className="btn btn-secondary btn-sm">Export CSV</button>
              <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm">Import CSV</button>
              <input ref={fileInputRef} type="file" accept="text/csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) importCSV(f); e.currentTarget.value = ''; }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input placeholder="Title" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} className="field" />
            <input placeholder="Amount" type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="field" />
            <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="field" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="field">
              <option value="">Select category</option>
              {budgets.map(b => <option key={b.id} value={b.category}>{b.category}</option>)}
              <option value="Uncategorized">Uncategorized</option>
            </select>
            <input placeholder="Note (optional)" value={expenseNote} onChange={e => setExpenseNote(e.target.value)} className="field" />
            <button onClick={addExpense} className="btn btn-primary">Add Expense</button>
          </div>

          <h3 className="text-headline mt-4">Expenses for {selectedMonth}</h3>
          <div className="space-y-2 mt-2">
            {expenses.filter(exp => exp.date.startsWith(selectedMonth)).length === 0 && <p className="text-caption">No expenses for this month.</p>}
            {expenses.filter(exp => exp.date.startsWith(selectedMonth)).map(exp => (
              <div key={exp.id} className="flex items-center justify-between border divider p-2 rounded-[var(--radius-sm)]">
                <div>
                  <div className="font-medium text-sm">{exp.title}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{new Date(exp.date).toLocaleDateString()} · {exp.category}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-medium text-sm">${exp.amount.toFixed(2)}</div>
                  <button onClick={() => editExpense(exp.id)} className="press text-blue-500 text-sm">Edit</button>
                  <button onClick={() => deleteExpense(exp.id)} className="press text-[var(--danger)] text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Summary & Pots */}
        <div className="lg:col-span-3 space-y-4">
          <div className="surface p-4">
            <h2 className="text-headline mb-3">Budget Summary — {selectedMonth}</h2>
              {budgets.length === 0 && <p className="text-caption">No budgets to summarize. Add budgets to track spending.</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgets.map((b, i) => {
                  const spent = summaryCache[b.category]?.spent || 0;
                  const pct = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
                  // health is inverse of pct (more health = more under budget)
                  const health = Math.max(0, Math.min(100, 100 - pct));
                  const level = Math.max(1, Math.ceil(health / 20));
                  const coins = Math.max(0, Math.round((Math.max(0, b.amount - spent))));

                  const ringSize = 64;
                  const stroke = 8;
                  const radius = (ringSize - stroke) / 2;
                  const circumference = 2 * Math.PI * radius;
                  const progress = Math.min(100, Math.max(0, 100 - pct));
                  const dashoffset = circumference - (progress / 100) * circumference;

                  return (
                    <div key={b.id} className="surface card-interactive p-4 animate-rise" style={{ "--stagger-i": i } as React.CSSProperties}>
                      <div className="flex items-center gap-4">
                        <div style={{ width: ringSize, height: ringSize, position: 'relative' }}>
                          <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
                            <defs>
                              <linearGradient id={`g-${b.id}`} x1="0%" x2="100%">
                                <stop offset="0%" stopColor="#60a5fa" />
                                <stop offset="100%" stopColor="#fb923c" />
                              </linearGradient>
                            </defs>
                            <g transform={`translate(${ringSize/2}, ${ringSize/2})`}>
                              <circle r={radius} stroke="var(--surface-3)" strokeWidth={stroke} fill="none" />
                              <circle r={radius} stroke={`url(#g-${b.id})`} strokeWidth={stroke} fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${circumference} ${circumference}`}
                                strokeDashoffset={dashoffset}
                                style={{ transition: 'stroke-dashoffset var(--dur-slow) var(--ease-spring)' }}
                              />
                            </g>
                          </svg>
                          <div style={{ position: 'absolute', left: 0, top: 0, width: ringSize, height: ringSize }} className="flex items-center justify-center">
                            <div className="text-sm font-semibold">{Math.round(progress)}%</div>
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-lg">{b.category}</div>
                              <div className="text-xs text-[var(--text-secondary)]">${spent.toFixed(2)} spent of ${b.amount.toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-yellow-500 font-semibold">⭐ Level {level}</div>
                              <div className="text-xs text-[var(--text-secondary)]">{coins} coins</div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-3 rounded-full bg-[var(--surface-2)] overflow-hidden">
                              <div style={{ width: `${pct}%`, height: '100%', background: pct > 90 ? 'var(--danger)' : 'var(--accent)', transition: 'width var(--dur-slow) var(--ease-spring)' }} />
                            </div>
                            <button onClick={() => showToast(`${b.category}: ${Math.round(health)}% healthy — Level ${level}`, 'info')} className="btn btn-secondary btn-sm">Info</button>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <button onClick={() => { editBudget(b.id); showToast('Edited budget', 'success'); }} className="btn btn-sm" style={{ background: '#2563eb', color: 'white' }}>Manage</button>
                            <button onClick={() => { /* quick reward: add to pot as coins placeholder */ showToast(`Saved ${coins} coins to your wallet!`, 'success'); }} className="btn btn-sm" style={{ background: '#fbbf24', color: '#1a1405' }}>Bank Coins</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          </div>

          <div className="surface p-4">
            <h2 className="text-headline mb-3">Pots (Savings Goals)</h2>
            <CreatePotForm onCreate={createPot} />
            <div className="space-y-3 mt-3">
              {pots.length === 0 && <p className="text-caption">No pots yet — create one to save for something special.</p>}
              {pots.map(p => {
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
                                ? { background: 'var(--accent-soft)', color: 'var(--accent)' }
                                : { background: 'var(--surface-3)', color: 'var(--text-tertiary)' }
                            }
                          >
                            {isShared ? 'Shared' : 'Private'}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">${p.saved.toFixed(2)} of ${p.target.toFixed(2)}</div>
                      </div>
                      <div className="text-sm font-medium">{pct}%</div>
                    </div>
                    <div className="w-full bg-[var(--surface-3)] h-2 rounded mt-2 overflow-hidden">
                      <div style={{ width: `${pct}%`, height: '100%', background: pct > 80 ? '#3b82f6' : '#93c5fd', transition: 'width var(--dur-slow) var(--ease-spring)' }} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input type="number" placeholder="Amount" id={`add-to-${p.id}`} className="field w-32 py-1.5 text-sm" />
                      <button onClick={() => {
                        const el = document.getElementById(`add-to-${p.id}`) as HTMLInputElement | null;
                        if (!el || !el.value) return;
                        const amt = parseFloat(el.value);
                        if (isNaN(amt)) return;
                        addToPot(p.id, amt);
                        el.value = '';
                      }} className="btn btn-sm" style={{ background: 'var(--success)', color: 'white' }}>Add</button>
                      <button onClick={() => editPot(p.id)} className="btn btn-sm" style={{ background: '#2563eb', color: 'white' }}>Edit</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// Small inline form component for creating pots — kept in same file for simplicity
function CreatePotForm({ onCreate }: { onCreate: (name: string, target: number, shared: boolean) => void }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [shared, setShared] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Pot name" className="field" />
        <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Target amount" className="field w-36" />
        <button onClick={() => { const t = parseFloat(target); if (!name || isNaN(t)) return; onCreate(name, t, shared); setName(''); setTarget(''); setShared(false); }} className="btn btn-primary">Create</button>
      </div>
      <label className="flex items-center gap-2 text-caption cursor-pointer w-fit">
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
        Share with household (joint account) — off keeps it private to you
      </label>
    </div>
  );
}
