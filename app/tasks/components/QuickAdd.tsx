"use client";

import { useRef, useState } from "react";
import { Lock, Plus, Users } from "lucide-react";
import { useI18n } from "../../context/LanguageContext";
import { ROOM_PRESETS, localizeKnown } from "../constants";
import { buildQuickRoutine, type QuickWhen, type QuickWho } from "../routines/quickAdd";
import type { NewRoutine } from "../routines/useRoutines";
import type { Room } from "../types";
import type { Person } from "./rowContext";

interface Props {
  today: string;
  members: Person[];
  userId: string | undefined;
  rooms: Room[];
  // Inside a room the task belongs to that room, so the room chips are left out.
  fixedRoom?: Room;
  // A plain to-do without a date is only offered where it makes sense (the Heute list).
  allowUndated: boolean;
  defaultWhen: QuickWhen;
  placeholder: string;
  onAddRoutine: (routine: NewRoutine) => Promise<boolean>;
  onAddTask: (title: string, shared: boolean, assignee: string | null) => Promise<boolean>;
  // Hands the typed title to the full form.
  onMoreOptions: (title: string, roomId: string | null) => void;
}

// One line to add a task. The chips only show up once something is typed, and they all have a
// sensible default, so a quick to-do is: type, Enter.
export default function QuickAdd({
  today,
  members,
  userId,
  rooms,
  fixedRoom,
  allowUndated,
  defaultWhen,
  placeholder,
  onAddRoutine,
  onAddTask,
  onMoreOptions,
}: Props) {
  const { t, lang } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<QuickWhen>(defaultWhen);
  const [who, setWho] = useState<string>("open"); // "open" | "turns" | a member id
  const [roomId, setRoomId] = useState<string | null>(null);
  const [shared, setShared] = useState(true);
  const [saving, setSaving] = useState(false);

  const undated = when === "none";
  const withOthers = members.length > 1;
  const effectiveRoom = fixedRoom?.id ?? roomId;
  const whenOptions: { value: QuickWhen; label: string }[] = [
    ...(allowUndated ? [{ value: "none" as const, label: t("No date", "Ohne Datum") }] : []),
    { value: "today", label: t("Today", "Heute") },
    { value: "tomorrow", label: t("Tomorrow", "Morgen") },
    { value: "daily", label: t("Daily", "Täglich") },
    { value: "weekly", label: t("Weekly", "Wöchentlich") },
    { value: "biweekly", label: t("Every 2 weeks", "Alle 2 Wochen") },
    { value: "monthly", label: t("Monthly", "Monatlich") },
  ];

  const reset = () => {
    setTitle("");
    setWhen(defaultWhen);
    setWho("open");
    setRoomId(null);
    setShared(true);
    inputRef.current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = title.trim();
    if (!text || saving) return;
    setSaving(true);
    let ok: boolean;
    if (undated) {
      const person = who !== "open" && who !== "turns" ? members.find((m) => m.id === who)?.name ?? null : null;
      ok = await onAddTask(text, shared, person);
    } else {
      const room = effectiveRoom ? rooms.find((r) => r.id === effectiveRoom) : undefined;
      const quickWho: QuickWho = who === "open" ? { type: "open" } : who === "turns" ? { type: "turns" } : { type: "member", id: who };
      const built = buildQuickRoutine({
        title: text,
        when: when as Exclude<QuickWhen, "none">,
        who: quickWho,
        roomId: effectiveRoom ?? null,
        icon: room?.icon,
        today,
        userId,
        memberIds: members.map((m) => m.id),
      });
      ok = built ? await onAddRoutine(built) : false;
    }
    setSaving(false);
    if (ok) reset();
  };

  const nameOf = (m: Person) => (m.id === userId ? t("Me", "Ich") : m.name);
  // Me first, then the others.
  const ordered = [...members].sort((a, b) => Number(b.id === userId) - Number(a.id === userId));

  return (
    <div className="surface p-4 space-y-3">
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="field flex-1"
          enterKeyHint="done"
        />
        <button
          type="submit"
          disabled={!title.trim() || saving}
          aria-label={t("Add task", "Aufgabe hinzufügen")}
          className="btn btn-primary btn-icon shrink-0"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {title.trim() && (
        <div className="space-y-2.5 animate-rise">
          <div>
            <div className="text-micro mb-1">{t("When", "Wann")}</div>
            <div className="flex flex-wrap gap-1.5">
              {whenOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className="chip"
                  data-active={when === o.value}
                  onClick={() => {
                    setWhen(o.value);
                    // Taking turns needs a task that comes back; a to-do without a date cannot rotate.
                    if (o.value === "none" && who === "turns") setWho("open");
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {withOthers && (undated ? shared : true) && (
            <div>
              <div className="text-micro mb-1">{t("Who", "Wer")}</div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className="chip" data-active={who === "open"} onClick={() => setWho("open")}>
                  {t("Whoever has time", "Wer Zeit hat")}
                </button>
                {ordered.map((m) => (
                  <button key={m.id} type="button" className="chip" data-active={who === m.id} onClick={() => setWho(m.id)}>
                    {nameOf(m)}
                  </button>
                ))}
                {!undated && (
                  <button type="button" className="chip" data-active={who === "turns"} onClick={() => setWho("turns")}>
                    {t("Taking turns", "Abwechselnd")}
                  </button>
                )}
              </div>
            </div>
          )}

          {!undated && !fixedRoom && rooms.length > 0 && (
            <div>
              <div className="text-micro mb-1">{t("Room", "Raum")}</div>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className="chip" data-active={roomId === null} onClick={() => setRoomId(null)}>
                  {t("No room", "Kein Raum")}
                </button>
                {rooms.map((r) => (
                  <button key={r.id} type="button" className="chip" data-active={roomId === r.id} onClick={() => setRoomId(r.id)}>
                    <span aria-hidden>{r.icon}</span> {localizeKnown(r.name, ROOM_PRESETS, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            {undated && withOthers ? (
              <button
                type="button"
                onClick={() => setShared((v) => !v)}
                className="press flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full"
                style={{ background: shared ? "var(--accent-soft)" : "var(--surface-2)", color: shared ? "var(--accent)" : "var(--text-secondary)" }}
                title={shared ? t("Visible to the whole household", "Für den ganzen Haushalt sichtbar") : t("Only visible to you", "Nur für dich sichtbar")}
              >
                {shared ? <Users className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {shared ? t("Shared", "Geteilt") : t("Only me", "Nur ich")}
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                onMoreOptions(title.trim(), effectiveRoom ?? null);
                reset();
              }}
            >
              {t("More options …", "Mehr Optionen …")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
