"use client";

import React, { useEffect, useState, useRef } from 'react';
import { showToast } from '../../lib/toast';

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

export default function ExpensesPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

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

  // Load from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem('budgets');
      if (s) setBudgets(JSON.parse(s));
      const e = localStorage.getItem('expenses');
      if (e) setExpenses(JSON.parse(e));
    } catch (err) {
      console.error('Failed to load budgets/expenses', err);
    }
  }, []);

  // Listen for expenses added from other parts of the app (e.g., Shopping list)
  useEffect(() => {
    const handler = (ev: any) => {
      const expense = ev.detail as Expense;
      if (expense && expense.id) {
        setExpenses(prev => [...prev, expense]);
      }
    };
    window.addEventListener('expense:added', handler as EventListener);
    const undoHandler = (ev: any) => {
      const expense = ev.detail as Expense;
      if (expense && expense.id) {
        // show undoable banner by setting temporary state
        setUndoableExpense(expense);
      }
    };
    window.addEventListener('expense:undoable', undoHandler as EventListener);
    return () => window.removeEventListener('expense:added', handler as EventListener);
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

  // Undoable expense UI state
  const [undoableExpense, setUndoableExpense] = useState<Expense | null>(null);
  useEffect(() => {
    if (!undoableExpense) return;
    const t = setTimeout(() => setUndoableExpense(null), 8000);
    return () => clearTimeout(t);
  }, [undoableExpense]);

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
    } catch (err) { showToast('Failed to export CSV', 'error'); }
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
          const parts = line.match(/(?:\"((?:\\\"|[^"])*)\"|[^,]+)/g) || [];
          const vals = parts.map(p => p.replace(/^"|"$/g, ''));
          const obj: any = {};
          headers.forEach((h, i) => obj[h.trim()] = vals[i] || '');
          return {
            id: obj.id || Date.now().toString() + Math.floor(Math.random()*1000),
            title: obj.title || 'Imported',
            amount: parseFloat(obj.amount) || 0,
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
    localStorage.setItem('expenses', JSON.stringify(expenses.map(x => x.id === id ? { ...x, title: newTitle, amount: newAmt, category: newCat, note: newNote } : x)));
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

  const [summaryCache, setSummaryCache] = useState<Record<string, { spent: number }>>({});

  useEffect(() => {
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
    setSummaryCache(sums);
  }, [expenses, selectedMonth]);

  const handleUndoExpense = (id?: string) => {
    const eid = id || undoableExpense?.id;
    if (!eid) return;
    setExpenses(prev => prev.filter(e => e.id !== eid));
    try {
      const raw = localStorage.getItem('expenses');
      const arr = raw ? JSON.parse(raw) : [];
      const filtered = arr.filter((ex: any) => ex.id !== eid);
      localStorage.setItem('expenses', JSON.stringify(filtered));
    } catch (err) { console.error('Failed to remove expense on undo', err); }
    setUndoableExpense(null);
  };

  return (
    <div className="p-6">
      {undoableExpense && (
        <div className="mb-4 p-3 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 flex items-center justify-between">
          <div>
            <div className="font-medium">Expense added: {undoableExpense.title}</div>
            <div className="text-xs text-gray-600">${undoableExpense.amount.toFixed(2)} · {undoableExpense.category}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleUndoExpense()} className="px-3 py-1 bg-white rounded border">Undo</button>
            <button onClick={() => setUndoableExpense(null)} className="px-2 py-1 text-sm text-gray-500">Dismiss</button>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Expenses & Budget Planner</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Budgets */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Budgets</h2>
          <div className="space-y-2 mb-4">
            <input placeholder="Category" value={categoryInput} onChange={e => setCategoryInput(e.target.value)} className="w-full px-3 py-2 rounded border" />
            <input placeholder="Monthly amount" value={budgetAmountInput} onChange={e => setBudgetAmountInput(e.target.value)} className="w-full px-3 py-2 rounded border" />
            <button onClick={addBudget} className="w-full bg-orange-600 text-white py-2 rounded">Add Budget</button>
          </div>

          <div className="space-y-2">
            {budgets.length === 0 && <p className="text-sm text-gray-500">No budgets yet.</p>}
            {budgets.map(b => (
              <div key={b.id} className="flex items-center justify-between border p-2 rounded">
                <div>
                  <div className="font-medium">{b.category}</div>
                  <div className="text-xs text-gray-500">${b.amount.toFixed(2)} / month</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => editBudget(b.id)} className="text-blue-500 text-sm">Edit</button>
                  <button onClick={() => deleteBudget(b.id)} className="text-red-500 text-sm">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Add Expense */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Add Expense</h2>
            <div className="flex items-center gap-2">
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-2 py-1 border rounded" />
              <button onClick={exportCSV} className="px-3 py-1 rounded border bg-white">Export CSV</button>
              <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 rounded border bg-white">Import CSV</button>
              <input ref={fileInputRef} type="file" accept="text/csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) importCSV(f); e.currentTarget.value = ''; }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input placeholder="Title" value={expenseTitle} onChange={e => setExpenseTitle(e.target.value)} className="px-3 py-2 rounded border" />
            <input placeholder="Amount" type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} className="px-3 py-2 rounded border" />
            <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="px-3 py-2 rounded border" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <select value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} className="px-3 py-2 rounded border">
              <option value="">Select category</option>
              {budgets.map(b => <option key={b.id} value={b.category}>{b.category}</option>)}
              <option value="Uncategorized">Uncategorized</option>
            </select>
            <input placeholder="Note (optional)" value={expenseNote} onChange={e => setExpenseNote(e.target.value)} className="px-3 py-2 rounded border" />
            <div>
              <button onClick={addExpense} className="w-full bg-orange-600 text-white py-2 rounded">Add Expense</button>
            </div>
          </div>

          <h3 className="font-semibold mt-4">Expenses for {selectedMonth}</h3>
          <div className="space-y-2 mt-2">
            {expenses.filter(exp => exp.date.startsWith(selectedMonth)).length === 0 && <p className="text-sm text-gray-500">No expenses for this month.</p>}
            {expenses.filter(exp => exp.date.startsWith(selectedMonth)).map(exp => (
              <div key={exp.id} className="flex items-center justify-between border p-2 rounded">
                <div>
                  <div className="font-medium">{exp.title}</div>
                  <div className="text-xs text-gray-500">{new Date(exp.date).toLocaleDateString()} · {exp.category}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-medium">${exp.amount.toFixed(2)}</div>
                  <button onClick={() => editExpense(exp.id)} className="text-blue-500 text-sm">Edit</button>
                  <button onClick={() => deleteExpense(exp.id)} className="text-red-500 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Summary & Pots */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-4">
            <h2 className="font-semibold mb-3">Budget Summary — {selectedMonth}</h2>
            {budgets.length === 0 && <p className="text-sm text-gray-500">No budgets to summarize. Add budgets to track spending.</p>}
            <div className="space-y-3">
              {budgets.map(b => {
                const spent = summaryCache[b.category]?.spent || 0;
                const pct = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
                return (
                  <div key={b.id} className="border rounded p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{b.category}</div>
                        <div className="text-xs text-gray-500">${spent.toFixed(2)} spent of ${b.amount.toFixed(2)}</div>
                      </div>
                      <div className="text-sm font-medium">{pct}%</div>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded mt-2 overflow-hidden">
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct > 80 ? '#f87171' : '#fb923c' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mt-4">
            <h2 className="font-semibold mb-3">Pots (Savings Goals)</h2>
            <CreatePotForm onCreate={(name, target) => createPot(name, target)} />
            <div className="space-y-3 mt-3">
              {pots.length === 0 && <p className="text-sm text-gray-500">No pots yet — create one to save for something special.</p>}
              {pots.map(p => {
                const pct = p.target > 0 ? Math.min(100, Math.round((p.saved / p.target) * 100)) : 0;
                return (
                  <div key={p.id} className="border rounded p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">${p.saved.toFixed(2)} of ${p.target.toFixed(2)}</div>
                      </div>
                      <div className="text-sm font-medium">{pct}%</div>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded mt-2 overflow-hidden">
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct > 80 ? '#60a5fa' : '#93c5fd' }} />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input type="number" placeholder="Amount" id={`add-to-${p.id}`} className="px-2 py-1 border rounded w-32" />
                      <button onClick={() => {
                        const el = document.getElementById(`add-to-${p.id}`) as HTMLInputElement | null;
                        if (!el || !el.value) return;
                        const amt = parseFloat(el.value);
                        if (isNaN(amt)) return;
                        addToPot(p.id, amt);
                        el.value = '';
                      }} className="px-3 py-1 rounded bg-green-500 text-white">Add</button>
                      <button onClick={() => editPot(p.id)} className="px-3 py-1 rounded bg-blue-500 text-white">Edit</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small inline form component for creating pots — kept in same file for simplicity
function CreatePotForm({ onCreate }: { onCreate: (name: string, target: number) => void }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  return (
    <div className="flex gap-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Pot name" className="px-2 py-1 border rounded" />
      <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Target amount" className="px-2 py-1 border rounded w-36" />
      <button onClick={() => { const t = parseFloat(target); if (!name || isNaN(t)) return; onCreate(name, t); setName(''); setTarget(''); }} className="px-3 py-1 bg-orange-600 text-white rounded">Create</button>
    </div>
  );
}
