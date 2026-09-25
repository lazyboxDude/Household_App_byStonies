"use client";

import React, { useEffect, useState, useRef } from 'react';
import { showToast } from '../../lib/toast';
import Verteilertopf from './components/Verteilertopf';

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
}

type PageTab = 'budget' | 'verteilertopf';

export default function ExpensesPage() {
  const [pageTab, setPageTab] = useState<PageTab>('budget');
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    try {
      const s = localStorage.getItem('budgets');
      return s ? JSON.parse(s) as Budget[] : [];
    } catch { return []; }
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const e = localStorage.getItem('expenses');
      return e ? JSON.parse(e) as Expense[] : [];
    } catch { return []; }
  });

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

  // budgets and expenses are initialized from localStorage in state initializers

  // Undoable expense UI state (move before listeners)
  const [undoableExpense, setUndoableExpense] = useState<Expense | null>(null);
  useEffect(() => {
    if (!undoableExpense) return;
    const t = setTimeout(() => setUndoableExpense(null), 8000);
    return () => clearTimeout(t);
  }, [undoableExpense]);

  // Listen for expenses added from other parts of the app (e.g., Shopping list)
  useEffect(() => {
    const handler = (ev: Event) => {
      const custom = ev as CustomEvent<Expense>;
      const expense = custom.detail;
      if (expense && expense.id) {
        setExpenses(prev => [...prev, expense]);
      }
    };
    const undoHandler = (ev: Event) => {
      const custom = ev as CustomEvent<Expense>;
      const expense = custom.detail;
      if (expense && expense.id) {
        // show undoable banner by setting temporary state
        setUndoableExpense(expense);
      }
    };
    window.addEventListener('expense:added', handler as EventListener);
    window.addEventListener('expense:undoable', undoHandler as EventListener);
    return () => {
      window.removeEventListener('expense:added', handler as EventListener);
      window.removeEventListener('expense:undoable', undoHandler as EventListener);
    };
  }, []);

  // Pots (savings goals)
  const [pots, setPots] = useState<Pot[]>(() => {
    try { const raw = localStorage.getItem('pots'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('pots', JSON.stringify(pots)); }, [pots]);

  const createPot = (name: string, target: number) => {
    const p: Pot = { id: Date.now().toString(), name, target, saved: 0 };
    setPots(prev => [...prev, p]);
  };

  const addToPot = (id: string, amount: number) => {
    setPots(prev => prev.map(p => p.id === id ? { ...p, saved: p.saved + amount } : p));
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
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) return showToast('CSV empty or invalid', 'error');
        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, ''));
        const imported: Expense[] = lines.slice(1).map(line => {
            const parts = line.match(/(?:\"((?:\\\"|[^\"])*)\"|[^,]+)/g) || [];
            const vals = parts.map(p => p.replace(/^"|"$/g, ''));
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h.trim()] = vals[i] || ''; });
          return {
            id: obj.id || Date.now().toString() + Math.floor(Math.random()*1000),
            title: obj.title || 'Imported',
            amount: parseFloat(obj.amount || '0') || 0,
            date: obj.date || new Date().toISOString(),
            category: obj.category || 'Uncategorized',
            note: obj.note || undefined,
          } as Expense;
        });
        setExpenses(prev => {
          const merged = [...prev, ...imported];
          localStorage.setItem('expenses', JSON.stringify(merged));
          return merged;
        });
        showToast(`Imported ${imported.length} expenses`, 'success');
      } catch (err) { console.error(err); showToast('Failed to import CSV', 'error'); }
    };
    reader.readAsText(file);
  };

  // Persist
  useEffect(() => { localStorage.setItem('budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('expenses', JSON.stringify(expenses)); }, [expenses]);

  const addBudget = () => {
    if (!categoryInput || !budgetAmountInput) return;
    const b: Budget = { id: Date.now().toString(), category: categoryInput.trim(), amount: Number(budgetAmountInput) };
    setBudgets(prev => [...prev, b]);
    setCategoryInput(''); setBudgetAmountInput('');
  };

  const deleteBudget = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  const editBudget = (id: string) => {
    const b = budgets.find(x => x.id === id);
    if (!b) return;
    const newCat = window.prompt('Edit budget category', b.category);
    if (newCat === null) return;
    const newAmtRaw = window.prompt('Edit budget monthly amount', String(b.amount));
    if (newAmtRaw === null) return;
    const newAmt = parseFloat(newAmtRaw);
    if (isNaN(newAmt)) return showToast('Invalid amount', 'error');
    setBudgets(prev => prev.map(x => x.id === id ? { ...x, category: newCat.trim(), amount: newAmt } : x));
    showToast('Budget updated', 'success');
  };

  const editExpense = (id: string) => {
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
    showToast('Expense updated', 'success');
  };

  const editPot = (id: string) => {
    const p = pots.find(x => x.id === id);
    if (!p) return;
    const newName = window.prompt('Edit pot name', p.name);
    if (newName === null) return;
    const newTargetRaw = window.prompt('Edit target amount', String(p.target));
    if (newTargetRaw === null) return;
    const newTarget = parseFloat(newTargetRaw);
    if (isNaN(newTarget)) return showToast('Invalid amount', 'error');
    setPots(prev => prev.map(x => x.id === id ? { ...x, name: newName, target: newTarget } : x));
    showToast('Pot updated', 'success');
  };

  const addExpense = () => {
    if (!expenseTitle || !expenseAmount) return;
    const ex: Expense = {
      id: Date.now().toString(),
      title: expenseTitle,
      amount: Number(expenseAmount),
      date: new Date(expenseDate).toISOString(),
      category: expenseCategory || 'Uncategorized',
      note: expenseNote || undefined,
    };
    setExpenses(prev => [...prev, ex]);
    setExpenseTitle(''); setExpenseAmount(''); setExpenseNote('');
  };

  const deleteExpense = (id: string) => setExpenses(prev => prev.filter(e => e.id !== id));

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

  const handleUndoExpense = (id?: string) => {
    const eid = id || undoableExpense?.id;
    if (!eid) return;
    setExpenses(prev => prev.filter(e => e.id !== eid));
    try {
      const raw = localStorage.getItem('expenses');
      const arr = raw ? JSON.parse(raw) as Expense[] : [];
      const filtered = arr.filter((ex: Expense) => ex.id !== eid);
      localStorage.setItem('expenses', JSON.stringify(filtered));
    } catch (err) { console.error('Failed to remove expense on undo', err); }
    setUndoableExpense(null);
  };

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
      <h1 className="text-display mb-6 animate-rise">Expenses & Budget Planner</h1>

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
          <Verteilertopf />
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
            <CreatePotForm onCreate={(name, target) => createPot(name, target)} />
            <div className="space-y-3 mt-3">
              {pots.length === 0 && <p className="text-caption">No pots yet — create one to save for something special.</p>}
              {pots.map(p => {
                const pct = p.target > 0 ? Math.min(100, Math.round((p.saved / p.target) * 100)) : 0;
                return (
                  <div key={p.id} className="surface-2 p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
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
function CreatePotForm({ onCreate }: { onCreate: (name: string, target: number) => void }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  return (
    <div className="flex gap-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Pot name" className="field" />
      <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Target amount" className="field w-36" />
      <button onClick={() => { const t = parseFloat(target); if (!name || isNaN(t)) return; onCreate(name, t); setName(''); setTarget(''); }} className="btn btn-primary">Create</button>
    </div>
  );
}
