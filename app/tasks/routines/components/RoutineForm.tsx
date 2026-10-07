"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../../../context/LanguageContext";
import { ROOM_PRESETS, SUPPLY_SUGGESTIONS, localizeKnown } from "../../constants";
import { buildRoutine, emptyForm, formFromTemplate, livingDefaults, previewDates, type BuiltRoutine, type RoutineFormState } from "../formModel";
import { localeOf } from "../i18n";
import { turnOrder } from "../quickAdd";
import { ROUTINE_TEMPLATES } from "../templates";
import type { LivingMode, RoutineKind } from "../types";
import type { Room } from "../../types";
import ScheduleEditor from "./ScheduleEditor";

const ICONS = ["🔁", "🗑️", "♻️", "📦", "🌿", "🛁", "🧹", "🪴", "🧺", "🍳", "🐈", "🚗"];
// Bills are not offered here for now (parked, see docs/tasks-rethink.html).
const KINDS: RoutineKind[] = ["chore", "reminder"];

interface Props {
  today: string;
  members: { id: string; name: string }[];
  userId: string | undefined;
  rooms: Room[];
  calendarEnabled: boolean;
  livingMode: LivingMode;
  // Carried over from the quick-add bar.
  initial?: { title?: string; roomId?: string | null };
  onSubmit: (routine: BuiltRoutine) => Promise<boolean>;
  onCancel: () => void;
}

