"use client";

import { useEffect, useState } from "react";
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
import { CleaningTask, Recurrence, Room } from "../types";
import { DEFAULT_ROOMS, ROOM_ICON_PRESETS, RECURRENCE_OPTIONS, SUPPLY_SUGGESTIONS } from "../constants";
import { removeCleaningCalendarEvent, upsertCleaningCalendarEvent } from "../calendarSync";

const POINTS_BY_RECURRENCE: Record<Recurrence, number> = {
  daily: 5,
  weekly: 15,
  biweekly: 20,
  monthly: 30,
  once: 25,
};

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

function dueStatus(nextDue: string): { label: string; className: string } {
  const today = todayISO();
  if (nextDue < today) return { label: "Overdue", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
  if (nextDue === today) return { label: "Due today", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" };
  return { label: `Due ${nextDue}`, className: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" };
}

export default function CleaningPlanTab({
  onAwardPoints,
}: {
  onAwardPoints: (points: number) => void;
}) {
  const [rooms, setRooms] = useState<Room[]>(() => {
    try {
      const s = localStorage.getItem("cleaning_rooms");
      return s ? (JSON.parse(s) as Room[]) : DEFAULT_ROOMS;
    } catch {
      return DEFAULT_ROOMS;
    }
  });

  const [cleaningTasks, setCleaningTasks] = useState<CleaningTask[]>(() => {
    try {
      const s = localStorage.getItem("cleaning_tasks");
      return s ? (JSON.parse(s) as CleaningTask[]) : [];
    } catch {
      return [];
    }
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(rooms[0]?.id ?? null);

  useEffect(() => {
    localStorage.setItem("cleaning_rooms", JSON.stringify(rooms));
  }, [rooms]);

  useEffect(() => {
    localStorage.setItem("cleaning_tasks", JSON.stringify(cleaningTasks));
  }, [cleaningTasks]);

  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomIcon, setNewRoomIcon] = useState(ROOM_ICON_PRESETS[0]);

  const addRoom = () => {
    if (!newRoomName.trim()) return;
    const room: Room = { id: Date.now().toString(), name: newRoomName.trim(), icon: newRoomIcon };
    setRooms([...rooms, room]);
    setSelectedRoomId(room.id);
    setNewRoomName("");
  };

  const deleteRoom = (roomId: string) => {
    cleaningTasks.filter((t) => t.roomId === roomId).forEach((t) => removeCleaningCalendarEvent(t.id));
    setCleaningTasks(cleaningTasks.filter((t) => t.roomId !== roomId));
    setRooms(rooms.filter((r) => r.id !== roomId));
    if (selectedRoomId === roomId) setSelectedRoomId(rooms.find((r) => r.id !== roomId)?.id ?? null);
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

  const addCleaningTask = () => {
    if (!newTaskTitle.trim() || !selectedRoomId) return;

    const task: CleaningTask = {
      id: Date.now().toString(),
      roomId: selectedRoomId,
      title: newTaskTitle.trim(),
      supplies: newTaskSupplies,
      recurrence: newTaskRecurrence,
      assignee: newTaskAssignee.trim() || undefined,
      nextDue: todayISO(),
    };

    setCleaningTasks([...cleaningTasks, task]);
    const room = rooms.find((r) => r.id === selectedRoomId);
    upsertCleaningCalendarEvent({
      taskId: task.id,
      title: `${room?.name ?? "Room"}: ${task.title}`,
      date: task.nextDue,
    });

    setNewTaskTitle("");
    setNewTaskSupplies([]);
    setNewTaskAssignee("");
  };

  const markDone = (task: CleaningTask) => {
    onAwardPoints(POINTS_BY_RECURRENCE[task.recurrence]);

    if (task.recurrence === "once") {
      removeCleaningCalendarEvent(task.id);
      setCleaningTasks(cleaningTasks.filter((t) => t.id !== task.id));
      return;
    }

    const today = todayISO();
    const nextDue = computeNextDue(task.recurrence, today);
    setCleaningTasks(
      cleaningTasks.map((t) => (t.id === task.id ? { ...t, lastDone: today, nextDue } : t))
    );
    const room = rooms.find((r) => r.id === task.roomId);
    upsertCleaningCalendarEvent({ taskId: task.id, title: `${room?.name ?? "Room"}: ${task.title}`, date: nextDue });
  };

  const deleteCleaningTask = (taskId: string) => {
    removeCleaningCalendarEvent(taskId);
    setCleaningTasks(cleaningTasks.filter((t) => t.id !== taskId));
  };

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;
  const tasksInRoom = cleaningTasks.filter((t) => t.roomId === selectedRoomId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Rooms */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-teal-600" />
            Rooms
          </h2>
          <div className="space-y-2">
            {rooms.map((room) => {
              const roomTasks = cleaningTasks.filter((t) => t.roomId === room.id);
              const overdueCount = roomTasks.filter((t) => t.nextDue < todayISO()).length;
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full group flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    selectedRoomId === room.id
                      ? "bg-teal-50 dark:bg-teal-900/20 border-teal-400 dark:border-teal-700"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-100">
                    <span className="text-lg">{room.icon}</span> {room.name}
                  </span>
                  <span className="flex items-center gap-2">
                    {overdueCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold">
                        {overdueCount}
                      </span>
                    )}
                    <Trash2
                      className="w-4 h-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRoom(room.id);
                      }}
                    />
                  </span>
                </button>
              );
            })}
            {rooms.length === 0 && <p className="text-sm text-gray-500 py-2">No rooms yet.</p>}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <div className="flex gap-1 flex-wrap">
              {ROOM_ICON_PRESETS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewRoomIcon(icon)}
                  className={`text-lg p-1.5 rounded-lg border ${
                    newRoomIcon === icon ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
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
                placeholder="New room name"
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <button
                onClick={addRoom}
                className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks for selected room */}
      <div className="lg:col-span-2 space-y-4">
        {!selectedRoom ? (
          <div className="text-center py-16 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            Add a room to start building your cleaning plan.
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-3">
              <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-xl">{selectedRoom.icon}</span> {selectedRoom.name} — add a task
              </h2>

              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCleaningTask()}
                placeholder="e.g. Wipe down counters"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-teal-500 outline-none"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <Repeat className="w-3 h-3" /> Frequency
                  </label>
                  <select
                    value={newTaskRecurrence}
                    onChange={(e) => setNewTaskRecurrence(e.target.value as Recurrence)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none"
                  >
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Assignee (optional)
                  </label>
                  <input
                    type="text"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    placeholder="Who's on it?"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <SprayCan className="w-3 h-3" /> Cleaning supplies needed
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SUPPLY_SUGGESTIONS.map((supply) => (
                    <button
                      key={supply}
                      type="button"
                      onClick={() => toggleSupply(supply)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        newTaskSupplies.includes(supply)
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {supply}
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
                    placeholder="Add a custom supply..."
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm outline-none"
                  />
                  <button
                    onClick={addCustomSupply}
                    type="button"
                    className="px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Add
                  </button>
                </div>
                {newTaskSupplies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {newTaskSupplies.map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={addCleaningTask}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add cleaning task
              </button>
            </div>

            <div className="space-y-3">
              {tasksInRoom.map((task) => {
                const status = dueStatus(task.nextDue);
                return (
                  <div
                    key={task.id}
                    className="group flex items-start justify-between gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => markDone(task)}
                        title="Mark as done"
                        className="flex-shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 flex items-center justify-center text-transparent hover:text-teal-500 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{task.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${status.className}`}>
                            <CalendarClock className="w-3 h-3" /> {status.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            {RECURRENCE_OPTIONS.find((r) => r.value === task.recurrence)?.label}
                          </span>
                          {task.assignee && (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center gap-1">
                              <User className="w-3 h-3" /> {task.assignee}
                            </span>
                          )}
                        </div>
                        {task.supplies.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.supplies.map((s) => (
                              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                                <SprayCan className="w-2.5 h-2.5" /> {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteCleaningTask(task.id)}
                      className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              {tasksInRoom.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  No cleaning tasks in {selectedRoom.name} yet.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
