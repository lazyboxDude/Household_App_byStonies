"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Wallet, PiggyBank, Receipt, Users, Settings2, TrendingUp, Trash2, Pencil } from "lucide-react";
import { showToast } from "../../../lib/toast";
import { AccountId, DistSettings, IrregularBill, DistTransaction } from "../types";

const ACCOUNTS: { id: AccountId; name: string; role: string; color: string; icon: typeof Wallet }[] = [
  { id: "main", name: "Hauptkonto", role: "Puffer & Taschengeld", color: "#16a34a", icon: Wallet },
  { id: "taxes", name: "Steuern", role: "Dauerauftrag", color: "#7c3aed", icon: PiggyBank },
  { id: "bills", name: "Rechnungen", role: "Jahres- & Halbjahresrechnungen", color: "#2563eb", icon: Receipt },
  { id: "joint", name: "Gemeinsamer Haushalt", role: "Essen & Haushalt", color: "#db2777", icon: Users },
];
const ACC = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a])) as Record<AccountId, (typeof ACCOUNTS)[number]>;
const MON = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const DEFAULT_SETTINGS: DistSettings = { taxes: 0, bills: 0, joint: 0, minBuffer: 0 };
const DEFAULT_OPENING: Record<AccountId, number> = { main: 0, taxes: 0, bills: 0, joint: 0 };

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}
function r2(n: number) {
  return Math.round(n * 100) / 100;
}
function fmt(n: number) {
  const v = r2(n);
  return v.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function chf(n: number, sign = false) {
  return (sign && n > 0 ? "+" : "") + fmt(n) + " CHF";
}
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fdate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
function curYM() {
  return todayIso().slice(0, 7);
}

function balances(opening: Record<AccountId, number>, tx: DistTransaction[]): Record<AccountId, number> {
  const b = { ...opening };
  for (const t of tx) b[t.account] = r2((b[t.account] || 0) + t.amount);
  return b;
}
function fixedTotal(s: DistSettings) {
  return s.taxes + s.bills + s.joint;
}
function annual(b: IrregularBill) {
  return b.amount * b.months.length;
}
function monthlySoll(bills: IrregularBill[]) {
  return r2(bills.reduce((s, b) => s + annual(b) / 12, 0));
}
function dueIn(bills: IrregularBill[], m: number) {
  return bills.filter((b) => b.months.includes(m));
}
function sollStand(bills: IrregularBill[]) {
  const cm = new Date().getMonth() + 1;
  let need = 0;
  for (const b of bills) {
    if (!b.months.length) continue;
    const ms = [...b.months].sort((a, c) => a - c);
    let prev = ms.filter((m) => m <= cm).pop();
    if (prev === undefined) prev = ms[ms.length - 1];
    let next = ms.find((m) => m > cm);
    if (next === undefined) next = ms[0];
    const gap = ((next - prev + 12) % 12) || 12;
    const el = (cm - prev + 12) % 12;
    need += (b.amount * el) / gap;
  }
  return r2(need);
}
type ProjectionMonth = { m: number; y: number; pay: number; due: IrregularBill[]; bal: number };
function projection(bills: IrregularBill[], settings: DistSettings, billsBalance: number): ProjectionMonth[] {
  const t = new Date();
  const cm = t.getMonth() + 1;
  const y = t.getFullYear();
  let bal = billsBalance;
  const out: ProjectionMonth[] = [];
  for (let i = 1; i <= 12; i++) {
    let m = cm + i;
    let yy = y;
    while (m > 12) {
      m -= 12;
      yy++;
    }
    const due = dueIn(bills, m);
    const pay = due.reduce((s, b) => s + b.amount, 0);
    bal = r2(bal + settings.bills - pay);
    out.push({ m, y: yy, pay, due, bal });
  }
  return out;
}
function makeDistribution(income: number, date: string, settings: DistSettings): DistTransaction[] {
  const g = uid();
  return [
    { id: uid(), group: g, kind: "income", date, account: "main", amount: r2(income), desc: "Lohneingang" },
    { id: uid(), group: g, kind: "transfer", date, account: "main", amount: -settings.taxes, desc: "Dauerauftrag → Steuern" },
    { id: uid(), group: g, kind: "transfer", date, account: "taxes", amount: settings.taxes, desc: "Dauerauftrag Steuern" },
    { id: uid(), group: g, kind: "transfer", date, account: "main", amount: -settings.bills, desc: "Dauerauftrag → Rechnungen" },
    { id: uid(), group: g, kind: "transfer", date, account: "bills", amount: settings.bills, desc: "Dauerauftrag Rechnungen" },
    { id: uid(), group: g, kind: "transfer", date, account: "main", amount: -settings.joint, desc: "Dauerauftrag → Gemeinsam" },
    { id: uid(), group: g, kind: "transfer", date, account: "joint", amount: settings.joint, desc: "Dauerauftrag Gemeinsam" },
  ];
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

type SubTab = "uebersicht" | "lohn" | "planer" | "einstellungen";

export default function Verteilertopf() {
  const [subTab, setSubTab] = useState<SubTab>("uebersicht");
  const [settings, setSettings] = useState<DistSettings>(() => loadJSON("verteilertopf_settings", DEFAULT_SETTINGS));
  const [opening, setOpening] = useState<Record<AccountId, number>>(() => loadJSON("verteilertopf_opening", DEFAULT_OPENING));
  const [bills, setBills] = useState<IrregularBill[]>(() => loadJSON("verteilertopf_bills", []));
  const [tx, setTx] = useState<DistTransaction[]>(() => loadJSON("verteilertopf_tx", []));

  useEffect(() => { localStorage.setItem("verteilertopf_settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem("verteilertopf_opening", JSON.stringify(opening)); }, [opening]);
  useEffect(() => { localStorage.setItem("verteilertopf_bills", JSON.stringify(bills)); }, [bills]);
  useEffect(() => { localStorage.setItem("verteilertopf_tx", JSON.stringify(tx)); }, [tx]);

  const bal = useMemo(() => balances(opening, tx), [opening, tx]);
  const ft = fixedTotal(settings);
  const status: "ok" | "warn" | "bad" = bal.main < 0 ? "bad" : bal.main < settings.minBuffer ? "warn" : "ok";

  const dists = useMemo(
    () => tx.filter((t) => t.kind === "income" && t.group).sort((a, b) => b.date.localeCompare(a.date)),
    [tx]
  );
  const alreadyDistributedThisMonth = dists.some((d) => d.date.startsWith(curYM()));

  const soll = sollStand(bills);
  const msoll = monthlySoll(bills);
  const proj = useMemo(() => projection(bills, settings, bal.bills), [bills, settings, bal.bills]);
  const minP = proj.length ? proj.reduce((a, p) => (p.bal < a.bal ? p : a), proj[0]) : null;

  // --- Lohn verteilen ---
  const [incomeInput, setIncomeInput] = useState("");
  const [incomeDate, setIncomeDate] = useState(todayIso());
  const incomeVal = parseFloat(incomeInput.replace(",", "."));
  const validIncome = !isNaN(incomeVal) && incomeVal > 0;
  const rest = validIncome ? r2(incomeVal - ft) : 0;
  const afterMain = validIncome ? r2(bal.main + rest) : bal.main;

  const distributeIncome = () => {
    if (!validIncome) return;
    const batch = makeDistribution(incomeVal, incomeDate, settings);
    setTx((prev) => [...prev, ...batch]);
    setIncomeInput("");
    showToast(`Lohn verteilt: ${chf(incomeVal)}`, "success");
  };

  // --- Rechnungen-Planer form ---
  const [billName, setBillName] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billMonths, setBillMonths] = useState<number[]>([]);
  const [editBillId, setEditBillId] = useState<string | null>(null);
  const [confirmDeleteBill, setConfirmDeleteBill] = useState<string | null>(null);

  const resetBillForm = () => {
    setBillName(""); setBillAmount(""); setBillMonths([]); setEditBillId(null);
  };
  const startEditBill = (b: IrregularBill) => {
    setEditBillId(b.id); setBillName(b.name); setBillAmount(String(b.amount)); setBillMonths(b.months);
  };
  const toggleMonth = (m: number) => {
    setBillMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, c) => a - c)));
  };
  const submitBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(billAmount.replace(",", "."));
    if (!billName.trim() || isNaN(amt) || billMonths.length === 0) {
      showToast("Bitte Name, Betrag und mindestens einen Monat angeben", "error");
      return;
    }
    if (editBillId) {
      setBills((prev) => prev.map((b) => (b.id === editBillId ? { ...b, name: billName.trim(), amount: r2(amt), months: billMonths } : b)));
      showToast("Rechnung aktualisiert", "success");
    } else {
      setBills((prev) => [...prev, { id: uid(), name: billName.trim(), amount: r2(amt), months: billMonths }]);
      showToast("Rechnung hinzugefügt", "success");
    }
    resetBillForm();
  };
  const deleteBill = (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
    setConfirmDeleteBill(null);
    if (editBillId === id) resetBillForm();
  };

  // --- Einstellungen form ---
  const [setTaxes, setSetTaxes] = useState(String(settings.taxes));
  const [setBills_, setSetBills] = useState(String(settings.bills));
  const [setJoint, setSetJoint] = useState(String(settings.joint));
  const [setMin, setSetMin] = useState(String(settings.minBuffer));
  useEffect(() => {
    setSetTaxes(String(settings.taxes));
    setSetBills(String(settings.bills));
    setSetJoint(String(settings.joint));
    setSetMin(String(settings.minBuffer));
  }, [settings]);
  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseFloat(setTaxes.replace(",", ".")) || 0;
    const b = parseFloat(setBills_.replace(",", ".")) || 0;
    const j = parseFloat(setJoint.replace(",", ".")) || 0;
    const mb = parseFloat(setMin.replace(",", ".")) || 0;
    setSettings({ taxes: r2(t), bills: r2(b), joint: r2(j), minBuffer: r2(mb) });
    showToast("Einstellungen gespeichert", "success");
  };

  const [balInputs, setBalInputs] = useState<Record<AccountId, string>>(() =>
    Object.fromEntries(ACCOUNTS.map((a) => [a.id, String(bal[a.id])])) as Record<AccountId, string>
  );
  useEffect(() => {
    setBalInputs(Object.fromEntries(ACCOUNTS.map((a) => [a.id, String(bal[a.id])])) as Record<AccountId, string>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);
  const applyBalances = (e: React.FormEvent) => {
    e.preventDefault();
    setOpening((prevOpening) => {
      const next = { ...prevOpening };
      for (const a of ACCOUNTS) {
        const entered = parseFloat((balInputs[a.id] || "0").replace(",", "."));
        if (isNaN(entered)) continue;
        const txSum = tx.filter((t) => t.account === a.id).reduce((s, t) => s + t.amount, 0);
        next[a.id] = r2(entered - txSum);
      }
      return next;
    });
    showToast("Kontostände übernommen", "success");
  };

  const upcoming = proj.slice(0, 4).filter((p) => p.pay > 0);

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {([
          ["uebersicht", "Übersicht"],
          ["lohn", "Lohn verteilen"],
          ["planer", "Rechnungen-Planer"],
          ["einstellungen", "Einstellungen"],
        ] as [SubTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              subTab === key
                ? "border-teal-600 text-teal-600 dark:text-teal-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "uebersicht" && (
        <div className="space-y-6">
          {status === "bad" && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm">
              <b className="block text-red-700 dark:text-red-400">Hauptkonto im Minus: {chf(bal.main)}</b>
              <span className="text-red-600 dark:text-red-300">Keine privaten Ausgaben mehr, bis der nächste Lohn verteilt ist.</span>
            </div>
          )}
          {status === "warn" && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm">
              <b className="block text-yellow-700 dark:text-yellow-400">Puffer unter {chf(settings.minBuffer)}</b>
              <span className="text-yellow-600 dark:text-yellow-300">Es fehlen {chf(settings.minBuffer - bal.main)} bis zum Mindestpuffer.</span>
            </div>
          )}

          {/* Hero */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border-l-4" style={{ borderLeftColor: status === "bad" ? "#dc2626" : status === "warn" ? "#d97706" : ACC.main.color }}>
            <div className="text-xs uppercase tracking-wide text-gray-500">Hauptkonto · Puffer &amp; Taschengeld</div>
            <div className="text-4xl font-semibold mt-1" style={{ color: status === "bad" ? "#dc2626" : undefined }}>{fmt(bal.main)} <span className="text-lg text-gray-400">CHF</span></div>
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-gray-100 dark:border-gray-700 pt-3 text-sm">
              <div>
                <div className="text-xs text-gray-500">Reicht für</div>
                <div className="font-medium">{ft > 0 ? (bal.main / ft).toFixed(1).replace(".", ",") : "0"} Monate</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Lohn {MS[+curYM().slice(5) - 1]}</div>
                <div className="font-medium">{alreadyDistributedThisMonth ? "verteilt" : "noch nicht verteilt"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Fixabzüge / Monat</div>
                <div className="font-medium">{chf(ft)}</div>
              </div>
            </div>
          </div>

          {/* Account cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ACCOUNTS.filter((a) => a.id !== "main").map((a) => {
              const per = settings[a.id as "taxes" | "bills" | "joint"];
              const Icon = a.icon;
              return (
                <div key={a.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: a.color }} />
                    <span className="font-medium text-sm">{a.name}</span>
                    <span className="ml-auto text-xs text-gray-400">+{fmt(per)}/Mt.</span>
                  </div>
                  <div className="text-2xl font-semibold" style={{ color: bal[a.id] < 0 ? "#dc2626" : undefined }}>{fmt(bal[a.id])}</div>
                  {a.id === "bills" && (
                    <div className="text-xs text-gray-500 mt-1">
                      Soll-Stand {chf(soll)} · {bal.bills >= soll ? <span className="text-green-600">gedeckt</span> : <span className="text-amber-600">Lücke {chf(soll - bal.bills)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">Nächste Grossrechnungen</h3>
              {upcoming.length === 0 && <p className="text-sm text-gray-500">Keine Rechnungen in den nächsten 4 Monaten.</p>}
              <div className="space-y-2">
                {upcoming.map((p) =>
                  p.due.map((x) => (
                    <div key={x.id + p.m} className="flex items-center justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-2 first:border-0 first:pt-0">
                      <div>
                        <div className="font-medium">{x.name}</div>
                        <div className="text-xs text-gray-500">{MON[p.m - 1]} {p.y}</div>
                      </div>
                      <div className="font-medium">{chf(-x.amount)}</div>
                    </div>
                  ))
                )}
              </div>
              {minP && (
                <div className={`mt-3 text-xs p-2 rounded ${minP.bal < 0 ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" : "bg-gray-50 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300"}`}>
                  Tiefster Stand in 12 Monaten: {chf(minP.bal)} ({MON[minP.m - 1]})
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">Letzte Verteilungen</h3>
              {dists.length === 0 && <p className="text-sm text-gray-500">Noch kein Lohn verteilt.</p>}
              <div className="space-y-2">
                {dists.slice(0, 6).map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-2 first:border-0 first:pt-0">
                    <div>
                      <div className="font-medium">Lohn verteilt</div>
                      <div className="text-xs text-gray-500">{fdate(d.date)}</div>
                    </div>
                    <div className="font-medium text-green-600">{chf(d.amount, true)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === "lohn" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-semibold mb-1">Lohneingang erfassen</h3>
            <p className="text-xs text-gray-500 mb-4">Der ganze Lohn landet zuerst auf dem Hauptkonto. Danach gehen die Daueraufträge raus, der Rest bleibt als Puffer.</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Lohn diesen Monat (CHF)</label>
                <input
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="z. B. 4200"
                  className="w-full px-3 py-2 rounded border text-2xl font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Datum Lohneingang</label>
                <input type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} className="px-3 py-2 rounded border" />
              </div>
              {alreadyDistributedThisMonth && (
                <div className="text-xs p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                  Diesen Monat wurde bereits verteilt. Ein zweiter Lohn würde die Daueraufträge erneut abziehen.
                </div>
              )}
              {validIncome && (
                <div className="border rounded-lg p-3 space-y-1 text-sm bg-gray-50 dark:bg-gray-700/30">
                  <div className="flex justify-between"><span>Lohneingang Hauptkonto</span><span className="font-mono text-green-600">{chf(incomeVal, true)}</span></div>
                  {(["taxes", "bills", "joint"] as const).map((id) => (
                    <div key={id} className="flex justify-between"><span>→ {ACC[id].name}</span><span className="font-mono">{chf(-settings[id])}</span></div>
                  ))}
                  <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-600 pt-1">
                    <span>{rest >= 0 ? "Bleibt als Puffer" : "Puffer schrumpft um"}</span>
                    <span className="font-mono" style={{ color: rest >= 0 ? "#16a34a" : "#dc2626" }}>{chf(rest, true)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500"><span>Hauptkonto danach</span><span className="font-mono">{chf(afterMain)}</span></div>
                  {rest < 0 && <div className="text-xs text-red-600 pt-1">Der Lohn deckt die Fixabzüge nicht. Fehlbetrag {chf(-rest)} kommt aus dem Puffer.</div>}
                </div>
              )}
              <button
                onClick={distributeIncome}
                disabled={!validIncome}
                className="w-full bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-2 rounded font-medium"
              >
                Lohn verteilen
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Lohnverlauf</h3>
            {dists.length === 0 && <p className="text-sm text-gray-500">Noch kein Lohn verteilt.</p>}
            <div className="space-y-2">
              {dists.slice(0, 12).map((d) => (
                <div key={d.id} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-xs text-gray-500 font-mono">{fdate(d.date).slice(0, 6)}</span>
                  <div className="flex-1 h-2 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{ width: `${Math.min(100, (d.amount / Math.max(...dists.map((x) => x.amount), 1)) * 100)}%`, background: d.amount < ft ? "#d97706" : "#16a34a" }}
                    />
                  </div>
                  <span className="w-20 text-right font-mono text-xs">{fmt(d.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {subTab === "planer" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Rechnungen-Konto: Soll vs. Ist</h3>
              <span className="text-xs text-gray-500">Dauerauftrag {chf(settings.bills)} / Monat</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3"><div className="text-xs text-gray-500">Ist-Stand</div><div className="font-mono font-medium">{fmt(bal.bills)}</div></div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3"><div className="text-xs text-gray-500">Soll-Stand heute</div><div className="font-mono font-medium">{fmt(soll)}</div></div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3"><div className="text-xs text-gray-500">Nötig pro Monat</div><div className="font-mono font-medium">{fmt(msoll)}</div></div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3"><div className="text-xs text-gray-500">Dauerauftrag − Soll</div><div className="font-mono font-medium" style={{ color: settings.bills - msoll >= 0 ? "#16a34a" : "#dc2626" }}>{settings.bills - msoll >= 0 ? "+" : ""}{fmt(settings.bills - msoll)}</div></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Prognose nächste 12 Monate</h3>
              {minP && (minP.bal < 0 ? <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Engpass im {MON[minP.m - 1]}</span> : <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Alle Rechnungen gedeckt</span>)}
            </div>
            <ForecastChart proj={proj} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3">Unregelmässige Rechnungen</h3>
              {bills.length === 0 && <p className="text-sm text-gray-500">Noch keine Rechnungen erfasst.</p>}
              <div className="space-y-2">
                {bills.map((b) => (
                  <div key={b.id} className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-2 first:border-0 first:pt-0 text-sm">
                    <div>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-gray-500">{b.months.map((m) => MS[m - 1]).join(", ")} · {chf(b.amount)}/Fälligkeit · {chf(annual(b))}/Jahr</div>
                    </div>
                    {confirmDeleteBill === b.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => deleteBill(b.id)} className="text-xs px-2 py-1 rounded bg-red-600 text-white">Löschen</button>
                        <button onClick={() => setConfirmDeleteBill(null)} className="text-xs px-2 py-1 rounded border">Abbrechen</button>
                      </div>
                    ) : (
                      <div className="flex gap-2 text-gray-400">
                        <button onClick={() => startEditBill(b)} title="Bearbeiten"><Pencil className="w-4 h-4 hover:text-blue-500" /></button>
                        <button onClick={() => setConfirmDeleteBill(b.id)} title="Löschen"><Trash2 className="w-4 h-4 hover:text-red-500" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{editBillId ? "Rechnung bearbeiten" : "Rechnung hinzufügen"}</h3>
                {editBillId && <button onClick={resetBillForm} className="text-xs text-gray-500 underline">Abbrechen</button>}
              </div>
              <form onSubmit={submitBill} className="space-y-3">
                <input value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="z. B. Krankenkasse" className="w-full px-3 py-2 rounded border" />
                <input value={billAmount} onChange={(e) => setBillAmount(e.target.value)} inputMode="decimal" placeholder="Betrag pro Fälligkeit (CHF)" className="w-full px-3 py-2 rounded border font-mono" />
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Fällig im Monat (mehrere möglich)</label>
                  <div className="grid grid-cols-6 gap-1">
                    {MS.map((m, i) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleMonth(i + 1)}
                        className={`text-xs py-1 rounded border ${billMonths.includes(i + 1) ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded font-medium">{editBillId ? "Änderungen speichern" : "Rechnung hinzufügen"}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {subTab === "einstellungen" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Daueraufträge &amp; Puffer</h3>
            <form onSubmit={saveSettings} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 block mb-1">Steuern / Monat</label><input value={setTaxes} onChange={(e) => setSetTaxes(e.target.value)} className="w-full px-3 py-2 rounded border font-mono" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Rechnungen / Monat</label><input value={setBills_} onChange={(e) => setSetBills(e.target.value)} className="w-full px-3 py-2 rounded border font-mono" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Gemeinsamer Haushalt / Monat</label><input value={setJoint} onChange={(e) => setSetJoint(e.target.value)} className="w-full px-3 py-2 rounded border font-mono" /></div>
                <div><label className="text-xs text-gray-500 block mb-1">Mindestpuffer Hauptkonto</label><input value={setMin} onChange={(e) => setSetMin(e.target.value)} className="w-full px-3 py-2 rounded border font-mono" /></div>
              </div>
              <p className="text-xs text-gray-500">Summe Fixabzüge: <b>{chf(fixedTotal(settings))}</b> pro Monat. Änderungen gelten für künftige Verteilungen.</p>
              <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded font-medium">Speichern</button>
            </form>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Kontostände abgleichen</h3>
            <p className="text-xs text-gray-500 mb-3">Trag den echten Saldo aus dem E-Banking ein. Die App bucht die Differenz als Startsaldo.</p>
            <form onSubmit={applyBalances} className="space-y-3">
              {ACCOUNTS.map((a) => (
                <div key={a.id}>
                  <label className="text-xs text-gray-500 block mb-1">{a.name}</label>
                  <input
                    value={balInputs[a.id] ?? ""}
                    onChange={(e) => setBalInputs((p) => ({ ...p, [a.id]: e.target.value }))}
                    className="w-full px-3 py-2 rounded border font-mono"
                  />
                </div>
              ))}
              <button type="submit" className="w-full border py-2 rounded font-medium">Kontostände übernehmen</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function niceStep(range: number) {
  const p = Math.pow(10, Math.floor(Math.log10(range || 1)));
  const n = range / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function ForecastChart({ proj }: { proj: ProjectionMonth[] }) {
  const W = 720, H = 220, L = 56, R = 10, T = 16, B = 34, iw = W - L - R, ih = H - T - B;
  const vals = proj.map((p) => p.bal);
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  const step = niceStep((hi - lo) / 4 || 1000);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  if (hi === lo) hi = lo + step;
  const y = (v: number) => T + ih - ((v - lo) / (hi - lo)) * ih;
  const bw = iw / (proj.length || 1);
  const gridLines: React.ReactNode[] = [];
  for (let v = lo; v <= hi + 1e-6; v += step) {
    gridLines.push(
      <React.Fragment key={v}>
        <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
        <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.6}>{fmt(v).replace(".00", "")}</text>
      </React.Fragment>
    );
  }
  return (
    <div className="overflow-x-auto text-gray-700 dark:text-gray-300">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[560px] w-full h-auto" role="img" aria-label="Prognose Kontostand Rechnungen">
        {gridLines}
        <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.5} />
        {proj.map((p, i) => {
          const x = L + i * bw + bw * 0.18, w = bw * 0.64, y0 = y(0), yv = y(p.bal);
          const top = Math.min(y0, yv), h = Math.max(1, Math.abs(yv - y0));
          const col = p.bal < 0 ? "#dc2626" : "#2563eb";
          const isDec = p.m === 12;
          return (
            <g key={i}>
              <rect x={x} y={top} width={w} height={h} rx={3} fill={col} fillOpacity={isDec || p.bal < 0 ? 1 : 0.55}>
                <title>{MON[p.m - 1]} {p.y}: {chf(p.bal)}{p.pay ? ` · Zahlungen ${chf(-p.pay)} (${p.due.map((d) => d.name).join(", ")})` : ""}</title>
              </rect>
              {p.pay > 0 && <circle cx={x + w / 2} cy={H - B + 22} r={3} fill="#d97706" />}
              <text x={x + w / 2} y={H - B + 13} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={isDec ? 1 : 0.6}>{MS[p.m - 1]}</text>
            </g>
          );
        })}
      </svg>
      <div className="text-xs text-gray-500 mt-1">● Monat mit fälliger Rechnung · Balken = Kontostand Ende Monat</div>
    </div>
  );
}
