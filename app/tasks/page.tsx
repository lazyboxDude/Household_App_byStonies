"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, DoorOpen, ListChecks, Repeat } from "lucide-react";
import { MascotLoader } from "@/components/Mascot";
import { showToast } from "../../lib/toast";
import AllView from "./components/AllView";
import RoomsView from "./components/RoomsView";
import TaskOnboarding from "./components/TaskOnboarding";
import TodayView from "./components/TodayView";
import UndoBar from "./components/UndoBar";
import type { RowContext } from "./components/rowContext";
import RoutineForm from "./routines/components/RoutineForm";
import { buildAgenda } from "./routines/agenda";
import { useRoutines } from "./routines/useRoutines";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { useRooms } from "./useRooms";
import { useTasks } from "./useTasks";

// v2: the page was rebuilt (Heute / Räume / Alle), so everyone gets the new intro once.
function onboardingSeenKey(householdId: string) {
  return `tasks-onboarding-v2-${householdId}`;
}

type View = "today" | "rooms" | "all";

export default function TasksPage() {
  const { household, user } = useAuth();
  const { t } = useI18n();
  const householdId = household?.id;
  const members = useMemo(() => household?.members ?? [], [household?.members]);
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const calendarEnabled = household?.enabledFeatures.includes("calendar") ?? false;
  const expensesEnabled = household?.enabledFeatures.includes("expenses") ?? false;

  const data = useRoutines(householdId, user?.id, { calendarEnabled, expensesEnabled }, memberIds);
  const roomStore = useRooms(householdId);
  const taskStore = useTasks(householdId);

  const [view, setView] = useState<View>("today");
  const [showOnboarding, setShowOnboarding] = useState(false);
  // The full form. `key` starts it fresh each time it is opened, so it never shows an old draft.
  const [form, setForm] = useState<{ key: number; title: string; roomId: string | null } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!householdId) return;
    try {
      // Read-on-mount from localStorage, not a sync with external state changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowOnboarding(!localStorage.getItem(onboardingSeenKey(householdId)));
    } catch {
      // Storage can be unavailable (private mode, disabled cookies) — just skip the intro.
    }
  }, [householdId]);

  useEffect(() => {
    if (form) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [form]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    if (!householdId) return;
    try {
      localStorage.setItem(onboardingSeenKey(householdId), "1");
    } catch {
      // Nothing to persist to — it'll just show again next visit.
    }
  };

  const agenda = useMemo(() => buildAgenda(data.routines, data.occurrences, data.today), [data.routines, data.occurrences, data.today]);

  if (!householdId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-display flex items-center gap-3 mb-6 animate-rise">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          {t("Household Tasks", "Haushaltsaufgaben")}
        </h1>
        <div className="surface p-8 text-center animate-rise">
          <p className="text-body text-[var(--text-secondary)] mb-4">
            {t("Join or create a household to share tasks and the rooms.", "Tritt einem Haushalt bei oder erstelle einen, um Aufgaben und Räume zu teilen.")}
          </p>
          <Link href="/login" className="btn btn-primary inline-flex">
            {t("Go to Login", "Zur Anmeldung")}
          </Link>
        </div>
      </div>
    );
  }

  if (data.isLoading || roomStore.isLoading || taskStore.isLoading) {
    return <MascotLoader className="py-24" label={t("Loading", "Lädt")} />;
  }

  const ctx: RowContext = {
    members,
    userId: user?.id,
    rooms: roomStore.rooms,
    finance: data.finance,
    actions: {
      resolve: data.resolve,
      swap: data.swap,
      pay: data.payBill,
      update: data.updateRoutine,
      remove: data.deleteRoutine,
    },
  };

  // What is on the plate right now: overdue and due today, plus the to-dos without a date.
  // What is coming later this week is mentioned, but does not count as "open".
  const openNow = agenda.filter((i) => i.group !== "soon").length + taskStore.tasks.filter((x) => !x.completed).length;
  const comingUp = agenda.filter((i) => i.group === "soon").length;

  const openForm = (title = "", roomId: string | null = null) => setForm({ key: Date.now(), title, roomId });

  const moveCleaning = async () => {
    const moved = await data.importCleaningPlan(members);
    if (moved > 0) showToast(t(`${moved} ${moved === 1 ? "task" : "tasks"} moved over`, `${moved} ${moved === 1 ? "Aufgabe" : "Aufgaben"} umgezogen`), "success");
  };

  const tabs: { id: View; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "today", label: t("Today", "Heute"), icon: <ListChecks className="w-4 h-4" />, badge: openNow },
    { id: "rooms", label: t("Rooms", "Räume"), icon: <DoorOpen className="w-4 h-4" /> },
    { id: "all", label: t("All", "Alle"), icon: <Repeat className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-rise">
        <h1 className="text-display flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          {t("Household Tasks", "Haushaltsaufgaben")}
        </h1>

        {/* A plain, non-competitive read of what is on the plate, not a scoreboard */}
        <div className="surface p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--accent-soft)" }}>
            <ListChecks className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <div className="text-headline">
              {openNow === 0 ? t("All caught up", "Alles erledigt") : t(`${openNow} open`, `${openNow} offen`)}
            </div>
            <p className="text-caption">
              {comingUp > 0
                ? t(`${comingUp} coming up this week`, `${comingUp} ${comingUp === 1 ? "steht" : "stehen"} diese Woche an`)
                : openNow === 0
                  ? t("Nicely done", "Gut gemacht")
                  : t("Nothing else this week", "Sonst steht diese Woche nichts an")}
            </p>
          </div>
        </div>
      </div>

      {showOnboarding && <TaskOnboarding onDismiss={dismissOnboarding} />}

      <div className="flex gap-2 mb-6 border-b divider" role="tablist" aria-label={t("Views", "Ansichten")}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={`press px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-300 flex items-center gap-1.5 ${
              view === tab.id
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
            }`}
          >
            {tab.icon} {tab.label}
            {tab.badge ? (
              <span className="rounded-full px-1.5 text-[11px] font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {form && (
        <div ref={formRef} className="mb-6 max-w-3xl scroll-mt-4">
          <RoutineForm
            key={form.key}
            today={data.today}
            members={members}
            userId={user?.id}
            rooms={roomStore.rooms}
            calendarEnabled={calendarEnabled}
            livingMode={data.team.livingMode}
            initial={{ title: form.title, roomId: form.roomId }}
            onSubmit={data.addRoutine}
            onCancel={() => setForm(null)}
          />
        </div>
      )}

      <div className="animate-rise" key={view}>
        {view === "today" && (
          <div className="max-w-3xl">
            <TodayView
              householdId={householdId}
              today={data.today}
              agenda={agenda}
              routines={data.routines}
              doneRecent={data.doneRecent}
              taskStore={taskStore}
              ctx={ctx}
              onAddRoutine={data.addRoutine}
              onMoreOptions={openForm}
              cleaningOpen={data.cleaningOpen}
              onMoveCleaning={moveCleaning}
            />
          </div>
        )}
        {view === "rooms" && (
          <RoomsView
            today={data.today}
            roomStore={roomStore}
            routines={data.routines}
            occurrences={data.occurrences}
            ctx={ctx}
            onAddRoutine={data.addRoutine}
            onMoreOptions={openForm}
            cleaningOpen={data.cleaningOpen}
            onMoveCleaning={moveCleaning}
          />
        )}
        {view === "all" && (
          <AllView today={data.today} routines={data.routines} occurrences={data.occurrences} ctx={ctx} team={data.team} onNew={() => openForm()} />
        )}
      </div>

      <UndoBar undoable={data.undoable} />
    </div>
  );
}