// The full form, for what the quick-add bar leaves out: Abfuhr dates, certain weekdays, seasons,
// supplies, how far ahead to be told. Everything has a default, so only the name is needed.
export default function RoutineForm({ today, members, userId, rooms, calendarEnabled, livingMode, initial, onSubmit, onCancel }: Props) {
  const { t, lang } = useI18n();
  const memberIds = useMemo(() => turnOrder(members.map((m) => m.id), userId), [members, userId]);
  const [form, setForm] = useState<RoutineFormState>(() => ({
    ...livingDefaults(emptyForm(today), livingMode, memberIds),
    title: initial?.title ?? "",
    roomId: initial?.roomId ?? null,
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customSupply, setCustomSupply] = useState("");

  const set = <K extends keyof RoutineFormState>(key: K, value: RoutineFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSupply = (supply: string) =>
    setForm((prev) => ({
      ...prev,
      supplies: prev.supplies.includes(supply) ? prev.supplies.filter((s) => s !== supply) : [...prev.supplies, supply],
    }));

  const addCustomSupply = () => {
    const value = customSupply.trim();
    if (!value || form.supplies.includes(value)) return;
    set("supplies", [...form.supplies, value]);
    setCustomSupply("");
  };

  const built = useMemo(() => buildRoutine(form, memberIds), [form, memberIds]);
  const preview = built.ok ? previewDates(built.routine, today) : [];
  const withOthers = members.length > 1;

  const formatDate = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(localeOf(lang), { weekday: "short", day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });

  const kindText: Record<"chore" | "reminder", { label: string; hint: string }> = {
    chore: {
      label: t("Task", "Aufgabe"),
      hint: t("Somebody does it, for example cleaning the bathroom.", "Jemand erledigt sie, zum Beispiel Bad putzen."),
    },
    reminder: {
      label: t("Reminder", "Erinnerung"),
      hint: t("Just a heads-up, for example the trash collection.", "Nur ein Hinweis, zum Beispiel die Kehricht-Abfuhr."),
    },
  };
  const kind = form.kind === "reminder" ? "reminder" : "chore";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!built.ok) {
      setMessage(built.message[lang]);
      return;
    }
    setMessage(null);
    setSaving(true);
    const ok = await onSubmit(built.routine);
    setSaving(false);
    if (ok) onCancel();
  };

  return (
    <form onSubmit={submit} className="surface p-5 space-y-5 animate-rise">
      <div>
        <div className="text-caption mb-2">{t("Start from a template", "Mit einer Vorlage starten")}</div>
        <div className="flex flex-wrap gap-2">
          {ROUTINE_TEMPLATES.filter((tpl) => tpl.kind !== "bill").map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              className="chip"
              onClick={() => {
                setForm((prev) => ({
                  ...livingDefaults(formFromTemplate(tpl, today, lang), livingMode, memberIds),
                  roomId: prev.roomId,
                  supplies: prev.supplies,
                }));
                setMessage(null);
              }}
            >
              <span aria-hidden>{tpl.icon}</span> {tpl.title[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {KINDS.map((k) => (
          <button key={k} type="button" className="chip justify-center py-2.5" data-active={kind === k} onClick={() => set("kind", k)}>
            {kindText[k as "chore" | "reminder"].label}
          </button>
        ))}
      </div>
      <p className="text-caption -mt-3">{kindText[kind].hint}</p>

      <div>
        <label className="text-caption mb-1 block" htmlFor="routine-title">{t("What's it called?", "Wie heisst es?")}</label>
        <input
          id="routine-title"
          className="field"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={t("For example: Put out the trash", "Zum Beispiel: Kehricht rausstellen")}
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              aria-label={t(`Icon ${icon}`, `Symbol ${icon}`)}
              onClick={() => set("icon", icon)}
              className="press w-9 h-9 rounded-[var(--radius-sm)] text-lg border"
              style={{
                borderColor: form.icon === icon ? "var(--accent)" : "var(--border)",
                background: form.icon === icon ? "var(--accent-soft)" : "var(--surface-2)",
              }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {rooms.length > 0 && (
        <div>
          <label className="text-caption mb-1 block" htmlFor="routine-room">{t("Room", "Raum")}</label>
          <select id="routine-room" className="field" value={form.roomId ?? ""} onChange={(e) => set("roomId", e.target.value || null)}>
            <option value="">{t("No room", "Kein Raum")}</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.icon} {localizeKnown(r.name, ROOM_PRESETS, lang)}</option>)}
          </select>
        </div>
      )}

      <ScheduleEditor
        value={form}
        onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
        today={today}
        startLabel={t("First time", "Erstes Mal")}
      />

      <div>
        <label className="text-caption mb-1 block" htmlFor="routine-lead">{t("Heads-up beforehand", "Vorher Bescheid sagen")}</label>
        <select id="routine-lead" className="field" value={form.leadDays} onChange={(e) => set("leadDays", Number(e.target.value))}>
          <option value={0}>{t("Only on the day itself", "Erst am Tag selbst")}</option>
          <option value={1}>{t("One day before", "Einen Tag vorher")}</option>
          <option value={2}>{t("Two days before", "Zwei Tage vorher")}</option>
          <option value={3}>{t("Three days before", "Drei Tage vorher")}</option>
          <option value={7}>{t("One week before", "Eine Woche vorher")}</option>
        </select>
      </div>

      {kind === "chore" && withOthers && (
        <div className="space-y-3">
          <div className="text-caption">{t("Who does it?", "Wer macht es?")}</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="chip" data-active={form.assignment === "open"} onClick={() => set("assignment", "open")}>
              {t("Whoever has time", "Wer Zeit hat")}
            </button>
            {memberIds.map((id) => (
              <button
                key={id}
                type="button"
                className="chip"
                data-active={form.assignment === "fixed" && form.assigneeId === id}
                onClick={() => setForm((prev) => ({ ...prev, assignment: "fixed", assigneeId: id }))}
              >
                {id === userId ? t("Me", "Ich") : members.find((m) => m.id === id)?.name}
              </button>
            ))}
            <button
              type="button"
              className="chip"
              data-active={form.assignment === "rotation"}
              onClick={() => setForm((prev) => ({ ...prev, assignment: "rotation", rotation: prev.rotation.length >= 2 ? prev.rotation : memberIds }))}
            >
              {t("Taking turns", "Abwechselnd")}
            </button>
            {members.length > 2 && (
              <button type="button" className="chip" data-active={form.assignment === "fair_share"} onClick={() => set("assignment", "fair_share")}>
                {t("Shared fairly", "Fair verteilt")}
              </button>
            )}
          </div>
          <p className="text-caption -mt-1">
            {form.assignment === "open" && t("Nobody is in charge. Whoever does it ticks it off.", "Niemand ist fest zuständig. Wer es macht, hakt es ab.")}
            {form.assignment === "fixed" && t("One person takes care of it.", "Eine Person kümmert sich darum.")}
            {form.assignment === "rotation" && t("You take turns. Whoever is away is skipped.", "Ihr wechselt euch ab. Wer weg ist, wird übersprungen.")}
            {form.assignment === "fair_share" && t("It goes to whoever has done the least lately.", "Es trifft, wer zuletzt am wenigsten gemacht hat.")}
          </p>
          {form.assignment === "rotation" && members.length > 2 && (
            <div className="flex flex-wrap gap-2">
              {memberIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="chip"
                  data-active={form.rotation.includes(id)}
                  onClick={() => set("rotation", form.rotation.includes(id) ? form.rotation.filter((x) => x !== id) : [...form.rotation, id])}
                >
                  {id === userId ? t("Me", "Ich") : members.find((m) => m.id === id)?.name}
                </button>
              ))}
            </div>
          )}
          {form.assignment === "fair_share" && (
            <div>
              <label className="text-caption mb-1 block" htmlFor="routine-effort">{t("How much work is it?", "Wie aufwendig ist es?")}</label>
              <select id="routine-effort" className="field" value={form.effort} onChange={(e) => set("effort", Number(e.target.value) as RoutineFormState["effort"])}>
                <option value={1}>{t("Quick", "Schnell erledigt")}</option>
                <option value={2}>{t("Normal", "Normal")}</option>
                <option value={3}>{t("Takes a while", "Aufwendig")}</option>
                <option value={5}>{t("A lot of work", "Richtig viel Arbeit")}</option>
              </select>
            </div>
          )}
        </div>
      )}

      {kind === "chore" && (
        <div>
          <div className="text-caption mb-1">{t("What does it need?", "Was braucht es dafür?")}</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SUPPLY_SUGGESTIONS.map((supply) => (
              <button key={supply.en} type="button" className="chip" data-active={form.supplies.includes(supply.en)} onClick={() => toggleSupply(supply.en)}>
                {supply[lang]}
              </button>
            ))}
            {form.supplies
              .filter((s) => !SUPPLY_SUGGESTIONS.some((x) => x.en === s))
              .map((s) => (
                <button key={s} type="button" className="chip" data-active onClick={() => toggleSupply(s)}>{s}</button>
              ))}
          </div>
          <div className="flex gap-2">
            <input
              className="field flex-1 text-sm"
              value={customSupply}
              onChange={(e) => setCustomSupply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSupply();
                }
              }}
              placeholder={t("Add your own …", "Eigenes ergänzen …")}
              aria-label={t("Add your own supply", "Eigenes Material ergänzen")}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={addCustomSupply}>{t("Add", "Hinzufügen")}</button>
          </div>
        </div>
      )}

      {calendarEnabled && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.showInCalendar} onChange={(e) => set("showInCalendar", e.target.checked)} />
          {t("Show on the calendar", "Im Kalender anzeigen")}
        </label>
      )}

      {preview.length > 0 && built.ok && (
        <p className="text-caption">
          {built.routine.mode === "after_done" ? t("Starts on ", "Los geht es am ") : t("Next dates: ", "Die nächsten Termine: ")}
          {preview.map(formatDate).join(" · ")}
        </p>
      )}
      {built.ok && built.routine.mode === "fixed" && preview.length === 0 && (
        <p className="text-caption">
          {t("There is no date for this in the next three years. Want to take another look at the months or dates?", "In den nächsten drei Jahren gibt es dazu keinen Termin. Magst du die Monate oder Daten nochmal anschauen?")}
        </p>
      )}

      {message && !built.ok && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{message}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{t("Cancel", "Abbrechen")}</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{t("Save", "Speichern")}</button>
      </div>
    </form>
  );
}
