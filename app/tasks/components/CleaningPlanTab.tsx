"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  SprayCan,
  Repeat,
  User,
  CalendarClock,
  DoorOpen,
} from "lucide-react";
import { MascotLoader } from "@/components/Mascot";
import { useI18n } from "../../context/LanguageContext";
import { CleaningTask, Recurrence, Room } from "../types";
import {
  DEFAULT_ROOMS,
  ROOM_ICON_PRESETS,
  ROOM_PRESETS,
  RECURRENCE_OPTIONS,
  SUPPLY_SUGGESTIONS,
  localizeKnown,
} from "../constants";
import { upsertCleaningCalendarEvent } from "../calendarSync";
import { supabase } from "../../lib/supabase";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function computeNextDue(recurrence: Recurrence, fromISO: string): string {
  const days = RECURRENCE_OPTIONS.find((r) => r.value === recurrence)?.days;
  if (!days) return fromISO;
  const d = new Date(fromISO);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dueStatus(
  nextDue: string,
  tr: (en: string, de: string) => string,
  locale: string
): { label: string; className: string } {
  const today = todayISO();
  if (nextDue < today) return { label: tr("Overdue", "Überfällig"), className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
  if (nextDue === today) return { label: tr("Due today", "Heute fällig"), className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
  const date = new Date(`${nextDue}T00:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" });
  return { label: tr(`Due ${date}`, `Fällig ${date}`), className: "bg-[var(--surface-2)] text-[var(--text-secondary)]" };
}

export default function CleaningPlanTab({ householdId, onOpenRoutines }: { householdId: string; onOpenRoutines?: () => void }) {
  const { t: tr, lang, locale } = useI18n();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cleaningTasks, setCleaningTasks] = useState<CleaningTask[]>([]);
  const [movedCount, setMovedCount] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<string | null>(null);
  // Guards the seed-insert below against overlapping loadRooms() calls (e.g. React
  // Strict Mode's double-invoked effects), which would otherwise both see an empty
  // room list and each insert their own copy of the default rooms.
  const seedingRef = useRef(false);

  const loadRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    if (!error) {
      let list = (data ?? []) as Room[];
      if (list.length === 0 && !seedingRef.current) {
        seedingRef.current = true;
        const { data: seeded } = await supabase
          .from("rooms")
          .insert(DEFAULT_ROOMS.map((r) => ({ household_id: householdId, name: r.name.en, icon: r.icon })))
          .select();
        list = (seeded ?? []) as Room[];
      }
      setRooms(list);
      setSelectedRoomId((prev) => prev ?? list[0]?.id ?? null);
    }
  }, [householdId]);

  const loadCleaningTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("cleaning_tasks")
      .select("*")
      .eq("household_id", householdId)
      // Tasks taken over by Routinen live there now; the row stays so deleting the routine brings it back.
      .is("migrated_routine_id", null)
      .order("created_at", { ascending: true });
    // How many tasks moved to Routinen (0 if the column does not exist yet).
    const moved = await supabase
      .from("cleaning_tasks")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .not("migrated_routine_id", "is", null);
    setMovedCount(moved.error ? 0 : moved.count ?? 0);
    if (!error) {
      setCleaningTasks(
        (data ?? []).map((t) => ({
          id: t.id,
          roomId: t.room_id,
          title: t.title,
          supplies: t.supplies,
          recurrence: t.recurrence as Recurrence,
          assignee: t.assignee,
          lastDone: t.last_done,
          nextDue: t.next_due,
        }))
      );
    }
  }, [householdId]);

  useEffect(() => {
    // Standard fetch-on-mount: sets isLoading(false) once both loads finish.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([loadRooms(), loadCleaningTasks()]).finally(() => setIsLoading(false));
  }, [loadRooms, loadCleaningTasks]);

  useEffect(() => {
    const channel = supabase
      .channel(`cleaning-${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `household_id=eq.${householdId}` }, loadRooms)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cleaning_tasks", filter: `household_id=eq.${householdId}` },
        loadCleaningTasks
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, loadRooms, loadCleaningTasks]);

  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomIcon, setNewRoomIcon] = useState(ROOM_ICON_PRESETS[0]);

  const addRoom = async () => {
    if (!newRoomName.trim()) return;
    const { data, error } = await supabase
      .from("rooms")
      .insert({ household_id: householdId, name: newRoomName.trim(), icon: newRoomIcon })
      .select()
      .single();
    if (!error) {
      setRooms((prev) => [...prev, data as Room]);
      setSelectedRoomId(data.id);
      setNewRoomName("");
    }
  };

  const deleteRoom = async (roomId: string) => {
    // Deleting the room cascades to its cleaning tasks and their linked
    // calendar events in the database — nothing else to clean up here.
    setConfirmDeleteRoomId(null);
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    setCleaningTasks((prev) => prev.filter((t) => t.roomId !== roomId));
    if (selectedRoomId === roomId) {
      setSelectedRoomId(rooms.find((r) => r.id !== roomId)?.id ?? null);
    }
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    if (error) {
      loadRooms();
      loadCleaningTasks();
    }
  };

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<Recurrence>("weekly");
  const [newTaskSupplies, setNewTaskSupplies] = useState<string[]>([]);
  const [customSupply, setCustomSupply] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");

  const toggleSupply = (supply: string) => {
    setNewTaskSupplies((prev) =>
      prev.includes(supply) ? prev.filter((s) => s !== supply) : [...prev, supply]
    );
  };

  const addCustomSupply = () => {
    const value = customSupply.trim();
    if (!value || newTaskSupplies.includes(value)) return;
    setNewTaskSupplies([...newTaskSupplies, value]);
    setCustomSupply("");
  };

  const addCleaningTask = async () => {
    if (!newTaskTitle.trim() || !selectedRoomId) return;

    const nextDue = todayISO();
    const { data, error } = await supabase
      .from("cleaning_tasks")
      .insert({
        household_id: householdId,
        room_id: selectedRoomId,
        title: newTaskTitle.trim(),
        supplies: newTaskSupplies,
        recurrence: newTaskRecurrence,
        assignee: newTaskAssignee.trim() || null,
        next_due: nextDue,
      })
      .select()
      .single();

    if (!error && data) {
      const task: CleaningTask = {
        id: data.id,
        roomId: data.room_id,
        title: data.title,
        supplies: data.supplies,
        recurrence: data.recurrence as Recurrence,
        assignee: data.assignee,
        lastDone: data.last_done,
        nextDue: data.next_due,
      };
      setCleaningTasks((prev) => [...prev, task]);

      const room = rooms.find((r) => r.id === selectedRoomId);
      await upsertCleaningCalendarEvent({
        householdId,
        taskId: task.id,
        title: `${room ? localizeKnown(room.name, ROOM_PRESETS, lang) : tr("Room", "Raum")}: ${task.title}`,
        date: task.nextDue,
      });
    }

    setNewTaskTitle("");
    setNewTaskSupplies([]);
    setNewTaskAssignee("");
  };

  const markDone = async (task: CleaningTask) => {
    if (task.recurrence === "once") {
      // Deleting the task cascades to remove its calendar event too.
      setCleaningTasks((prev) => prev.filter((t) => t.id !== task.id));
      await supabase.from("cleaning_tasks").delete().eq("id", task.id);
      return;
    }

    const today = todayISO();
    const nextDue = computeNextDue(task.recurrence, today);
    setCleaningTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, lastDone: today, nextDue } : t))
    );
    await supabase.from("cleaning_tasks").update({ last_done: today, next_due: nextDue }).eq("id", task.id);

    const room = rooms.find((r) => r.id === task.roomId);
    await upsertCleaningCalendarEvent({
      householdId,
      taskId: task.id,
      title: `${room ? localizeKnown(room.name, ROOM_PRESETS, lang) : tr("Room", "Raum")}: ${task.title}`,
      date: nextDue,
    });
  };

  const deleteCleaningTask = async (taskId: string) => {
    setCleaningTasks((prev) => prev.filter((t) => t.id !== taskId));
    const { error } = await supabase.from("cleaning_tasks").delete().eq("id", taskId);
    if (error) loadCleaningTasks();
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;
  const tasksInRoom = cleaningTasks.filter((t) => t.roomId === selectedRoomId);

  if (isLoading) {
    return (
      <MascotLoader size={64} className="py-12" label={tr("Loading", "Lädt")} />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {movedCount > 0 && (
        <div className="surface p-4 lg:col-span-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {movedCount} {movedCount === 1 ? "Aufgabe läuft" : "Aufgaben laufen"} jetzt unter Routinen und {movedCount === 1 ? "ist" : "sind"} hier ausgeblendet.
          </p>
          {onOpenRoutines && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onOpenRoutines}>Zu den Routinen</button>
          )}
        </div>
      )}
      {/* Rooms */}
      <div className="space-y-4">
        <div className="surface p-4">
          <h2 className="text-headline mb-3 flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-teal-600" />
            {tr("Rooms", "Räume")}
          </h2>
          <div className="space-y-2">
            {rooms.map((room) => {
              const roomTasks = cleaningTasks.filter((t) => t.roomId === room.id);
              const overdueCount = roomTasks.filter((t) => t.nextDue < todayISO()).length;
              return (
                <button
                  key={room.id}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setConfirmDeleteRoomId(null);
                  }}
                  className={`press w-full group flex items-center justify-between p-3 rounded-[var(--radius-md)] border text-left transition-colors duration-300 ${
                    selectedRoomId === room.id
                      ? "bg-teal-50 dark:bg-teal-900/20 border-teal-400 dark:border-teal-700"
                      : "border-[var(--border)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium text-[var(--text)]">
                    <span className="text-lg">{room.icon}</span> {localizeKnown(room.name, ROOM_PRESETS, lang)}
                  </span>
                  <span className="flex items-center gap-2">
                    {overdueCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold">
                        {overdueCount}
                      </span>
                    )}
                    {confirmDeleteRoomId === room.id ? (
                      <span className="flex items-center gap-1.5">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRoom(room.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.stopPropagation();
                            deleteRoom(room.id);
                          }}
                          className="press text-[11px] font-semibold px-2 py-1 rounded-full bg-[var(--danger)] text-white cursor-pointer"
                        >
                          {tr("Delete", "Löschen")}{roomTasks.length > 0 ? ` (${roomTasks.length})` : ""}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteRoomId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.stopPropagation();
                            setConfirmDeleteRoomId(null);
                          }}
                          className="press text-[11px] font-semibold px-2 py-1 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] cursor-pointer"
                        >
                          {tr("Cancel", "Abbrechen")}
                        </span>
                      </span>
                    ) : (
                      <Trash2
                        className="w-4 h-4 press row-action text-[var(--text-tertiary)] hover:text-[var(--danger)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteRoomId(room.id);
                        }}
                      />
                    )}
                  </span>
                </button>
              );
            })}
            {rooms.length === 0 && <p className="text-caption py-2">{tr("No rooms yet.", "Noch keine Räume.")}</p>}
          </div>

          <div className="mt-4 pt-4 border-t divider space-y-2">
            <div className="flex gap-1 flex-wrap">
              {ROOM_ICON_PRESETS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewRoomIcon(icon)}
                  className={`press text-lg p-1.5 rounded-[var(--radius-sm)] border transition-colors duration-300 ${
                    newRoomIcon === icon ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" : "border-transparent hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRoom()}
                placeholder={tr("New room name", "Name des neuen Raums")}
                className="field flex-1 text-sm py-2"
              />
              <button onClick={addRoom} aria-label={tr("Add room", "Raum hinzufügen")} className="btn btn-icon" style={{ background: "#0d9488", color: "white" }}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks for selected room */}
      <div className="lg:col-span-2 space-y-4">
        {!selectedRoom ? (
          <div className="text-center py-16 text-[var(--text-secondary)] surface">
            {tr("Add a room to start building your cleaning plan.", "Lege einen Raum an, um deinen Putzplan zu starten.")}
          </div>
        ) : (
          <>
            <div className="surface p-4 space-y-3">
              <h2 className="text-headline flex items-center gap-2">
                <span className="text-xl">{selectedRoom.icon}</span> {localizeKnown(selectedRoom.name, ROOM_PRESETS, lang)} — {tr("add a task", "Aufgabe hinzufügen")}
              </h2>

              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCleaningTask()}
                placeholder={tr("e.g. Wipe down counters", "z. B. Ablagen abwischen")}
                className="field"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption mb-1 flex items-center gap-1">
                    <Repeat className="w-3 h-3" /> {tr("Frequency", "Häufigkeit")}
                  </label>
                  <select
                    value={newTaskRecurrence}
                    onChange={(e) => setNewTaskRecurrence(e.target.value as Recurrence)}
                    className="field text-sm"
                  >
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label[lang]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-caption mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> {tr("Assignee (optional)", "Zuständig (optional)")}
                  </label>
                  <input
                    type="text"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    placeholder={tr("Who's on it?", "Wer übernimmt?")}
                    className="field text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-caption mb-1 flex items-center gap-1">
                  <SprayCan className="w-3 h-3" /> {tr("Cleaning supplies needed", "Benötigte Putzmittel")}
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SUPPLY_SUGGESTIONS.map((supply) => (
                    <button
                      key={supply.en}
                      type="button"
                      onClick={() => toggleSupply(supply.en)}
                      className="chip"
                      data-active={newTaskSupplies.includes(supply.en)}
                      style={
                        newTaskSupplies.includes(supply.en)
                          ? { background: "#0d9488", borderColor: "#0d9488", color: "white" }
                          : undefined
                      }
                    >
                      {supply[lang]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSupply}
                    onChange={(e) => setCustomSupply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomSupply();
                      }
                    }}
                    placeholder={tr("Add a custom supply...", "Eigenes Putzmittel hinzufügen …")}
                    className="field flex-1 text-sm"
                  />
                  <button onClick={addCustomSupply} type="button" className="btn btn-secondary btn-sm">
                    {tr("Add", "Hinzufügen")}
                  </button>
                </div>
                {newTaskSupplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {newTaskSupplies.map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                        {localizeKnown(s, SUPPLY_SUGGESTIONS, lang)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={addCleaningTask}
                className="btn w-full py-2.5"
                style={{ background: "#0d9488", color: "white" }}
              >
                <Plus className="w-4 h-4" /> {tr("Add cleaning task", "Putzaufgabe hinzufügen")}
              </button>
            </div>

            <div className="space-y-3">
              {tasksInRoom.map((task, i) => {
                const status = dueStatus(task.nextDue, tr, locale);
                return (
                  <div
                    key={task.id}
                    className="group surface card-interactive flex items-start justify-between gap-3 p-4 animate-rise"
                    style={{ "--stagger-i": i } as React.CSSProperties}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => markDone(task)}
                        title={tr("Mark as done", "Als erledigt markieren")}
                        aria-label={tr("Mark as done", "Als erledigt markieren")}
                        className="press flex-shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 border-[var(--border-strong)] hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center justify-center text-transparent hover:text-teal-500 transition-colors duration-300"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <div className="min-w-0">
                        <h3 className="font-medium text-[var(--text)] truncate">{task.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${status.className}`}>
                            <CalendarClock className="w-3 h-3" /> {status.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            {RECURRENCE_OPTIONS.find((r) => r.value === task.recurrence)?.label[lang]}
                          </span>
                          {task.assignee && (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] flex items-center gap-1">
                              <User className="w-3 h-3" /> {task.assignee}
                            </span>
                          )}
                        </div>
                        {task.supplies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.supplies.map((s) => (
                              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                                <SprayCan className="w-2.5 h-2.5" /> {localizeKnown(s, SUPPLY_SUGGESTIONS, lang)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCleaningTask(task.id)}
                      className="press row-action text-[var(--text-tertiary)] hover:text-[var(--danger)] p-2"
                      title={tr("Delete", "Löschen")}
                      aria-label={tr("Delete", "Löschen")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              {tasksInRoom.length === 0 && (
                <div className="text-center py-8 text-[var(--text-secondary)] surface">
                  {tr(`No cleaning tasks in ${localizeKnown(selectedRoom.name, ROOM_PRESETS, lang)} yet.`, `Noch keine Putzaufgaben für ${localizeKnown(selectedRoom.name, ROOM_PRESETS, lang)}.`)}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
