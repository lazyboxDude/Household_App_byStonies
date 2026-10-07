"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Lock, Trash2, User, Users } from "lucide-react";
import Mascot from "@/components/Mascot";
import { useI18n } from "../../context/LanguageContext";
import { localizeKnown } from "../constants";
import type { AgendaItem } from "../routines/agenda";
import { daysBetween, todayLocalISO } from "../routines/schedule";
import { KNOWN_TITLES } from "../routines/knownTitles";
import { localeOf } from "../routines/i18n";
import type { Occurrence, Routine } from "../routines/types";
import type { NewRoutine } from "../routines/useRoutines";
import type { Task } from "../types";
import type { useTasks } from "../useTasks";
import SwipeToDelete, { type SwipeToDeleteHandle } from "../../components/SwipeToDelete";
import CleaningMoveBanner from "./CleaningMoveBanner";
import QuickAdd from "./QuickAdd";
import RoutineRow from "./RoutineRow";
import type { RowContext } from "./rowContext";

type Filter = "all" | "me";

function filterKey(householdId: string) {
  return `tasks-filter-${householdId}`;
}

function SectionTitle({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <h3 className="text-micro flex items-center gap-2 px-1 pt-4 pb-1 first:pt-0">
      {children}
      <span className="rounded-full px-1.5 py-px" style={{ background: "var(--surface-2)" }}>{count}</span>
    </h3>
  );
}

interface Props {
  householdId: string;
  today: string;
  agenda: AgendaItem[];
  routines: Routine[];
  doneRecent: Occurrence[];
  taskStore: ReturnType<typeof useTasks>;
  ctx: RowContext;
  onAddRoutine: (routine: NewRoutine) => Promise<boolean>;
  onMoreOptions: (title: string, roomId: string | null) => void;
  // Tasks from the old cleaning plan that have not moved over yet.
  cleaningOpen: number;
  onMoveCleaning: () => Promise<void>;
}

