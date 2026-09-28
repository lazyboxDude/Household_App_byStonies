"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CheckSquare,
  DollarSign,
  Calendar as CalendarIcon,
  ShoppingCart,
  ArrowRight,
  Clock,
  MapPin,
  User,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";
import LandingPage from "./components/LandingPage";

interface DashTask {
  id: string;
  title: string;
  completed: boolean;
  assignee: string | null;
}
interface DashShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  price: number | null;
  store: string | null;
}
interface DashCalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string | null;
}

function eventDateTime(ev: DashCalendarEvent) {
  const d = new Date(`${ev.date}T00:00:00`);
  const [h, m] = (ev.time || "00:00").split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Home() {
  const { user, household, isAuthenticated } = useAuth();
  const userId = user?.id;
  const householdId = household?.id;
  const hasShopping = household?.enabledFeatures.includes("shopping") ?? false;
  const hasExpenses = household?.enabledFeatures.includes("expenses") ?? false;
  const hasCalendar = household?.enabledFeatures.includes("calendar") ?? false;
  const hasAnyOptionalFeature = hasShopping || hasExpenses || hasCalendar;

  const [isLoading, setIsLoading] = useState(true);
  const [pendingTasks, setPendingTasks] = useState<DashTask[]>([]);
  const [pendingShopping, setPendingShopping] = useState<DashShoppingItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DashCalendarEvent[]>([]);
  const [eventsTodayCount, setEventsTodayCount] = useState(0);
  const [spentThisMonth, setSpentThisMonth] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [vtActive, setVtActive] = useState(false);
  const [mainBalance, setMainBalance] = useState(0);
  const [vtMinBuffer, setVtMinBuffer] = useState(0);

  const loadTasks = useCallback(async () => {
    if (!householdId) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("household_id", householdId)
      .eq("completed", false)
      .order("created_at", { ascending: true });
    setPendingTasks((data ?? []).map((t) => ({ id: t.id, title: t.title, completed: t.completed, assignee: t.assignee })));
  }, [householdId]);

  const loadShopping = useCallback(async () => {
    if (!householdId || !hasShopping) return;
    const { data } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("household_id", householdId)
      .eq("completed", false)
      .order("created_at", { ascending: false });
    setPendingShopping((data ?? []).map((i) => ({ id: i.id, text: i.text, completed: i.completed, price: i.price, store: i.store })));
  }, [householdId, hasShopping]);

  const loadEvents = useCallback(async () => {
    if (!householdId || !hasCalendar) return;
    const { data } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("household_id", householdId)
      .order("date", { ascending: true });
    const events: DashCalendarEvent[] = (data ?? []).map((ev) => ({ id: ev.id, title: ev.title, date: ev.date, time: ev.time, location: ev.location }));
    const todayStr = new Date().toDateString();
    setEventsTodayCount(events.filter((ev) => new Date(`${ev.date}T00:00:00`).toDateString() === todayStr).length);
    setUpcomingEvents(
      events
        .filter((ev) => eventDateTime(ev).getTime() >= startOfToday().getTime())
        .sort((a, b) => eventDateTime(a).getTime() - eventDateTime(b).getTime())
        .slice(0, 4)
    );
  }, [householdId, hasCalendar]);

  const loadFinances = useCallback(async () => {
    if (!householdId || !userId || !hasExpenses) return;
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [{ data: expenses }, { data: budgets }, { data: vtConfig }, { data: vtTx }] = await Promise.all([
      supabase.from("expenses").select("amount, date").eq("household_id", householdId).eq("user_id", userId),
      supabase.from("budgets").select("amount").eq("household_id", householdId).eq("user_id", userId),
      supabase.from("verteilertopf_config").select("*").eq("household_id", householdId).maybeSingle(),
      supabase.from("verteilertopf_tx").select("account, amount").eq("household_id", householdId),
    ]);

    setSpentThisMonth((expenses ?? []).filter((e) => e.date?.startsWith(monthPrefix)).reduce((s, e) => s + (e.amount || 0), 0));
    setTotalBudget((budgets ?? []).reduce((s, b) => s + (b.amount || 0), 0));

    const openingMain = vtConfig?.opening_main ?? 0;
    const minBuffer = vtConfig?.min_buffer ?? 0;
    const mainTx = (vtTx ?? []).filter((t) => t.account === "main");
    setVtActive((vtTx ?? []).length > 0);
    setMainBalance(Math.round((openingMain + mainTx.reduce((s, t) => s + t.amount, 0)) * 100) / 100);
    setVtMinBuffer(minBuffer);
  }, [householdId, userId, hasExpenses]);

  useEffect(() => {
    if (!householdId || !userId) return;
    // Standard fetch-on-mount: the loaders set isLoading(false) once done.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    Promise.all([loadTasks(), loadShopping(), loadEvents(), loadFinances()]).finally(() => setIsLoading(false));
  }, [householdId, userId, loadTasks, loadShopping, loadEvents, loadFinances]);

  useEffect(() => {
    if (!householdId || !userId) return;
    const channel = supabase.channel(`dashboard-${householdId}-${userId}`);
    channel.on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${householdId}` }, loadTasks);
    if (hasShopping) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "shopping_items", filter: `household_id=eq.${householdId}` }, loadShopping);
    }
    if (hasCalendar) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "calendar_events", filter: `household_id=eq.${householdId}` }, loadEvents);
    }
    if (hasExpenses) {
      channel
        .on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `user_id=eq.${userId}` }, loadFinances)
        .on("postgres_changes", { event: "*", schema: "public", table: "budgets", filter: `user_id=eq.${userId}` }, loadFinances)
        .on("postgres_changes", { event: "*", schema: "public", table: "verteilertopf_config", filter: `household_id=eq.${householdId}` }, loadFinances)
        .on("postgres_changes", { event: "*", schema: "public", table: "verteilertopf_tx", filter: `household_id=eq.${householdId}` }, loadFinances);
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, userId, hasShopping, hasCalendar, hasExpenses, loadTasks, loadShopping, loadEvents, loadFinances]);

  const mainStatus: "ok" | "warn" | "bad" = mainBalance < 0 ? "bad" : mainBalance < vtMinBuffer ? "warn" : "ok";

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const kpis = [
    { label: "Tasks pending", value: String(pendingTasks.length), icon: CheckSquare, href: "/tasks" },
    hasCalendar && { label: "Events today", value: String(eventsTodayCount), icon: CalendarIcon, href: "/calendar" },
    hasShopping && { label: "Shopping items", value: String(pendingShopping.length), icon: ShoppingCart, href: "/shopping" },
    hasExpenses && { label: "Spent this month", value: `$${spentThisMonth.toFixed(0)}`, icon: DollarSign, href: "/expenses" },
  ].filter((k): k is { label: string; value: string; icon: typeof CheckSquare; href: string } => !!k);

  const budgetPct = totalBudget > 0 ? Math.min(100, Math.round((spentThisMonth / totalBudget) * 100)) : 0;

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  if (!householdId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <header className="animate-rise mb-6">
          <h1 className="text-display text-[var(--text)]">Welcome home</h1>
          <p className="text-body text-[var(--text-secondary)] mt-1">{dateLabel}</p>
        </header>
        <div className="surface p-8 text-center animate-rise">
          <p className="text-body text-[var(--text-secondary)] mb-4">
            Join or create a household to see your dashboard.
          </p>
          <Link href="/login" className="btn btn-primary inline-flex">
            Continue setup
          </Link>
        </div>
      </div>
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="animate-rise">
        <h1 className="text-display text-[var(--text)]">Welcome home</h1>
        <p className="text-body text-[var(--text-secondary)] mt-1">{dateLabel}</p>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-rise" style={{ "--stagger-i": 1 } as React.CSSProperties}>
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link key={k.label} href={k.href} className="press surface p-4 block">
              <Icon className="w-4 h-4 mb-3 text-[var(--text-tertiary)]" />
              <div className="text-2xl font-semibold text-[var(--text)]">{k.value}</div>
              <div className="text-micro normal-case mt-1">{k.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming events */}
        {hasCalendar && (
          <section className="surface p-5 animate-rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline">Coming up</h2>
              <Link href="/calendar" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
                View calendar <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-caption py-4">No upcoming events. Your schedule is clear.</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((ev) => {
                  const evDate = new Date(`${ev.date}T00:00:00`);
                  const isToday = evDate.toDateString() === new Date().toDateString();
                  return (
                    <div key={ev.id} className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 text-xs font-semibold"
                        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                      >
                        {evDate.toLocaleDateString(undefined, { day: "numeric" })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{ev.title}</div>
                        <div className="flex items-center gap-2 text-caption">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{isToday ? "Today" : evDate.toLocaleDateString(undefined, { weekday: "short" })} · {ev.time}</span>
                          {ev.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{ev.location}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Active tasks */}
        <section
          className={`surface p-5 animate-rise ${!hasAnyOptionalFeature ? "lg:col-span-2" : ""}`}
          style={{ "--stagger-i": 3 } as React.CSSProperties}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline">Active tasks</h2>
            <Link href="/tasks" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {pendingTasks.length === 0 ? (
            <p className="text-caption py-4">Nothing pending. Nicely done.</p>
          ) : (
            <div className="space-y-3">
              {pendingTasks.slice(0, 4).map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full border-2 shrink-0" style={{ borderColor: "var(--border-strong)" }} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{t.title}</div>
                    {t.assignee && (
                      <div className="flex items-center gap-2 text-caption">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{t.assignee}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Finances */}
        {hasExpenses && (
          <section className="surface p-5 animate-rise" style={{ "--stagger-i": 4 } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline">Finanzen</h2>
              <Link href="/expenses" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
                Finanzen öffnen <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {vtActive ? (
              <div>
                <div className="text-micro normal-case">Hauptkonto buffer</div>
                <div
                  className="text-3xl font-semibold mt-1"
                  style={{
                    color: mainStatus === "bad" ? "var(--danger)" : mainStatus === "warn" ? "var(--warning)" : "var(--text)",
                  }}
                >
                  {mainBalance.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CHF
                </div>
                <div
                  className="text-caption mt-1"
                  style={{ color: mainStatus === "bad" ? "var(--danger)" : mainStatus === "warn" ? "var(--warning)" : undefined }}
                >
                  {mainStatus === "bad" ? "Below zero" : mainStatus === "warn" ? "Below minimum buffer" : "Healthy buffer"}
                </div>
              </div>
            ) : totalBudget > 0 ? (
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold">${spentThisMonth.toFixed(0)}</span>
                  <span className="text-caption">of ${totalBudget.toFixed(0)} budgeted</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${budgetPct}%`,
                      background: budgetPct >= 100 ? "var(--danger)" : budgetPct >= 85 ? "var(--warning)" : "var(--accent)",
                      transition: "width var(--dur-slow) var(--ease-spring)",
                    }}
                  />
                </div>
                <div className="text-caption mt-1">{budgetPct}% of this month&apos;s budget used</div>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-semibold">${spentThisMonth.toFixed(2)}</div>
                <p className="text-caption mt-2">spent this month · set up a budget or the Verteilertopf for a fuller picture</p>
              </div>
            )}
          </section>
        )}

        {/* Shopping preview */}
        {hasShopping && (
          <section className="surface p-5 animate-rise" style={{ "--stagger-i": 5 } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline">Shopping list</h2>
              <Link href="/shopping" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
                View list <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {pendingShopping.length === 0 ? (
              <p className="text-caption py-4">List is empty.</p>
            ) : (
              <div className="space-y-3">
                {pendingShopping.slice(0, 4).map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{it.text}</div>
                      {it.store && <div className="text-caption truncate">{it.store}</div>}
                    </div>
                    {it.price && <div className="text-sm font-mono shrink-0">${it.price.toFixed(2)}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Nudge toward the optional features when none are on yet */}
        {!hasAnyOptionalFeature && (
          <section className="surface p-5 animate-rise lg:col-span-2 text-center" style={{ "--stagger-i": 4 } as React.CSSProperties}>
            <Sparkles className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--accent)" }} />
            <h2 className="text-headline mb-1">More than tasks</h2>
            <p className="text-body text-[var(--text-secondary)] mb-4">
              Shopping list, Finanzen, and Calendar are available whenever your household is ready for them.
            </p>
            <Link href="/settings" className="btn btn-primary inline-flex">
              Explore features in Settings
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
