"use client";

import { useId, useMemo, useState } from "react";
import { SkipForward, Trash2 } from "lucide-react";
import { useI18n } from "../../context/LanguageContext";
import { SUPPLY_SUGGESTIONS, ROOM_PRESETS, localizeKnown } from "../constants";
import { describeRoutine } from "../routines/describe";
import { previewDates, scheduleFieldsFromRoutine, scheduleFromFields, type ScheduleFields } from "../routines/formModel";
import { localeOf } from "../routines/i18n";
import { KNOWN_TITLES } from "../routines/knownTitles";
import { turnOrder } from "../routines/quickAdd";
import { PRESETS, presetOf, presetRhythm, type Preset } from "../routines/rhythm";
import type { Occurrence, Rhythm, Routine } from "../routines/types";
import ScheduleEditor from "../routines/components/ScheduleEditor";
import type { RowContext } from "./rowContext";

type Who = "open" | "turns" | "fair" | { member: string };

function currentWho(r: Routine): Who {
  if (r.assignment === "fixed" && r.assigneeId) return { member: r.assigneeId };
  if (r.assignment === "rotation") return "turns";
  if (r.assignment === "fair_share") return "fair";
  return "open";
}

const same = (a: Who, b: Who) => (typeof a === "string" || typeof b === "string" ? a === b : a.member === b.member);

