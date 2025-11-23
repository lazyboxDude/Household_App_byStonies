"use client";

import React, { useEffect, useState } from 'react';

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

  return (
    <div className="p-6">
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
            <div>
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-2 py-1 border rounded" />
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
                  <button onClick={() => deleteExpense(exp.id)} className="text-red-500 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Summary */}
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
        </div>
      </div>
    </div>
  );
}
