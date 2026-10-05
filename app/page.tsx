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
  Sparkles,
} from "lucide-react";
import Mascot, { MascotLoader, MascotNote } from "@/components/Mascot";
import { dashboardGreeting } from "@/lib/mascot";
import { useI18n } from "./context/LanguageContext";
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
  const { t, lang, locale } = useI18n();
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

  const dateLabel = new Date().toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const kpis = [
    { label: t("Tasks pending", "Offene Aufgaben"), value: String(pendingTasks.length), icon: CheckSquare, href: "/tasks" },
    hasCalendar && { label: t("Events today", "Termine heute"), value: String(eventsTodayCount), icon: CalendarIcon, href: "/calendar" },
    hasShopping && { label: t("Shopping items", "Einkaufsartikel"), value: String(pendingShopping.length), icon: ShoppingCart, href: "/shopping" },
    hasExpenses && { label: t("Spent this month", "Ausgaben diesen Monat"), value: `$${spentThisMonth.toFixed(0)}`, icon: DollarSign, href: "/expenses" },
  ].filter((k): k is { label: string; value: string; icon: typeof CheckSquare; href: string } => !!k);

  const greeting = dashboardGreeting(lang, { pendingTasks: pendingTasks.length, eventsToday: eventsTodayCount });

  const budgetPct = totalBudget > 0 ? Math.min(100, Math.round((spentThisMonth / totalBudget) * 100)) : 0;

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  if (!householdId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <header className="animate-rise mb-6">
          <h1 className="text-display text-[var(--text)]">{t("Welcome home", "Willkommen zu Hause")}</h1>
          <p className="text-body text-[var(--text-secondary)] mt-1">{dateLabel}</p>
        </header>
        <div className="surface p-8 text-center animate-rise">
          <p className="text-body text-[var(--text-secondary)] mb-4">
            {t("Join or create a household to see your dashboard.", "Tritt einem Haushalt bei oder erstelle einen, um deine Übersicht zu sehen.")}
          </p>
          <Link href="/login" className="btn btn-primary inline-flex">
            {t("Continue setup", "Einrichtung fortsetzen")}
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <MascotLoader className="py-24" label={t("Loading", "Lädt")} />
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="animate-rise flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="text-display text-[var(--text)]">
            {t("Welcome", "Willkommen")} <span className="marker">{t("home", "zu Hause")}</span>
          </h1>
          <p className="text-body text-[var(--text-secondary)] mt-1">{dateLabel}</p>
        </div>
        <MascotNote mood={greeting.mood}>{greeting.text}</MascotNote>
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-rise" style={{ "--stagger-i": 1 } as React.CSSProperties}>
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link key={k.label} href={k.href} className="press note p-4 block">
              <Icon className="w-4 h-4 mb-2 text-[var(--text-secondary)]" />
              <div className="font-hand text-4xl font-bold leading-none text-[var(--text)]">{k.value}</div>
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
              <h2 className="text-headline">{t("Coming up", "Als Nächstes")}</h2>
              <Link href="/calendar" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
                {t("View calendar", "Kalender öffnen")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-caption py-4">{t("No upcoming events. Your schedule is clear.", "Keine Termine in Sicht. Dein Kalender ist frei.")}</p>
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
                        {evDate.toLocaleDateString(locale, { day: "numeric" })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{ev.title}</div>
                        <div className="flex items-center gap-2 text-caption">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{isToday ? t("Today", "Heute") : evDate.toLocaleDateString(locale, { weekday: "short" })} · {ev.time}</span>
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
            <h2 className="text-headline">{t("Active tasks", "Offene Aufgaben")}</h2>
            <Link href="/tasks" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
              {t("View all", "Alle ansehen")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {pendingTasks.length === 0 ? (
            <div className="flex items-center gap-3 py-2">
              <Mascot mood="sleepy" size={56} />
              <p className="text-caption">{t("Nothing pending. Nicely done.", "Nichts offen. Gut gemacht.")}</p>
            </div>
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
              <h2 className="text-headline">{t("Finances", "Finanzen")}</h2>
              <Link href="/expenses" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
                {t("Open finances", "Finanzen öffnen")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {vtActive ? (
              <div>
                <div className="text-micro normal-case">{t("Main account buffer", "Puffer Hauptkonto")}</div>
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
                  {mainStatus === "bad"
                    ? t("Below zero", "Unter null")
                    : mainStatus === "warn"
                      ? t("Below minimum buffer", "Unter dem Mindestpuffer")
                      : t("Healthy buffer", "Guter Puffer")}
                </div>
              </div>
            ) : totalBudget > 0 ? (
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-semibold">${spentThisMonth.toFixed(0)}</span>
                  <span className="text-caption">{t(`of $${totalBudget.toFixed(0)} budgeted`, `von $${totalBudget.toFixed(0)} budgetiert`)}</span>
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
                <div className="text-caption mt-1">{t(`${budgetPct}% of this month's budget used`, `${budgetPct} % des Monatsbudgets verbraucht`)}</div>
              </div>
            ) : (
              <div>
                <div className="text-2xl font-semibold">${spentThisMonth.toFixed(2)}</div>
                <p className="text-caption mt-2">{t("spent this month · set up a budget or the Verteilertopf for a fuller picture", "diesen Monat ausgegeben · richte ein Budget oder den Verteilertopf ein, dann siehst du mehr")}</p>
              </div>
            )}
          </section>
        )}

        {/* Shopping preview */}
        {hasShopping && (
          <section className="surface p-5 animate-rise" style={{ "--stagger-i": 5 } as React.CSSProperties}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-headline">{t("Shopping list", "Einkaufsliste")}</h2>
              <Link href="/shopping" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
                {t("View list", "Liste öffnen")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {pendingShopping.length === 0 ? (
              <p className="text-caption py-4">{t("List is empty.", "Die Liste ist leer.")}</p>
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
            <h2 className="text-headline mb-1">{t("More than tasks", "Mehr als Aufgaben")}</h2>
            <p className="text-body text-[var(--text-secondary)] mb-4">
              {t("Shopping list, finances, and calendar are available whenever your household is ready for them.", "Einkaufsliste, Finanzen und Kalender sind da, sobald dein Haushalt sie braucht.")}
            </p>
            <Link href="/settings" className="btn btn-primary inline-flex">
              {t("Explore features in Settings", "Funktionen in den Einstellungen entdecken")}
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
