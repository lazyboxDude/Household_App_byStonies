"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckSquare,
  DollarSign,
  Calendar as CalendarIcon,
  ShoppingCart,
  ArrowRight,
  Clock,
  MapPin,
  Star,
  User,
} from "lucide-react";
import { AccountId, DistSettings, DistTransaction } from "./expenses/types";

interface StoredTask {
  id: string;
  title: string;
  points: number;
  completed: boolean;
  assignee?: string;
}
interface StoredShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  price?: number;
  store?: string;
}
interface StoredExpense {
  id: string;
  amount: number;
  date: string;
  category: string;
}
interface StoredBudget {
  id: string;
  category: string;
  amount: number;
}
interface StoredCalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function eventDateTime(ev: StoredCalendarEvent) {
  const d = new Date(ev.date);
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
  const [data] = useState(() => {
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const todayStr = now.toDateString();

    const tasks = readJSON<StoredTask[]>("tasks", []);
    const pendingTasks = tasks.filter((t) => !t.completed);

    const shoppingItems = readJSON<StoredShoppingItem[]>("shopping_items", []);
    const pendingShopping = shoppingItems.filter((i) => !i.completed);

    const events = readJSON<StoredCalendarEvent[]>("calendar_events", []);
    const eventsToday = events.filter((ev) => new Date(ev.date).toDateString() === todayStr);
    const upcomingEvents = events
      .filter((ev) => eventDateTime(ev).getTime() >= startOfToday().getTime())
      .sort((a, b) => eventDateTime(a).getTime() - eventDateTime(b).getTime())
      .slice(0, 4);

    const expenses = readJSON<StoredExpense[]>("expenses", []);
    const spentThisMonth = expenses
      .filter((e) => e.date?.startsWith(monthPrefix))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const budgets = readJSON<StoredBudget[]>("budgets", []);
    const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);

    // Verteilertopf (income-distribution) main-account snapshot, when in use.
    const vtSettings = readJSON<DistSettings>("verteilertopf_settings", { taxes: 0, bills: 0, joint: 0, minBuffer: 0 });
    const vtOpening = readJSON<Record<AccountId, number>>("verteilertopf_opening", { main: 0, taxes: 0, bills: 0, joint: 0 });
    const vtTx = readJSON<DistTransaction[]>("verteilertopf_tx", []);
    const vtActive = vtTx.length > 0;
    const mainBalance = Math.round(
      (vtOpening.main + vtTx.filter((t) => t.account === "main").reduce((s, t) => s + t.amount, 0)) * 100
    ) / 100;
    const mainStatus: "ok" | "warn" | "bad" = mainBalance < 0 ? "bad" : mainBalance < vtSettings.minBuffer ? "warn" : "ok";

    return {
      pendingTasks,
      pendingShopping,
      eventsToday,
      upcomingEvents,
      spentThisMonth,
      totalBudget,
      vtActive,
      mainBalance,
      mainStatus,
    };
  });

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const kpis = [
    { label: "Tasks pending", value: String(data.pendingTasks.length), icon: CheckSquare, href: "/tasks" },
    { label: "Events today", value: String(data.eventsToday.length), icon: CalendarIcon, href: "/calendar" },
    { label: "Shopping items", value: String(data.pendingShopping.length), icon: ShoppingCart, href: "/shopping" },
    { label: "Spent this month", value: `$${data.spentThisMonth.toFixed(0)}`, icon: DollarSign, href: "/expenses" },
  ];

  const budgetPct = data.totalBudget > 0 ? Math.min(100, Math.round((data.spentThisMonth / data.totalBudget) * 100)) : 0;

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
        <section className="surface p-5 animate-rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline">Coming up</h2>
            <Link href="/calendar" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
              View calendar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.upcomingEvents.length === 0 ? (
            <p className="text-caption py-4">No upcoming events. Your schedule is clear.</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingEvents.map((ev) => {
                const isToday = new Date(ev.date).toDateString() === new Date().toDateString();
                return (
                  <div key={ev.id} className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 text-xs font-semibold"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      {new Date(ev.date).toLocaleDateString(undefined, { day: "numeric" })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{ev.title}</div>
                      <div className="flex items-center gap-2 text-caption">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{isToday ? "Today" : new Date(ev.date).toLocaleDateString(undefined, { weekday: "short" })} · {ev.time}</span>
                        {ev.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{ev.location}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Active tasks */}
        <section className="surface p-5 animate-rise" style={{ "--stagger-i": 3 } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline">Active tasks</h2>
            <Link href="/tasks" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.pendingTasks.length === 0 ? (
            <p className="text-caption py-4">Nothing pending. Nicely done.</p>
          ) : (
            <div className="space-y-3">
              {data.pendingTasks.slice(0, 4).map((t) => (
                <div key={t.id} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full border-2 shrink-0" style={{ borderColor: "var(--border-strong)" }} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{t.title}</div>
                    <div className="flex items-center gap-2 text-caption">
                      <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500"><Star className="w-3 h-3" />{t.points} XP</span>
                      {t.assignee && <span className="flex items-center gap-1"><User className="w-3 h-3" />{t.assignee}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Finances */}
        <section className="surface p-5 animate-rise" style={{ "--stagger-i": 4 } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline">Finances</h2>
            <Link href="/expenses" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
              View budget <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.vtActive ? (
            <div>
              <div className="text-micro normal-case">Hauptkonto buffer</div>
              <div
                className="text-3xl font-semibold mt-1"
                style={{
                  color: data.mainStatus === "bad" ? "var(--danger)" : data.mainStatus === "warn" ? "var(--warning)" : "var(--text)",
                }}
              >
                {data.mainBalance.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CHF
              </div>
              <div
                className="text-caption mt-1"
                style={{ color: data.mainStatus === "bad" ? "var(--danger)" : data.mainStatus === "warn" ? "var(--warning)" : undefined }}
              >
                {data.mainStatus === "bad" ? "Below zero" : data.mainStatus === "warn" ? "Below minimum buffer" : "Healthy buffer"}
              </div>
            </div>
          ) : data.totalBudget > 0 ? (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold">${data.spentThisMonth.toFixed(0)}</span>
                <span className="text-caption">of ${data.totalBudget.toFixed(0)} budgeted</span>
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
              <div className="text-2xl font-semibold">${data.spentThisMonth.toFixed(2)}</div>
              <p className="text-caption mt-2">spent this month · set up a budget or the Verteilertopf for a fuller picture</p>
            </div>
          )}
        </section>

        {/* Shopping preview */}
        <section className="surface p-5 animate-rise" style={{ "--stagger-i": 5 } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline">Shopping list</h2>
            <Link href="/shopping" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
              View list <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {data.pendingShopping.length === 0 ? (
            <p className="text-caption py-4">List is empty.</p>
          ) : (
            <div className="space-y-3">
              {data.pendingShopping.slice(0, 4).map((it) => (
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
      </div>
    </div>
  );
}