// The details behind a row: how often it comes back, what it needs, and the few things worth
// changing later (name, room, who does it), plus skipping this time and deleting.
export default function RoutineEditPanel({
  routine,
  occurrence,
  today,
  ctx,
}: {
  routine: Routine;
  occurrence: Occurrence | null;
  today: string;
  ctx: RowContext;
}) {
  const { t, lang } = useI18n();
  const { members, userId, rooms, actions } = ctx;
  const editorId = useId();
  const shownTitle = localizeKnown(routine.title, KNOWN_TITLES, lang);
  const [title, setTitle] = useState(shownTitle);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // The full editor for the rhythm: the fields as they are being changed, and the date it started at.
  const [editor, setEditor] = useState<{ fields: ScheduleFields; startedAt: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isBill = routine.kind === "bill";
  const who = currentWho(routine);
  // Me first, then the others in the household's order.
  const memberIds = turnOrder(members.map((m) => m.id), userId);

  const rhythm: Rhythm = { schedule: routine.schedule, mode: routine.mode, activeMonths: routine.activeMonths };
  const preset = presetOf(rhythm);
  const nextDue = occurrence?.dueDate ?? null;
  const presetLabels: Record<Preset, string> = {
    once: t("Once", "Einmalig"),
    daily: t("Daily", "Täglich"),
    weekly: t("Weekly", "Wöchentlich"),
    biweekly: t("Every 2 weeks", "Alle 2 Wochen"),
    monthly: t("Monthly", "Monatlich"),
  };
  // A rhythm none of the chips names ("Every Mon, Thu") is shown as a chip of its own, selected.
  const ownLabel =
    describeRoutine(routine, lang, true) +
    (routine.schedule.type === "interval" && routine.mode === "fixed" ? ` · ${t("fixed rhythm", "fester Rhythmus")}` : "");

  const built = useMemo(() => (editor ? scheduleFromFields(editor.fields) : null), [editor]);
  const preview = built?.ok && built.rhythm.mode === "fixed" ? previewDates(built.rhythm, today) : [];
  const formatDate = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(localeOf(lang), { weekday: "short", day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });

  const saveTitle = () => {
    const next = title.trim();
    if (!next || next === shownTitle) {
      setTitle(shownTitle);
      return;
    }
    actions.update(routine.id, { title: next });
  };

  const choosePreset = (next: Preset) => {
    if (next === preset) return;
    setEditor(null);
    actions.update(routine.id, { rhythm: presetRhythm(next, today, nextDue ?? today) });
  };

  const toggleEditor = () => {
    if (editor) {
      setEditor(null);
      return;
    }
    const fields = scheduleFieldsFromRoutine(rhythm, today, nextDue, lang);
    setEditor({ fields, startedAt: fields.startDate });
    setMessage(null);
  };

  const saveRhythm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor || !built) return;
    if (!built.ok) {
      setMessage(built.message[lang]);
      return;
    }
    setMessage(null);
    // The date it counts from only changes when the person picked one. Otherwise a fixed rhythm
    // keeps the start it already has, so its dates do not shift.
    const picked = editor.fields.repeat === "interval" && editor.fields.startDate && editor.fields.startDate !== editor.startedAt ? editor.fields.startDate : null;
    let next = built.rhythm;
    if (!picked && next.schedule.type === "interval" && routine.schedule.type === "interval" && routine.mode === "fixed") {
      next = { ...next, schedule: { ...next.schedule, anchor: routine.schedule.anchor } };
    }
    setSaving(true);
    const ok = await actions.update(routine.id, { rhythm: { ...next, dueDate: picked } });
    setSaving(false);
    if (ok) setEditor(null);
  };

  const chooseWho = (next: Who) => {
    if (same(who, next)) return;
    if (next === "open") actions.update(routine.id, { assignment: "open" });
    else if (next === "turns") actions.update(routine.id, { assignment: "rotation", rotation: memberIds });
    else if (next === "fair") actions.update(routine.id, { assignment: "fair_share" });
    else actions.update(routine.id, { assignment: "fixed", assigneeId: next.member });
  };

  const nameOf = (id: string) => (id === userId ? t("Me", "Ich") : members.find((m) => m.id === id)?.name ?? "?");
  const supplies =
    routine.supplies.length > 0 ? `${t("Supplies", "Material")}: ${routine.supplies.map((s) => localizeKnown(s, SUPPLY_SUGGESTIONS, lang)).join(", ")}` : null;

  return (
    <div className="mt-1 mb-2 ml-10 rounded-[var(--radius-md)] p-3 space-y-3" style={{ background: "var(--surface-2)" }}>
      {isBill ? (
        <div className="text-caption">
          {describeRoutine(routine, lang)}
          {supplies && <> · {supplies}</>}
        </div>
      ) : (
        supplies && <div className="text-caption">{supplies}</div>
      )}

      {!isBill && (
        <>
          <div>
            <label className="text-caption mb-1 block" htmlFor={`title-${routine.id}`}>{t("Name", "Name")}</label>
            <input
              id={`title-${routine.id}`}
              className="field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
            />
          </div>

          <div>
            <div className="text-caption mb-1" id={`${editorId}-label`}>{t("Repeats", "Wiederkehr")}</div>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${editorId}-label`}>
              {PRESETS.map((p) => (
                <button key={p} type="button" className="chip" data-active={preset === p} aria-pressed={preset === p} onClick={() => choosePreset(p)}>
                  {presetLabels[p]}
                </button>
              ))}
              {preset === null && (
                <button type="button" className="chip" data-active aria-pressed onClick={toggleEditor}>
                  {ownLabel}
                </button>
              )}
              <button type="button" className="chip" data-active={!!editor} aria-expanded={!!editor} aria-controls={`${editorId}-editor`} onClick={toggleEditor}>
                {t("More precisely …", "Genauer …")}
              </button>
            </div>
            {preset !== "once" && <p className="text-caption mt-1.5">{describeRoutine(routine, lang)}</p>}

            {editor && (
              <form id={`${editorId}-editor`} onSubmit={saveRhythm} className="mt-3 space-y-3 rounded-[var(--radius-md)] p-3 border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <ScheduleEditor
                  value={editor.fields}
                  onChange={(fields) => setEditor((prev) => (prev ? { ...prev, fields } : prev))}
                  today={today}
                  startLabel={t("Next time", "Nächstes Mal")}
                />
                {preview.length > 0 && (
                  <p className="text-caption">
                    {t("Next dates: ", "Die nächsten Termine: ")}
                    {preview.map(formatDate).join(" · ")}
                  </p>
                )}
                {built?.ok && built.rhythm.mode === "fixed" && preview.length === 0 && (
                  <p className="text-caption">
                    {t("There is no date for this in the next three years. Want to take another look at the months or dates?", "In den nächsten drei Jahren gibt es dazu keinen Termin. Magst du die Monate oder Daten nochmal anschauen?")}
                  </p>
                )}
                {message && built && !built.ok && <p className="text-sm" style={{ color: "var(--text-secondary)" }} role="alert">{message}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditor(null)}>{t("Cancel", "Abbrechen")}</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{t("Save", "Speichern")}</button>
                </div>
              </form>
            )}
          </div>

          {rooms.length > 0 && (
            <div>
              <label className="text-caption mb-1 block" htmlFor={`room-${routine.id}`}>{t("Room", "Raum")}</label>
              <select
                id={`room-${routine.id}`}
                className="field"
                value={routine.roomId ?? ""}
                onChange={(e) => actions.update(routine.id, { roomId: e.target.value || null })}
              >
                <option value="">{t("No room", "Kein Raum")}</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.icon} {localizeKnown(r.name, ROOM_PRESETS, lang)}</option>
                ))}
              </select>
            </div>
          )}

          {members.length > 1 && (
            <div>
              <div className="text-caption mb-1">{t("Who does it", "Wer macht es")}</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="chip" data-active={who === "open"} onClick={() => chooseWho("open")}>
                  {t("Whoever has time", "Wer Zeit hat")}
                </button>
                {memberIds.map((id) => (
                  <button key={id} type="button" className="chip" data-active={same(who, { member: id })} onClick={() => chooseWho({ member: id })}>
                    {nameOf(id)}
                  </button>
                ))}
                <button type="button" className="chip" data-active={who === "turns"} onClick={() => chooseWho("turns")}>
                  {t("Taking turns", "Abwechselnd")}
                </button>
                {(members.length > 2 || who === "fair") && (
                  <button type="button" className="chip" data-active={who === "fair"} onClick={() => chooseWho("fair")}>
                    {t("Shared fairly", "Fair verteilt")}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {occurrence && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => actions.resolve(occurrence, "skipped")}>
            <SkipForward className="w-4 h-4" /> {t("Skip this time", "Diesmal auslassen")}
          </button>
        )}
        {confirmDelete ? (
          <span className="flex items-center gap-1.5">
            <button type="button" className="btn btn-danger btn-sm" onClick={() => actions.remove(routine.id)}>
              {t("Delete for good", "Endgültig löschen")}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
              {t("Cancel", "Abbrechen")}
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-4 h-4" /> {t("Delete", "Löschen")}
          </button>
        )}
      </div>
    </div>
  );
}
