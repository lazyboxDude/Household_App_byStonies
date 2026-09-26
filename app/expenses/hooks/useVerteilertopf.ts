"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { AccountId, DistSettings, IrregularBill, DistTransaction } from "../types";
import { curYM, r2, uid } from "../format";

export const ACCOUNT_IDS: AccountId[] = ["main", "taxes", "bills", "joint"];
const DEFAULT_SETTINGS: DistSettings = { taxes: 0, bills: 0, joint: 0, minBuffer: 0 };
const DEFAULT_OPENING: Record<AccountId, number> = { main: 0, taxes: 0, bills: 0, joint: 0 };

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
export function monthlySoll(bills: IrregularBill[]) {
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
export type ProjectionMonth = { m: number; y: number; pay: number; due: IrregularBill[]; bal: number };
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
  const g = crypto.randomUUID();
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

export function useVerteilertopf(householdId: string | undefined) {
  const [settings, setSettings] = useState<DistSettings>(DEFAULT_SETTINGS);
  const [opening, setOpening] = useState<Record<AccountId, number>>(DEFAULT_OPENING);
  const [bills, setBills] = useState<IrregularBill[]>([]);
  const [tx, setTx] = useState<DistTransaction[]>([]);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadConfig = useCallback(async () => {
    if (!householdId) return;
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
      setOnboardingCompleted(row.onboarding_completed);
    }
  }, [householdId]);

  const loadBills = useCallback(async () => {
    if (!householdId) return;
    const { data } = await supabase
      .from("verteilertopf_bills")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    setBills((data ?? []).map((b) => ({ id: b.id, name: b.name, amount: b.amount, months: b.months })));
  }, [householdId]);

  const loadTx = useCallback(async () => {
    if (!householdId) return;
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
    if (!householdId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch on household change needs a loading flag flipped back on
    setIsLoading(true);
    Promise.all([loadConfig(), loadBills(), loadTx()]).finally(() => setIsLoading(false));
  }, [householdId, loadConfig, loadBills, loadTx]);

  useEffect(() => {
    if (!householdId) return;
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
  const upcoming = proj.slice(0, 4).filter((p) => p.pay > 0);

  const distributeIncome = async (incomeVal: number, incomeDate: string) => {
    if (!householdId) return;
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
    if (error) {
      console.error("distributeIncome failed", error);
    }
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
    }
    return !error;
  };

  const submitBill = async (input: { name: string; amount: number; months: number[] }, editId: string | null) => {
    if (!householdId) return false;
    if (editId) {
      setBills((prev) => prev.map((b) => (b.id === editId ? { ...b, ...input, amount: r2(input.amount) } : b)));
      const { error } = await supabase
        .from("verteilertopf_bills")
        .update({ name: input.name, amount: r2(input.amount), months: input.months })
        .eq("id", editId);
      return !error;
    }
    const { data, error } = await supabase
      .from("verteilertopf_bills")
      .insert({ household_id: householdId, name: input.name, amount: r2(input.amount), months: input.months })
      .select()
      .single();
    if (!error && data) {
      setBills((prev) => [...prev, { id: data.id, name: data.name, amount: data.amount, months: data.months }]);
    }
    return !error;
  };

  const deleteBill = async (id: string) => {
    setBills((prev) => prev.filter((b) => b.id !== id));
    await supabase.from("verteilertopf_bills").delete().eq("id", id);
  };

  const saveSettings = async (next: DistSettings) => {
    if (!householdId) return;
    setSettings(next);
    await supabase
      .from("verteilertopf_config")
      .update({ taxes: next.taxes, bills: next.bills, joint: next.joint, min_buffer: next.minBuffer })
      .eq("household_id", householdId);
  };

  const completeOnboarding = async () => {
    if (!householdId) return;
    setOnboardingCompleted(true);
    await supabase.from("verteilertopf_config").update({ onboarding_completed: true }).eq("household_id", householdId);
  };

  const applyBalances = async (realBalances: Record<AccountId, number>) => {
    if (!householdId) return;
    const next = { ...opening };
    for (const a of ACCOUNT_IDS) {
      const entered = realBalances[a];
      if (entered === undefined || isNaN(entered)) continue;
      const txSum = tx.filter((t) => t.account === a).reduce((s, t) => s + t.amount, 0);
      next[a] = r2(entered - txSum);
    }
    setOpening(next);
    await supabase
      .from("verteilertopf_config")
      .update({ opening_main: next.main, opening_taxes: next.taxes, opening_bills: next.bills, opening_joint: next.joint })
      .eq("household_id", householdId);
  };

  return {
    settings,
    opening,
    bills,
    tx,
    isLoading,
    bal,
    ft,
    status,
    dists,
    alreadyDistributedThisMonth,
    soll,
    msoll,
    proj,
    minP,
    upcoming,
    onboardingCompleted,
    distributeIncome,
    submitBill,
    deleteBill,
    saveSettings,
    applyBalances,
    completeOnboarding,
  };
}
