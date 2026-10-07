"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, DoorOpen, Plus, Trash2 } from "lucide-react";
import Mascot from "@/components/Mascot";
import { useI18n } from "../../context/LanguageContext";
import { ROOM_ICON_PRESETS, ROOM_PRESETS, localizeKnown } from "../constants";
import { nextOccurrence, dueLabel, waitingLabel } from "../routines/agenda";
import { buildSuggestedRoutine } from "../routines/quickAdd";
import { remainingSuggestions, summarizeRoom, type RoomStatus, type RoomSummary } from "../routines/rooms";
import { daysBetween } from "../routines/schedule";
import type { Occurrence, Routine } from "../routines/types";
import type { NewRoutine } from "../routines/useRoutines";
import type { Room } from "../types";
import type { useRooms } from "../useRooms";
import QuickAdd from "./QuickAdd";
import RoutineRow from "./RoutineRow";
import type { RowContext } from "./rowContext";

const STATUS_STYLE: Record<RoomStatus, React.CSSProperties> = {
  empty: { background: "var(--surface-2)", color: "var(--text-secondary)" },
  ok: { background: "var(--success-soft)", color: "var(--success)" },
  soon: { background: "var(--accent-soft)", color: "var(--accent)" },
  today: { background: "var(--warning-soft)", color: "var(--warning)" },
  overdue: { background: "var(--danger-soft)", color: "var(--danger)" },
};

function StatusPill({ summary }: { summary: RoomSummary }) {
  const { t } = useI18n();
  const label: Record<RoomStatus, string> = {
    empty: t("Nothing planned", "Nichts geplant"),
    ok: t("All good", "Alles gut"),
    soon: t("Coming up", "Bald dran"),
    today: t("Due today", "Heute dran"),
    overdue: summary.dueCount > 1 ? t(`${summary.dueCount} waiting`, `${summary.dueCount} warten`) : t("Waiting", "Wartet"),
  };
  return (
    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={STATUS_STYLE[summary.status]}>
      {label[summary.status]}
    </span>
  );
}

interface Props {
  today: string;
  roomStore: ReturnType<typeof useRooms>;
  routines: Routine[];
  occurrences: Occurrence[];
  ctx: RowContext;
  onAddRoutine: (routine: NewRoutine) => Promise<boolean>;
  onMoreOptions: (title: string, roomId: string | null) => void;
  cleaningOpen: number;
  onMoveCleaning: () => Promise<void>;
}

