"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, PiggyBank, Receipt, Users, Settings2, TrendingUp, Trash2, Pencil, Loader2 } from "lucide-react";
import { showToast } from "../../../lib/toast";
import { supabase } from "../../lib/supabase";
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

type SubTab = "uebersicht" | "lohn" | "planer" | "einstellungen";

export default function Verteilertopf({ householdId }: { householdId: string }) {
  const [subTab, setSubTab] = useState<SubTab>("uebersicht");
  const [settings, setSettings] = useState<DistSettings>(DEFAULT_SETTINGS);
  const [opening, setOpening] = useState<Record<AccountId, number>>(DEFAULT_OPENING);
  const [bills, setBills] = useState<IrregularBill[]>([]);
  const [tx, setTx] = useState<DistTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    const { data } = await supabase.from("verteilertopf_config").select("*").eq("household_id", householdId).maybeSingle();
    let row = data;
    if (!row) {
      // First time this household opens the Verteilertopf — seed a default
      // config row. ignoreDuplicates guards against two members racing.
      const { data: seeded } = await supabase
        .from("verteilertopf_config")
        .upsert({ household_id: householdId }, { onConflict: "household_id", ignoreDuplicates: true })
        .select()
        .maybeSingle();
      row = seeded ?? (await supabase.from("verteilertopf_config").select("*").eq("household_id", householdId).maybeSingle()).data;
    }
    if (row) {
      setSettings({ taxes: row.taxes, bills: row.bills, joint: row.joint, minBuffer: row.min_buffer });
      setOpening({ main: row.opening_main, taxes: row.opening_taxes, bills: row.opening_bills, joint: row.opening_joint });
    }
  }, [householdId]);

  const loadBills = useCallback(async () => {
    const { data } = await supabase
      .from("verteilertopf_bills")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    setBills((data ?? []).map((b) => ({ id: b.id, name: b.name, amount: b.amount, months: b.months })));
  }, [householdId]);

  const loadTx = useCallback(async () => {
    const { data } = await supabase
      .from("verteilertopf_tx")
      .select("*")
      .eq("household_id", householdId)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });
    setTx(
      (data ?? []).map((t) => ({
        id: t.id,
        group: t.tx_group ?? undefined,
        kind: t.kind as DistTransaction["kind"],
        date: t.date,
        account: t.account as AccountId,
        amount: t.amount,
        desc: t.description,
      }))
    );
  }, [householdId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([loadConfig(), loadBills(), loadTx()]).finally(() => setIsLoading(false));
  }, [loadConfig, loadBills, loadTx]);

  useEffect(() => {
    const channel = supabase
      .channel(`verteilertopf-${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "verteilertopf_config", filter: `household_id=eq.${householdId}` }, loadConfig)
      .on("postgres_changes", { event: "*", schema: "public", table: "verteilertopf_bills", filter: `household_id=eq.${householdId}` }, loadBills)
      .on("postgres_changes", { event: "*", schema: "public", table: "verteilertopf_tx", filter: `household_id=eq.${householdId}` }, loadTx)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, loadConfig, loadBills, loadTx]);

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

  const distributeIncome = async () => {
    if (!validIncome) return;
    const batch = makeDistribution(incomeVal, incomeDate, settings);
    const { data, error } = await supabase
      .from("verteilertopf_tx")
      .insert(
        batch.map((t) => ({
          household_id: householdId,
          tx_group: t.group,
          kind: t.kind,
          date: t.date,
          account: t.account,
          amount: t.amount,
          description: t.desc,
        }))
      )
      .select();
    if (!error && data) {
      setTx((prev) => [
        ...prev,
        ...data.map((t) => ({
          id: t.id,
          group: t.tx_group ?? undefined,
          kind: t.kind as DistTransaction["kind"],
          date: t.date,
          account: t.account as AccountId,
          amount: t.amount,
          desc: t.description,
        })),
      ]);
      setIncomeInput("");
      showToast(`Lohn verteilt: ${chf(incomeVal)}`, "success");
    }
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
  const submitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(billAmount.replace(",", "."));
    if (!billName.trim() || isNaN(amt) || billMonths.length === 0) {
      showToast("Bitte Name, Betrag und mindestens einen Monat angeben", "error");
      return;
    }
    if (editBillId) {
      const name = billName.trim();
      setBills((prev) => prev.map((b) => (b.id === editBillId ? { ...b, name, amount: r2(amt), months: billMonths } : b)));
      await supabase.from("verteilertopf_bills").update({ name, amount: r2(amt), months: billMonths }).eq("id", editBillId);
      showToast("Rechnung aktualisiert", "success");
    } else {
      const { data, error } = await supabase
        .from("verteilertopf_bills")
        .insert({ household_id: householdId, name: billName.trim(), amount: r2(amt), months: billMonths })
        .select()
        .single();
      if (!error && data) {
        setBills((prev) => [...prev, { id: data.id, name: data.name, amount: data.amount, months: data.months }]);
        showToast("Rechnung hinzugefügt", "success");
      }
    }
    resetBillForm();
  };
  const deleteBill = async (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
    setConfirmDeleteBill(null);
    if (editBillId === id) resetBillForm();
    await supabase.from("verteilertopf_bills").delete().eq("id", id);
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
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseFloat(setTaxes.replace(",", ".")) || 0;
    const b = parseFloat(setBills_.replace(",", ".")) || 0;
    const j = parseFloat(setJoint.replace(",", ".")) || 0;
    const mb = parseFloat(setMin.replace(",", ".")) || 0;
    const next = { taxes: r2(t), bills: r2(b), joint: r2(j), minBuffer: r2(mb) };
    setSettings(next);
    await supabase
      .from("verteilertopf_config")
      .update({ taxes: next.taxes, bills: next.bills, joint: next.joint, min_buffer: next.minBuffer })
      .eq("household_id", householdId);
    showToast("Einstellungen gespeichert", "success");
  };

  const [balInputs, setBalInputs] = useState<Record<AccountId, string>>(() =>
    Object.fromEntries(ACCOUNTS.map((a) => [a.id, String(bal[a.id])])) as Record<AccountId, string>
  );
  useEffect(() => {
    setBalInputs(Object.fromEntries(ACCOUNTS.map((a) => [a.id, String(bal[a.id])])) as Record<AccountId, string>);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab]);
  const applyBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = { ...opening };
    for (const a of ACCOUNTS) {
      const entered = parseFloat((balInputs[a.id] || "0").replace(",", "."));
      if (isNaN(entered)) continue;
      const txSum = tx.filter((t) => t.account === a.id).reduce((s, t) => s + t.amount, 0);
      next[a.id] = r2(entered - txSum);
    }
    setOpening(next);
    await supabase
      .from("verteilertopf_config")
      .update({ opening_main: next.main, opening_taxes: next.taxes, opening_bills: next.bills, opening_joint: next.joint })
      .eq("household_id", householdId);
    showToast("Kontostände übernommen", "success");
  };

  const upcoming = proj.slice(0, 4).filter((p) => p.pay > 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b divider overflow-x-auto">
        {([
          ["uebersicht", "Übersicht"],
          ["lohn", "Lohn verteilen"],
          ["planer", "Rechnungen-Planer"],
          ["einstellungen", "Einstellungen"],
        ] as [SubTab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className="press px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors duration-300"
            style={
              subTab === key
                ? { borderColor: "var(--accent)", color: "var(--accent)" }
                : { borderColor: "transparent", color: "var(--text-secondary)" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "uebersicht" && (
        <div className="space-y-6 animate-rise">
          {status === "bad" && (
            <div className="p-3 rounded-[var(--radius-md)] text-sm" style={{ background: "var(--danger-soft)" }}>
              <b className="block" style={{ color: "var(--danger)" }}>Hauptkonto im Minus: {chf(bal.main)}</b>
              <span style={{ color: "var(--danger)" }}>Keine privaten Ausgaben mehr, bis der nächste Lohn verteilt ist.</span>
            </div>
          )}
          {status === "warn" && (
            <div className="p-3 rounded-[var(--radius-md)] text-sm" style={{ background: "var(--warning-soft)" }}>
              <b className="block" style={{ color: "var(--warning)" }}>Puffer unter {chf(settings.minBuffer)}</b>
              <span style={{ color: "var(--warning)" }}>Es fehlen {chf(settings.minBuffer - bal.main)} bis zum Mindestpuffer.</span>
            </div>
          )}

          {/* Hero */}
          <div
            className="surface p-5 border-l-4"
            style={{ borderLeftColor: status === "bad" ? "var(--danger)" : status === "warn" ? "var(--warning)" : ACC.main.color }}
          >
            <div className="text-micro normal-case tracking-wide">Hauptkonto · Puffer &amp; Taschengeld</div>
            <div className="text-4xl font-semibold mt-1" style={{ color: status === "bad" ? "var(--danger)" : undefined }}>
              {fmt(bal.main)} <span className="text-lg text-[var(--text-tertiary)]">CHF</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 border-t divider pt-3 text-sm">
              <div>
                <div className="text-caption">Reicht für</div>
                <div className="font-medium">{ft > 0 ? (bal.main / ft).toFixed(1).replace(".", ",") : "0"} Monate</div>
              </div>
              <div>
                <div className="text-caption">Lohn {MS[+curYM().slice(5) - 1]}</div>
                <div className="font-medium">{alreadyDistributedThisMonth ? "verteilt" : "noch nicht verteilt"}</div>
              </div>
              <div>
                <div className="text-caption">Fixabzüge / Monat</div>
                <div className="font-medium">{chf(ft)}</div>
              </div>
            </div>
          </div>

          {/* Account cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ACCOUNTS.filter((a) => a.id !== "main").map((a, i) => {
              const per = settings[a.id as "taxes" | "bills" | "joint"];
              const Icon = a.icon;
              return (
                <div key={a.id} className="surface card-interactive p-4 animate-rise" style={{ "--stagger-i": i } as React.CSSProperties}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color: a.color }} />
                    <span className="font-medium text-sm">{a.name}</span>
                    <span className="ml-auto text-xs text-[var(--text-tertiary)]">+{fmt(per)}/Mt.</span>
                  </div>
                  <div className="text-2xl font-semibold" style={{ color: bal[a.id] < 0 ? "var(--danger)" : undefined }}>{fmt(bal[a.id])}</div>
                  {a.id === "bills" && (
                    <div className="text-xs text-[var(--text-secondary)] mt-1">
                      Soll-Stand {chf(soll)} ·{" "}
                      {bal.bills >= soll ? (
                        <span style={{ color: "var(--success)" }}>gedeckt</span>
                      ) : (
                        <span style={{ color: "var(--warning)" }}>Lücke {chf(soll - bal.bills)}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="surface p-4">
              <h3 className="text-headline mb-3">Nächste Grossrechnungen</h3>
              {upcoming.length === 0 && <p className="text-caption">Keine Rechnungen in den nächsten 4 Monaten.</p>}
              <div className="space-y-2">
                {upcoming.map((p) =>
                  p.due.map((x) => (
                    <div key={x.id + p.m} className="flex items-center justify-between text-sm border-t divider pt-2 first:border-0 first:pt-0">
                      <div>
                        <div className="font-medium">{x.name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{MON[p.m - 1]} {p.y}</div>
                      </div>
                      <div className="font-medium">{chf(-x.amount)}</div>
                    </div>
                  ))
                )}
              </div>
              {minP && (
                <div
                  className="mt-3 text-xs p-2 rounded-[var(--radius-sm)]"
                  style={minP.bal < 0 ? { background: "var(--danger-soft)", color: "var(--danger)" } : { background: "var(--surface-2)", color: "var(--text-secondary)" }}
                >
                  Tiefster Stand in 12 Monaten: {chf(minP.bal)} ({MON[minP.m - 1]})
                </div>
              )}
            </div>
            <div className="surface p-4">
              <h3 className="text-headline mb-3">Letzte Verteilungen</h3>
              {dists.length === 0 && <p className="text-caption">Noch kein Lohn verteilt.</p>}
              <div className="space-y-2">
                {dists.slice(0, 6).map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm border-t divider pt-2 first:border-0 first:pt-0">
                    <div>
                      <div className="font-medium">Lohn verteilt</div>
                      <div className="text-xs text-[var(--text-secondary)]">{fdate(d.date)}</div>
                    </div>
                    <div className="font-medium" style={{ color: "var(--success)" }}>{chf(d.amount, true)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === "lohn" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-rise">
          <div className="surface p-4">
            <h3 className="text-headline mb-1">Lohneingang erfassen</h3>
            <p className="text-caption mb-4">Der ganze Lohn landet zuerst auf dem Hauptkonto. Danach gehen die Daueraufträge raus, der Rest bleibt als Puffer.</p>
            <div className="space-y-3">
              <div>
                <label className="text-caption block mb-1">Lohn diesen Monat (CHF)</label>
                <input
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="z. B. 4200"
                  className="field text-2xl font-mono py-3"
                />
              </div>
              <div>
                <label className="text-caption block mb-1">Datum Lohneingang</label>
                <input type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} className="field w-auto" />
              </div>
              {alreadyDistributedThisMonth && (
                <div className="text-xs p-2 rounded-[var(--radius-sm)]" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>
                  Diesen Monat wurde bereits verteilt. Ein zweiter Lohn würde die Daueraufträge erneut abziehen.
                </div>
              )}
              {validIncome && (
                <div className="surface-2 p-3 space-y-1 text-sm animate-scale-in">
                  <div className="flex justify-between"><span>Lohneingang Hauptkonto</span><span className="font-mono" style={{ color: "var(--success)" }}>{chf(incomeVal, true)}</span></div>
                  {(["taxes", "bills", "joint"] as const).map((id) => (
                    <div key={id} className="flex justify-between"><span>→ {ACC[id].name}</span><span className="font-mono">{chf(-settings[id])}</span></div>
                  ))}
                  <div className="flex justify-between font-semibold border-t divider pt-1">
                    <span>{rest >= 0 ? "Bleibt als Puffer" : "Puffer schrumpft um"}</span>
                    <span className="font-mono" style={{ color: rest >= 0 ? "var(--success)" : "var(--danger)" }}>{chf(rest, true)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-secondary)]"><span>Hauptkonto danach</span><span className="font-mono">{chf(afterMain)}</span></div>
                  {rest < 0 && <div className="text-xs pt-1" style={{ color: "var(--danger)" }}>Der Lohn deckt die Fixabzüge nicht. Fehlbetrag {chf(-rest)} kommt aus dem Puffer.</div>}
                </div>
              )}
              <button onClick={distributeIncome} disabled={!validIncome} className="btn btn-primary w-full py-2.5">
                Lohn verteilen
              </button>
            </div>
          </div>
          <div className="surface p-4">
            <h3 className="text-headline mb-3">Lohnverlauf</h3>
            {dists.length === 0 && <p className="text-caption">Noch kein Lohn verteilt.</p>}
            <div className="space-y-2">
              {dists.slice(0, 12).map((d) => (
                <div key={d.id} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-xs text-[var(--text-secondary)] font-mono">{fdate(d.date).slice(0, 6)}</span>
                  <div className="flex-1 h-2 rounded bg-[var(--surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${Math.min(100, (d.amount / Math.max(...dists.map((x) => x.amount), 1)) * 100)}%`,
                        background: d.amount < ft ? "var(--warning)" : "var(--success)",
                        transition: "width var(--dur-slow) var(--ease-spring)",
                      }}
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
        <div className="space-y-6 animate-rise">
          <div className="surface p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-headline">Rechnungen-Konto: Soll vs. Ist</h3>
              <span className="text-caption">Dauerauftrag {chf(settings.bills)} / Monat</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="surface-2 p-3"><div className="text-caption">Ist-Stand</div><div className="font-mono font-medium">{fmt(bal.bills)}</div></div>
              <div className="surface-2 p-3"><div className="text-caption">Soll-Stand heute</div><div className="font-mono font-medium">{fmt(soll)}</div></div>
              <div className="surface-2 p-3"><div className="text-caption">Nötig pro Monat</div><div className="font-mono font-medium">{fmt(msoll)}</div></div>
              <div className="surface-2 p-3">
                <div className="text-caption">Dauerauftrag − Soll</div>
                <div className="font-mono font-medium" style={{ color: settings.bills - msoll >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {settings.bills - msoll >= 0 ? "+" : ""}{fmt(settings.bills - msoll)}
                </div>
              </div>
            </div>
          </div>

          <div className="surface p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-headline flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Prognose nächste 12 Monate</h3>
              {minP && (minP.bal < 0
                ? <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>Engpass im {MON[minP.m - 1]}</span>
                : <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--success-soft)", color: "var(--success)" }}>Alle Rechnungen gedeckt</span>)}
            </div>
            <ForecastChart proj={proj} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="surface p-4">
              <h3 className="text-headline mb-3">Unregelmässige Rechnungen</h3>
              {bills.length === 0 && <p className="text-caption">Noch keine Rechnungen erfasst.</p>}
              <div className="space-y-2">
                {bills.map((b) => (
                  <div key={b.id} className="flex items-center justify-between border-t divider pt-2 first:border-0 first:pt-0 text-sm">
                    <div>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-[var(--text-secondary)]">{b.months.map((m) => MS[m - 1]).join(", ")} · {chf(b.amount)}/Fälligkeit · {chf(annual(b))}/Jahr</div>
                    </div>
                    {confirmDeleteBill === b.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => deleteBill(b.id)} className="btn btn-danger btn-sm">Löschen</button>
                        <button onClick={() => setConfirmDeleteBill(null)} className="btn btn-secondary btn-sm">Abbrechen</button>
                      </div>
                    ) : (
                      <div className="flex gap-2 text-[var(--text-tertiary)]">
                        <button onClick={() => startEditBill(b)} title="Bearbeiten" className="press"><Pencil className="w-4 h-4 hover:text-blue-500" /></button>
                        <button onClick={() => setConfirmDeleteBill(b.id)} title="Löschen" className="press"><Trash2 className="w-4 h-4 hover:text-[var(--danger)]" /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="surface p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-headline">{editBillId ? "Rechnung bearbeiten" : "Rechnung hinzufügen"}</h3>
                {editBillId && <button onClick={resetBillForm} className="press text-xs text-[var(--text-secondary)] underline">Abbrechen</button>}
              </div>
              <form onSubmit={submitBill} className="space-y-3">
                <input value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="z. B. Krankenkasse" className="field" />
                <input value={billAmount} onChange={(e) => setBillAmount(e.target.value)} inputMode="decimal" placeholder="Betrag pro Fälligkeit (CHF)" className="field font-mono" />
                <div>
                  <label className="text-caption block mb-1">Fällig im Monat (mehrere möglich)</label>
                  <div className="grid grid-cols-6 gap-1">
                    {MS.map((m, i) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => toggleMonth(i + 1)}
                        className="press text-xs py-1 rounded-[var(--radius-sm)] border transition-colors duration-300"
                        style={
                          billMonths.includes(i + 1)
                            ? { background: "#2563eb", color: "white", borderColor: "#2563eb" }
                            : { borderColor: "var(--border)", color: "var(--text-secondary)" }
                        }
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full py-2.5">{editBillId ? "Änderungen speichern" : "Rechnung hinzufügen"}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {subTab === "einstellungen" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-rise">
          <div className="surface p-4">
            <h3 className="text-headline mb-3 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Daueraufträge &amp; Puffer</h3>
            <form onSubmit={saveSettings} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-caption block mb-1">Steuern / Monat</label><input value={setTaxes} onChange={(e) => setSetTaxes(e.target.value)} className="field font-mono" /></div>
                <div><label className="text-caption block mb-1">Rechnungen / Monat</label><input value={setBills_} onChange={(e) => setSetBills(e.target.value)} className="field font-mono" /></div>
                <div><label className="text-caption block mb-1">Gemeinsamer Haushalt / Monat</label><input value={setJoint} onChange={(e) => setSetJoint(e.target.value)} className="field font-mono" /></div>
                <div><label className="text-caption block mb-1">Mindestpuffer Hauptkonto</label><input value={setMin} onChange={(e) => setSetMin(e.target.value)} className="field font-mono" /></div>
              </div>
              <p className="text-caption">Summe Fixabzüge: <b className="text-[var(--text)]">{chf(fixedTotal(settings))}</b> pro Monat. Änderungen gelten für künftige Verteilungen.</p>
              <button type="submit" className="btn btn-primary w-full py-2.5">Speichern</button>
            </form>
          </div>
          <div className="surface p-4">
            <h3 className="text-headline mb-3">Kontostände abgleichen</h3>
            <p className="text-caption mb-3">Trag den echten Saldo aus dem E-Banking ein. Die App bucht die Differenz als Startsaldo.</p>
            <form onSubmit={applyBalances} className="space-y-3">
              {ACCOUNTS.map((a) => (
                <div key={a.id}>
                  <label className="text-caption block mb-1">{a.name}</label>
                  <input
                    value={balInputs[a.id] ?? ""}
                    onChange={(e) => setBalInputs((p) => ({ ...p, [a.id]: e.target.value }))}
                    className="field font-mono"
                  />
                </div>
              ))}
              <button type="submit" className="btn btn-secondary w-full py-2.5">Kontostände übernehmen</button>
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
    <div className="overflow-x-auto text-[var(--text-secondary)]">
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
              <rect x={x} y={top} width={w} height={h} rx={3} fill={col} fillOpacity={isDec || p.bal < 0 ? 1 : 0.55}
                style={{ transition: "height var(--dur-slow) var(--ease-spring), y var(--dur-slow) var(--ease-spring)" }}>
                <title>{MON[p.m - 1]} {p.y}: {chf(p.bal)}{p.pay ? ` · Zahlungen ${chf(-p.pay)} (${p.due.map((d) => d.name).join(", ")})` : ""}</title>
              </rect>
              {p.pay > 0 && <circle cx={x + w / 2} cy={H - B + 22} r={3} fill="var(--warning)" />}
              <text x={x + w / 2} y={H - B + 13} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={isDec ? 1 : 0.6}>{MS[p.m - 1]}</text>
            </g>
          );
        })}
      </svg>
      <div className="text-caption mt-1">● Monat mit fälliger Rechnung · Balken = Kontostand Ende Monat</div>
    </div>
  );
}
