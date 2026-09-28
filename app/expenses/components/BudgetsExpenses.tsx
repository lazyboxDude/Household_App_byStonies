"use client";

import React, { useRef, useState } from "react";
import { showToast } from "../../../lib/toast";
import { fmt, r2 } from "../format";
import { useBudgets } from "../hooks/useBudgets";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function BudgetsExpenses({ budgets: b }: { budgets: ReturnType<typeof useBudgets> }) {
  const { budgets, expenses, addBudget, deleteBudget, editBudget, addExpense, editExpense, deleteExpense, importExpenses, spentByCategory } = b;

  const [categoryInput, setCategoryInput] = useState("");
  const [budgetAmountInput, setBudgetAmountInput] = useState("");

  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseNote, setExpenseNote] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const handleAddBudget = async () => {
    if (!categoryInput || !budgetAmountInput) return;
    await addBudget(categoryInput, r2(Number(budgetAmountInput)));
    setCategoryInput("");
    setBudgetAmountInput("");
  };

  const handleEditBudget = async (id: string) => {
    const budget = budgets.find((x) => x.id === id);
    if (!budget) return;
    const newCat = window.prompt("Kategorie bearbeiten", budget.category);
    if (newCat === null) return;
    const newAmtRaw = window.prompt("Monatliches Budget bearbeiten", String(budget.amount));
    if (newAmtRaw === null) return;
    const newAmt = parseFloat(newAmtRaw.replace(",", "."));
    if (isNaN(newAmt)) return showToast("Ungültiger Betrag", "error");
    await editBudget(id, newCat.trim(), r2(newAmt));
  };

  const handleAddExpense = async () => {
    if (!expenseTitle || !expenseAmount) return;
    const ok = await addExpense({
      title: expenseTitle,
      amount: r2(Number(expenseAmount)),
      date: expenseDate,
      category: expenseCategory,
      note: expenseNote || undefined,
    });
    if (ok) {
      setExpenseTitle("");
      setExpenseAmount("");
      setExpenseNote("");
    }
  };

  const handleEditExpense = async (id: string) => {
    const ex = expenses.find((x) => x.id === id);
    if (!ex) return;
    const newTitle = window.prompt("Titel bearbeiten", ex.title);
    if (newTitle === null) return;
    const newAmtRaw = window.prompt("Betrag bearbeiten", String(ex.amount));
    if (newAmtRaw === null) return;
    const newAmt = parseFloat(newAmtRaw.replace(",", "."));
    if (isNaN(newAmt)) return showToast("Ungültiger Betrag", "error");
    const newCat = window.prompt("Kategorie bearbeiten", ex.category) || ex.category;
    const newNote = window.prompt("Notiz bearbeiten", ex.note || "") || undefined;
    await editExpense(id, { title: newTitle, amount: r2(newAmt), category: newCat, note: newNote });
  };

  // CSV import/export
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const exportCSV = () => {
    try {
      const rows = expenses.map((e) => ({ id: e.id, title: e.title, amount: e.amount, date: e.date, category: e.category, note: e.note || "" }));
      const header = Object.keys(rows[0] || {}).join(",");
      const csv = [header, ...rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ausgaben_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Ausgaben als CSV exportiert", "success");
    } catch {
      showToast("CSV-Export fehlgeschlagen", "error");
    }
  };

  const importCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) return showToast("CSV leer oder ungültig", "error");
        const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, ""));
        const imported = lines.slice(1).map((line) => {
          const parts = line.match(/(?:"((?:\\"|[^"])*)"|[^,]+)/g) || [];
          const vals = parts.map((p) => p.replace(/^"|"$/g, ""));
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[h.trim()] = vals[i] || "";
          });
          return {
            title: obj.title || "Importiert",
            amount: parseFloat(obj.amount || "0") || 0,
            date: obj.date || new Date().toISOString(),
            category: obj.category || "Sonstiges",
            note: obj.note || undefined,
          };
        });
        const count = await importExpenses(imported);
        showToast(`${count} Ausgaben importiert`, "success");
      } catch (err) {
        console.error(err);
        showToast("CSV-Import fehlgeschlagen", "error");
      }
    };
    reader.readAsText(file);
  };

  const spent = spentByCategory(selectedMonth);
  const monthExpenses = expenses.filter((exp) => exp.date.startsWith(selectedMonth));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-rise items-start">
      {/* Left: Budgets */}
      <div className="surface p-4">
        <h2 className="text-headline mb-3">Budgets</h2>
        <div className="space-y-2 mb-4">
          <input placeholder="Kategorie" value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)} className="field" />
          <input placeholder="Betrag pro Monat" value={budgetAmountInput} onChange={(e) => setBudgetAmountInput(e.target.value)} className="field" />
          <button onClick={handleAddBudget} className="btn btn-primary w-full">Budget hinzufügen</button>
        </div>

        <div className="space-y-2">
          {budgets.length === 0 && <p className="text-caption">Noch keine Budgets.</p>}
          {budgets.map((b) => (
            <div key={b.id} className="flex items-center justify-between border divider p-2 rounded-[var(--radius-sm)]">
              <div>
                <div className="font-medium text-sm">{b.category}</div>
                <div className="text-xs text-[var(--text-secondary)]">{fmt(b.amount)} CHF / Monat</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEditBudget(b.id)} className="press text-blue-500 text-sm">Bearbeiten</button>
                <button onClick={() => deleteBudget(b.id)} className="press text-[var(--danger)] text-sm">Entfernen</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Middle: Add Expense */}
      <div className="surface p-4 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-headline">Ausgabe erfassen</h2>
          <div className="flex items-center gap-2">
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="field py-1.5 text-sm w-auto" />
            <button onClick={exportCSV} className="btn btn-secondary btn-sm">CSV exportieren</button>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary btn-sm">CSV importieren</button>
            <input
              ref={fileInputRef}
              type="file"
              accept="text/csv"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCSV(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <input placeholder="Titel" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} className="field" />
          <input placeholder="Betrag" type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className="field" />
          <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="field" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className="field">
            <option value="">Kategorie wählen</option>
            {budgets.map((b) => (
              <option key={b.id} value={b.category}>{b.category}</option>
            ))}
            <option value="Sonstiges">Sonstiges</option>
          </select>
          <input placeholder="Notiz (optional)" value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} className="field" />
          <button onClick={handleAddExpense} className="btn btn-primary">Ausgabe hinzufügen</button>
        </div>

        <h3 className="text-headline mt-4">Ausgaben für {selectedMonth}</h3>
        <div className="space-y-2 mt-2">
          {monthExpenses.length === 0 && <p className="text-caption">Keine Ausgaben in diesem Monat.</p>}
          {monthExpenses.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between border divider p-2 rounded-[var(--radius-sm)]">
              <div>
                <div className="font-medium text-sm">{exp.title}</div>
                <div className="text-xs text-[var(--text-secondary)]">{new Date(exp.date).toLocaleDateString("de-CH")} · {exp.category}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="font-medium text-sm">{fmt(exp.amount)} CHF</div>
                <button onClick={() => handleEditExpense(exp.id)} className="press text-blue-500 text-sm">Bearbeiten</button>
                <button onClick={() => deleteExpense(exp.id)} className="press text-[var(--danger)] text-sm">Löschen</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Budget summary for the selected month */}
      <div className="lg:col-span-3">
        <div className="surface p-4">
          <h2 className="text-headline mb-3">Budget-Übersicht — {selectedMonth}</h2>
          {budgets.length === 0 && <p className="text-caption">Keine Budgets zum Auswerten. Lege oben ein Budget an.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((b, i) => {
              const s = spent[b.category] || 0;
              const pct = b.amount > 0 ? Math.min(100, Math.round((s / b.amount) * 100)) : 0;
              const remaining = b.amount - s;
              return (
                <div key={b.id} className="surface-2 p-4 animate-rise" style={{ "--stagger-i": i } as React.CSSProperties}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{b.category}</span>
                    <span className="text-xs text-[var(--text-secondary)]">{fmt(s)} / {fmt(b.amount)} CHF</span>
                  </div>
                  <div className="mt-3 h-3 rounded-full bg-[var(--surface-3)] overflow-hidden">
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: pct > 90 ? "var(--danger)" : "var(--accent)",
                        transition: "width var(--dur-slow) var(--ease-spring)",
                      }}
                    />
                  </div>
                  <div className="mt-2 text-xs" style={{ color: remaining < 0 ? "var(--danger)" : "var(--text-secondary)" }}>
                    {remaining >= 0 ? `${fmt(remaining)} CHF übrig` : `${fmt(-remaining)} CHF über Budget`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