// "Räume": how each room is doing, and what belongs to it. A room is where Küche, Bad and
// Schlafzimmer get their own kind of tasks.
export default function RoomsView({
  today,
  roomStore,
  routines,
  occurrences,
  ctx,
  onAddRoutine,
  onMoreOptions,
  cleaningOpen,
  onMoveCleaning,
}: Props) {
  const { t, lang } = useI18n();
  const { rooms, addRoom, deleteRoom } = roomStore;
  const { members, userId } = ctx;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(ROOM_ICON_PRESETS[0]);
  const [movingCleaning, setMovingCleaning] = useState(false);

  const summaries = useMemo(
    () => new Map(rooms.map((r) => [r.id, summarizeRoom(r.id, routines, occurrences, today)])),
    [rooms, routines, occurrences, today]
  );
  const roomName = (r: Room) => localizeKnown(r.name, ROOM_PRESETS, lang);
  const selected = rooms.find((r) => r.id === selectedId) ?? null;
  const strayCount = routines.filter((r) => r.kind !== "bill" && !r.roomId).length;

  const submitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = await addRoom(newName, newIcon);
    if (room) {
      setNewName("");
      setAdding(false);
      setSelectedId(room.id);
    }
  };

  const inRoom = selected
    ? routines
        .filter((r) => r.roomId === selected.id && r.kind !== "bill")
        .map((r) => ({ routine: r, occurrence: nextOccurrence(r, occurrences, today) }))
        .sort((a, b) => (a.occurrence?.dueDate ?? "9999").localeCompare(b.occurrence?.dueDate ?? "9999") || a.routine.title.localeCompare(b.routine.title))
    : [];
  const suggestions = selected ? remainingSuggestions(selected.icon, inRoom.map((x) => x.routine.title)) : [];

  const nextLabel = (summary: RoomSummary) => {
    if (!summary.nextDue) return null;
    const days = daysBetween(today, summary.nextDue);
    return days < 0 ? waitingLabel(days, summary.nextDue, lang) : dueLabel(days, summary.nextDue, lang);
  };

  return (
    <div className="space-y-4">
      {cleaningOpen > 0 && (
        <div className="surface p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            {t(
              `Your old cleaning plan still has ${cleaningOpen} ${cleaningOpen === 1 ? "task" : "tasks"}. They can move into the rooms here.`,
              `In deinem alten Putzplan ${cleaningOpen === 1 ? "liegt" : "liegen"} noch ${cleaningOpen} ${cleaningOpen === 1 ? "Aufgabe" : "Aufgaben"}. Sie können in die Räume hier umziehen.`
            )}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={movingCleaning}
            onClick={async () => {
              setMovingCleaning(true);
              await onMoveCleaning();
              setMovingCleaning(false);
            }}
          >
            {t("Move them over", "Jetzt umziehen")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* The rooms. On a phone they give way to the room that is open. */}
        <div className={`${selected ? "hidden lg:block" : ""} lg:col-span-2 space-y-3`}>
          {rooms.length === 0 && <p className="text-caption">{t("No rooms yet.", "Noch keine Räume.")}</p>}
          {rooms.map((room) => {
            const summary = summaries.get(room.id)!;
            const next = nextLabel(summary);
            const active = selectedId === room.id;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => {
                  setSelectedId(room.id);
                  setConfirmDeleteId(null);
                }}
                aria-pressed={active}
                className="surface press w-full text-left p-4 flex items-center gap-3"
                style={active ? { borderColor: "var(--accent)" } : undefined}
              >
                <span className="text-3xl shrink-0" aria-hidden>{room.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{roomName(room)}</span>
                  <span className="block text-caption truncate">
                    {summary.routineCount === 0
                      ? t("Tap to add the first task", "Tippe, um die erste Aufgabe zu ergänzen")
                      : `${t(summary.routineCount === 1 ? "1 task" : `${summary.routineCount} tasks`, summary.routineCount === 1 ? "1 Aufgabe" : `${summary.routineCount} Aufgaben`)}${next ? ` · ${next}` : ""}`}
                  </span>
                </span>
                <StatusPill summary={summary} />
              </button>
            );
          })}

          {adding ? (
            <form onSubmit={submitRoom} className="surface p-4 space-y-3 animate-rise">
              <div className="flex flex-wrap gap-1">
                {ROOM_ICON_PRESETS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewIcon(icon)}
                    aria-label={t(`Icon ${icon}`, `Symbol ${icon}`)}
                    className="press text-xl p-1.5 rounded-[var(--radius-sm)] border"
                    style={{ borderColor: newIcon === icon ? "var(--accent)" : "transparent", background: newIcon === icon ? "var(--accent-soft)" : "transparent" }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="field flex-1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("Name of the new room", "Name des neuen Raums")}
                  aria-label={t("Name of the new room", "Name des neuen Raums")}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary btn-icon" disabled={!newName.trim()} aria-label={t("Add room", "Raum hinzufügen")}>
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>{t("Cancel", "Abbrechen")}</button>
            </form>
          ) : (
            <button type="button" className="btn btn-secondary w-full" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4" /> {t("New room", "Neuer Raum")}
            </button>
          )}

          {strayCount > 0 && (
            <p className="text-caption px-1">
              {t(
                `${strayCount} ${strayCount === 1 ? "task has" : "tasks have"} no room. You can pick one in its details.`,
                `${strayCount} ${strayCount === 1 ? "Aufgabe hat" : "Aufgaben haben"} keinen Raum. In den Details kannst du einen wählen.`
              )}
            </p>
          )}
        </div>

        {/* The open room. */}
        <div className={`${selected ? "" : "hidden lg:block"} lg:col-span-3 space-y-4`}>
          {!selected ? (
            <div className="surface flex flex-col items-center text-center px-6 py-12 text-[var(--text-secondary)]">
              <Mascot mood="think" size={80} />
              <p className="font-hand text-2xl font-semibold mt-2">{t("Pick a room", "Wähl einen Raum")}</p>
              <p className="text-caption mt-1">{t("Each room has its own tasks and its own ideas.", "Jeder Raum hat seine eigenen Aufgaben und Ideen.")}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button type="button" className="btn btn-ghost btn-sm lg:hidden" onClick={() => setSelectedId(null)}>
                  <ChevronLeft className="w-4 h-4" /> {t("All rooms", "Alle Räume")}
                </button>
                <h2 className="text-headline flex items-center gap-2 min-w-0 flex-1">
                  <span aria-hidden>{selected.icon}</span>
                  <span className="truncate">{roomName(selected)}</span>
                </h2>
                {confirmDeleteId === selected.id ? (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        setConfirmDeleteId(null);
                        setSelectedId(null);
                        deleteRoom(selected.id);
                      }}
                    >
                      {t("Delete room", "Raum löschen")}
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDeleteId(null)}>{t("Cancel", "Abbrechen")}</button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm shrink-0"
                    onClick={() => setConfirmDeleteId(selected.id)}
                    aria-label={t("Delete room", "Raum löschen")}
                    title={t("Delete room", "Raum löschen")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {confirmDeleteId === selected.id && (
                <p className="text-caption -mt-2">{t("The tasks stay, they just lose their room.", "Die Aufgaben bleiben, nur der Raum fällt weg.")}</p>
              )}

              {suggestions.length > 0 && (
                <div className="surface p-4">
                  <div className="text-micro mb-2">{t("Ideas for this room", "Ideen für diesen Raum")}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((sug) => (
                      <button
                        key={sug.key}
                        type="button"
                        className="chip"
                        onClick={() => onAddRoutine(buildSuggestedRoutine(sug, { roomId: selected.id, lang, today }))}
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden /> {sug.title[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <QuickAdd
                key={selected.id}
                today={today}
                members={members}
                userId={userId}
                rooms={rooms}
                fixedRoom={selected}
                allowUndated={false}
                defaultWhen="weekly"
                placeholder={t("Add your own task for this room …", "Eigene Aufgabe für diesen Raum …")}
                onAddRoutine={onAddRoutine}
                onAddTask={async () => false}
                onMoreOptions={onMoreOptions}
              />

              <div className="surface p-4">
                {inRoom.length === 0 ? (
                  <p className="text-caption flex items-center gap-2">
                    <DoorOpen className="w-4 h-4" aria-hidden />
                    {t("No tasks here yet. Tap an idea above or write your own.", "Hier ist noch nichts. Tippe oben auf eine Idee oder schreib selbst etwas auf.")}
                  </p>
                ) : (
                  <ul>
                    {inRoom.map(({ routine, occurrence }) => (
                      <RoutineRow key={routine.id} routine={routine} occurrence={occurrence} today={today} variant="manage" showRoom={false} ctx={ctx} />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
