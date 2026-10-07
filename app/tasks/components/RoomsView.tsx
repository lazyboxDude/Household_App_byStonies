"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "../../context/LanguageContext";
import { ROOM_ICON_PRESETS, ROOM_PRESETS, localizeKnown } from "../constants";
import { dueLabel, nextOccurrence, waitingLabel } from "../routines/agenda";
import { buildSuggestedRoutine } from "../routines/quickAdd";
import { remainingSuggestions, routinesInRoom, summarizeRoom, type RoomStatus, type RoomSummary } from "../routines/rooms";
import { daysBetween } from "../routines/schedule";
import type { Occurrence, Routine } from "../routines/types";
import type { NewRoutine } from "../routines/useRoutines";
import type { Room } from "../types";
import type { useRooms } from "../useRooms";
import CleaningMoveBanner from "./CleaningMoveBanner";
import QuickAdd from "./QuickAdd";
import RoutineRow from "./RoutineRow";
import Sheet from "./Sheet";
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
    <span className="inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={STATUS_STYLE[summary.status]}>
      {label[summary.status]}
    </span>
  );
}

// One room on the overview: just enough to see how it is doing, nothing to read twice.
function Tile({ icon, name, summary, caption, onOpen }: { icon: string; name: string; summary: RoomSummary; caption: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="surface press text-left p-4 flex flex-col items-start gap-1.5 min-h-[8.5rem]">
      <span className="text-4xl leading-none" aria-hidden>{icon}</span>
      <span className="font-medium leading-tight line-clamp-2 mt-1">{name}</span>
      <StatusPill summary={summary} />
      <span className="text-caption line-clamp-2">{caption}</span>
    </button>
  );
}

// What is open: a room, the chores that have none, or the form for a new room.
type Open = { kind: "room"; id: string } | { kind: "stray" } | { kind: "new" } | null;

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