// "Heute": everything that is due, in the order it matters. Overdue first, then today, then the
// rest of the week, then the to-dos without a date.
export default function TodayView({
  householdId,
  today,
  agenda,
  routines,
  doneRecent,
  taskStore,
  ctx,
  onAddRoutine,
  onMoreOptions,
  cleaningOpen,
  onMoveCleaning,
}: Props) {
  const { t, lang } = useI18n();
  const { members, userId } = ctx;
  const { tasks, addTask, toggleTask, toggleShared, deleteTask } = taskStore;
  const [filter, setFilter] = useState<Filter>("all");
  const [showDone, setShowDone] = useState(false);
  const swipeRefs = useRef(new Map<string, SwipeToDeleteHandle | null>());
  const withOthers = members.length > 1;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(filterKey(householdId));
      // Read-on-mount from localStorage, not a sync with external state changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "me" || saved === "all") setFilter(saved);
    } catch {
      // Storage can be unavailable (private mode); the filter just starts on "all".
    }
  }, [householdId]);

  const chooseFilter = (next: Filter) => {
    setFilter(next);
    try {
      localStorage.setItem(filterKey(householdId), next);
    } catch {
      // Not persisted, it only lasts for this visit.
    }
  };

  const myName = members.find((m) => m.id === userId)?.name.trim().toLowerCase();
  const mine = filter === "me" && withOthers;
  const ownedByOther = (item: AgendaItem) => {
    const owner = item.routine.kind === "bill" ? item.routine.payerId : item.occurrence.assignedTo;
    return !!owner && owner !== userId;
  };
  const items = mine ? agenda.filter((i) => !ownedByOther(i)) : agenda;
  const waiting = items.filter((i) => i.group === "waiting");
  const dueToday = items.filter((i) => i.group === "today");
  const soon = items.filter((i) => i.group === "soon");

  const taskForMe = (task: Task) => !mine || !task.assignee || task.assignee.trim().toLowerCase() === myName;
  const openTasks = tasks.filter((x) => !x.completed && taskForMe(x));
  const doneTasks = tasks.filter((x) => x.completed);

  const routineById = useMemo(() => new Map(routines.map((r) => [r.id, r])), [routines]);
  const recentlyDone = useMemo(
    () =>
      doneRecent
        .filter((o) => o.doneAt && routineById.has(o.routineId) && daysBetween(todayLocalISO(new Date(o.doneAt)), today) <= 7)
        .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""))
        .slice(0, 8),
    [doneRecent, routineById, today]
  );
  const doneCount = doneTasks.length + recentlyDone.length;

  const nothingOpen = waiting.length + dueToday.length + soon.length + openTasks.length === 0;
  const nothingAtAll = routines.length === 0 && tasks.length === 0;

  const doneDay = (iso: string) => {
    const days = daysBetween(todayLocalISO(new Date(iso)), today);
    if (days <= 0) return t("Today", "Heute");
    if (days === 1) return t("Yesterday", "Gestern");
    return new Date(iso).toLocaleDateString(localeOf(lang), { weekday: "short" });
  };
  const personName = (id: string | null) => (id ? (id === userId ? t("You", "Du") : members.find((m) => m.id === id)?.name ?? null) : null);

  const renderRows = (list: AgendaItem[]) => (
    <ul>
      {list.map((item) => (
        <RoutineRow key={item.occurrence.id} routine={item.routine} occurrence={item.occurrence} today={today} variant="agenda" ctx={ctx} />
      ))}
    </ul>
  );

  return (
    <div className="space-y-4">
      <QuickAdd
        today={today}
        members={members}
        userId={userId}
        rooms={ctx.rooms}
        allowUndated
        defaultWhen="none"
        placeholder={t("Add a task …", "Aufgabe hinzufügen …")}
        onAddRoutine={onAddRoutine}
        onAddTask={addTask}
        onMoreOptions={onMoreOptions}
      />

      <CleaningMoveBanner count={cleaningOpen} onMove={onMoveCleaning} />

      {withOthers && !nothingAtAll && (
        <div className="flex items-center gap-2" role="group" aria-label={t("Show", "Anzeigen")}>
          <button type="button" className="chip" data-active={filter === "all"} onClick={() => chooseFilter("all")}>
            <Users className="w-3.5 h-3.5" aria-hidden /> {t("Everyone", "Alle")}
          </button>
          <button type="button" className="chip" data-active={filter === "me"} onClick={() => chooseFilter("me")}>
            <User className="w-3.5 h-3.5" aria-hidden /> {t("Just mine", "Nur meine")}
          </button>
        </div>
      )}

      {nothingOpen ? (
        <div className="surface flex flex-col items-center text-center px-6 py-10 text-[var(--text-secondary)]">
          <Mascot mood={nothingAtAll ? "sleepy" : "cheer"} size={88} />
          {nothingAtAll ? (
            <>
              <p className="font-hand text-2xl font-semibold mt-2">{t("Nothing here yet.", "Noch nichts da.")}</p>
              <p className="text-caption mt-1">{t("Write the first task above. I'll watch.", "Schreib oben die erste Aufgabe auf, ich schau zu.")}</p>
            </>
          ) : (
            <>
              <p className="font-hand text-2xl font-semibold mt-2">{t("All done for now.", "Für jetzt ist alles erledigt.")}</p>
              <p className="text-caption mt-1">
                {mine
                  ? t("Nothing open for you. The others still might have something.", "Für dich ist nichts offen. Bei den anderen kann noch etwas anstehen.")
                  : t("Nothing is waiting right now. Enjoy the quiet.", "Gerade wartet nichts. Geniess die Ruhe.")}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="surface p-4">
          {waiting.length > 0 && (
            <>
              <SectionTitle count={waiting.length}>{t("Waiting", "Wartet")}</SectionTitle>
              {renderRows(waiting)}
            </>
          )}
          {dueToday.length > 0 && (
            <>
              <SectionTitle count={dueToday.length}>{t("Today", "Heute")}</SectionTitle>
              {renderRows(dueToday)}
            </>
          )}
          {soon.length > 0 && (
            <>
              <SectionTitle count={soon.length}>{t("This week", "Diese Woche")}</SectionTitle>
              {renderRows(soon)}
            </>
          )}
          {openTasks.length > 0 && (
            <>
              <SectionTitle count={openTasks.length}>{t("No date", "Ohne Datum")}</SectionTitle>
              <ul>
                {openTasks.map((task) => (
                  <li key={task.id} className="py-0.5">
                    <SwipeToDelete
                      ref={(el) => {
                        swipeRefs.current.set(task.id, el);
                      }}
                      onDelete={() => deleteTask(task.id)}
                      onOpenChange={(open) => {
                        if (!open) return;
                        swipeRefs.current.forEach((handle, id) => {
                          if (id !== task.id) handle?.close();
                        });
                      }}
                    >
                      <div className="group flex items-center gap-1.5 py-1 bg-[var(--surface)]">
                        <button
                          type="button"
                          onClick={() => toggleTask(task.id)}
                          aria-label={t(`Mark “${task.title}” as done`, `„${task.title}“ als erledigt markieren`)}
                          className="press shrink-0 w-10 h-10 -ml-1.5 flex items-center justify-center"
                        >
                          <span
                            className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-transparent hover:text-[var(--success)] hover:border-[var(--success)] transition-colors"
                            style={{ borderColor: "var(--border-strong)" }}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">{localizeKnown(task.title, KNOWN_TITLES, lang)}</div>
                          {(task.assignee || !task.is_shared) && (
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption">
                              {task.assignee && <span className="flex items-center gap-1"><User className="w-3 h-3" aria-hidden />{task.assignee}</span>}
                              {!task.is_shared && <span className="flex items-center gap-1"><Lock className="w-3 h-3" aria-hidden />{t("Only me", "Nur ich")}</span>}
                            </div>
                          )}
                        </div>
                        {withOthers && task.created_by === userId && (
                          <button
                            type="button"
                            onClick={() => toggleShared(task.id)}
                            className="press row-action text-[var(--text-tertiary)] hover:text-[var(--text)] p-2"
                            title={task.is_shared ? t("Make private", "Privat machen") : t("Share with household", "Mit dem Haushalt teilen")}
                            aria-label={task.is_shared ? t("Make private", "Privat machen") : t("Share with household", "Mit dem Haushalt teilen")}
                          >
                            {task.is_shared ? <Lock className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="press row-action text-[var(--text-tertiary)] hover:text-[var(--danger)] p-2"
                          title={t("Delete", "Löschen")}
                          aria-label={t("Delete", "Löschen")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </SwipeToDelete>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {doneCount > 0 && (
        <div className="surface p-4">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            className="press w-full flex items-center justify-between text-left"
          >
            <span className="text-micro flex items-center gap-2">
              {t("Done", "Erledigt")}
              <span className="rounded-full px-1.5 py-px" style={{ background: "var(--surface-2)" }}>{doneCount}</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${showDone ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {showDone && (
            <ul className="mt-2 space-y-0.5">
              {recentlyDone.map((o) => {
                const r = routineById.get(o.routineId)!;
                const who = personName(o.doneBy);
                return (
                  <li key={o.id} className="flex items-center gap-2 py-1 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--success)" }} aria-hidden />
                    <span aria-hidden>{r.icon}</span>
                    <span className="truncate">{localizeKnown(r.title, KNOWN_TITLES, lang)}</span>
                    <span className="ml-auto shrink-0 text-caption">{who ? `${who} · ` : ""}{o.doneAt ? doneDay(o.doneAt) : ""}</span>
                  </li>
                );
              })}
              {doneTasks.map((task) => (
                <li key={task.id} className="group flex items-center gap-2 py-1 text-sm text-[var(--text-secondary)]">
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className="press shrink-0"
                    aria-label={t(`Mark “${task.title}” as open again`, `„${task.title}“ wieder öffnen`)}
                    title={t("Open again", "Wieder öffnen")}
                  >
                    <CheckCircle2 className="w-4 h-4" style={{ color: "var(--success)" }} />
                  </button>
                  <span className="truncate line-through">{localizeKnown(task.title, KNOWN_TITLES, lang)}</span>
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="press row-action ml-auto shrink-0 text-[var(--text-tertiary)] hover:text-[var(--danger)] p-1"
                    title={t("Delete", "Löschen")}
                    aria-label={t("Delete", "Löschen")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