// "Räume": first choose a room, then a window opens with its tasks. The overview stays calm, the
// details live in the window, so nothing changes behind your back while you look at the rooms.
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
  const [open, setOpen] = useState<Open>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(ROOM_ICON_PRESETS[0]);

  const summaries = useMemo(
    () => new Map(rooms.map((r) => [r.id, summarizeRoom(r.id, routines, occurrences, today)])),
    [rooms, routines, occurrences, today]
  );
  const straySummary = useMemo(() => summarizeRoom(null, routines, occurrences, today), [routines, occurrences, today]);
  const roomName = (r: Room) => localizeKnown(r.name, ROOM_PRESETS, lang);
  const selected = open?.kind === "room" ? rooms.find((r) => r.id === open.id) ?? null : null;

  const rowsFor = (roomId: string | null) =>
    routinesInRoom(roomId, routines)
      .map((r) => ({ routine: r, occurrence: nextOccurrence(r, occurrences, today) }))
      .sort((a, b) => (a.occurrence?.dueDate ?? "9999").localeCompare(b.occurrence?.dueDate ?? "9999") || a.routine.title.localeCompare(b.routine.title));

  const nextLabel = (summary: RoomSummary) => {
    if (!summary.nextDue) return null;
    const days = daysBetween(today, summary.nextDue);
    return days < 0 ? waitingLabel(days, summary.nextDue, lang) : dueLabel(days, summary.nextDue, lang);
  };
  const caption = (summary: RoomSummary) => {
    if (summary.routineCount === 0) return t("Tap to get started", "Tippe zum Loslegen");
    const n = summary.routineCount;
    const count = t(n === 1 ? "1 task" : `${n} tasks`, n === 1 ? "1 Aufgabe" : `${n} Aufgaben`);
    const next = nextLabel(summary);
    return next ? `${count} · ${next}` : count;
  };

  const close = () => {
    setOpen(null);
    setConfirmDelete(false);
  };
  const openRoom = (id: string) => {
    setConfirmDelete(false);
    setOpen({ kind: "room", id });
  };

  const submitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = await addRoom(newName, newIcon);
    if (room) {
      setNewName("");
      openRoom(room.id);
    }
  };

  const roomRows = selected ? rowsFor(selected.id) : [];
  const suggestions = selected ? remainingSuggestions(selected.icon, roomRows.map((x) => x.routine.title)) : [];
  const strayRows = open?.kind === "stray" ? rowsFor(null) : [];

  return (
    <div className="space-y-4">
      <CleaningMoveBanner count={cleaningOpen} onMove={onMoveCleaning} />

      {rooms.length === 0 && <p className="text-caption">{t("No rooms yet. Add the first one.", "Noch keine Räume. Lege den ersten an.")}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {rooms.map((room) => {
          const summary = summaries.get(room.id)!;
          return <Tile key={room.id} icon={room.icon} name={roomName(room)} summary={summary} caption={caption(summary)} onOpen={() => openRoom(room.id)} />;
        })}

        {straySummary.routineCount > 0 && (
          <Tile icon="🗂️" name={t("No room", "Ohne Raum")} summary={straySummary} caption={caption(straySummary)} onOpen={() => setOpen({ kind: "stray" })} />
        )}

        <button
          type="button"
          onClick={() => setOpen({ kind: "new" })}
          className="press min-h-[8.5rem] p-4 flex flex-col items-center justify-center gap-1.5 text-[var(--text-secondary)] rounded-[var(--wobble-lg)] border-2 border-dashed"
          style={{ borderColor: "var(--border-strong)" }}
        >
          <Plus className="w-6 h-6" aria-hidden />
          <span className="font-medium">{t("New room", "Neuer Raum")}</span>
        </button>
      </div>

      {selected && (
        <Sheet
          onClose={close}
          title={
            <>
              <span aria-hidden>{selected.icon}</span>
              <span className="truncate">{roomName(selected)}</span>
            </>
          }
          actions={
            <button
              type="button"
              className="press btn btn-ghost btn-icon shrink-0"
              onClick={() => setConfirmDelete((v) => !v)}
              aria-label={t("Delete room", "Raum löschen")}
              title={t("Delete room", "Raum löschen")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          }
        >
          {confirmDelete && (
            <div className="rounded-[var(--radius-md)] p-3 space-y-2" style={{ background: "var(--surface-2)" }}>
              <p className="text-sm">{t("Delete this room? The tasks stay, they just lose their room.", "Diesen Raum löschen? Die Aufgaben bleiben, nur der Raum fällt weg.")}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    const id = selected.id;
                    close();
                    deleteRoom(id);
                  }}
                >
                  {t("Yes, delete", "Ja, löschen")}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                  {t("Cancel", "Abbrechen")}
                </button>
              </div>
            </div>
          )}

          <section>
            <h3 className="text-micro flex items-center gap-2 mb-1">
              {t("Tasks", "Aufgaben")}
              <span className="rounded-full px-1.5 py-px" style={{ background: "var(--surface-2)" }}>{roomRows.length}</span>
              <span className="ml-auto normal-case">
                <StatusPill summary={summaries.get(selected.id)!} />
              </span>
            </h3>
            {roomRows.length === 0 ? (
              <p className="text-caption py-1">{t("Nothing planned here yet. Tap an idea or write your own.", "Hier ist noch nichts geplant. Tippe auf eine Idee oder schreib selbst etwas auf.")}</p>
            ) : (
              <ul>
                {roomRows.map(({ routine, occurrence }) => (
                  <RoutineRow key={routine.id} routine={routine} occurrence={occurrence} today={today} variant="manage" showRoom={false} ctx={ctx} />
                ))}
              </ul>
            )}
          </section>

          {suggestions.length > 0 && (
            <section>
              <h3 className="text-micro mb-2">{t("Ideas for this room", "Ideen für diesen Raum")}</h3>
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
            </section>
          )}

          <QuickAdd
            key={selected.id}
            plain
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
            onMoreOptions={(title, roomId) => {
              // The full form opens on the page, so the window gets out of the way.
              close();
              onMoreOptions(title, roomId);
            }}
          />
        </Sheet>
      )}

      {open?.kind === "stray" && (
        <Sheet
          onClose={close}
          title={
            <>
              <span aria-hidden>🗂️</span>
              <span className="truncate">{t("No room", "Ohne Raum")}</span>
            </>
          }
        >
          <p className="text-caption">{t("These tasks have no room yet. Open one and pick a room.", "Diese Aufgaben haben noch keinen Raum. Öffne eine und wähle einen.")}</p>
          {strayRows.length === 0 ? (
            <p className="text-sm">{t("Every task has a room now.", "Jede Aufgabe hat jetzt einen Raum.")}</p>
          ) : (
            <ul>
              {strayRows.map(({ routine, occurrence }) => (
                <RoutineRow key={routine.id} routine={routine} occurrence={occurrence} today={today} variant="manage" showRoom={false} ctx={ctx} />
              ))}
            </ul>
          )}
        </Sheet>
      )}

      {open?.kind === "new" && (
        <Sheet onClose={close} title={t("New room", "Neuer Raum")}>
          <form onSubmit={submitRoom} className="space-y-4">
            <div className="flex flex-wrap gap-1" role="group" aria-label={t("Icon", "Symbol")}>
              {ROOM_ICON_PRESETS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewIcon(icon)}
                  aria-label={t(`Icon ${icon}`, `Symbol ${icon}`)}
                  aria-pressed={newIcon === icon}
                  className="press text-2xl p-2 rounded-[var(--radius-sm)] border"
                  style={{ borderColor: newIcon === icon ? "var(--accent)" : "transparent", background: newIcon === icon ? "var(--accent-soft)" : "transparent" }}
                >
                  {icon}
                </button>
              ))}
            </div>
            <div>
              <label className="text-caption mb-1 block" htmlFor="new-room-name">{t("Name of the new room", "Name des neuen Raums")}</label>
              <input id="new-room-name" className="field" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={!newName.trim()}>
              {t("Add room", "Raum anlegen")}
            </button>
          </form>
        </Sheet>
      )}
    </div>
  );
}
