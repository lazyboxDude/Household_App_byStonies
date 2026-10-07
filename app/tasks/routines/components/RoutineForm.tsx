"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../../../context/LanguageContext";
import { ROOM_PRESETS, SUPPLY_SUGGESTIONS, localizeKnown } from "../../constants";
import { buildRoutine, emptyForm, formFromTemplate, livingDefaults, nextWeekdayDate, previewDates, type BuiltRoutine, type RoutineFormState } from "../formModel";
import { MONTHS_SHORT, WEEKDAYS_LONG, WEEKDAYS_SHORT, localeOf, ordinalEn } from "../i18n";
import { turnOrder } from "../quickAdd";
import { parseDateList } from "../schedule";
import { ROUTINE_TEMPLATES } from "../templates";
import type { IntervalUnit, LivingMode, RoutineKind } from "../types";
import type { Room } from "../../types";

const ICONS = ["🔁", "🗑️", "♻️", "📦", "🌿", "🛁", "🧹", "🪴", "🧺", "🍳", "🐈", "🚗"];
// Mon first, like a calendar week.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
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
  const [anchorTouched, setAnchorTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customSupply, setCustomSupply] = useState("");

  const set = <K extends keyof RoutineFormState>(key: K, value: RoutineFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleIn = (key: "weekdays" | "months", n: number) =>
    setForm((prev) => {
      const list = prev[key].includes(n) ? prev[key].filter((x) => x !== n) : [...prev[key], n];
      const next = { ...prev, [key]: list };
      if (key === "weekdays" && !anchorTouched) next.anchorDate = nextWeekdayDate(list, today);
      return next;
    });

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
  const datesInfo = form.repeat === "dates" ? parseDateList(form.datesText) : null;
  const withOthers = members.length > 1;

  const unitLabels: Record<IntervalUnit, string> = {
    day: t("days", "Tage"), week: t("weeks", "Wochen"), month: t("months", "Monate"), year: t("years", "Jahre"),
  };
  const repeatLabels: Record<RoutineFormState["repeat"], string> = {
    interval: t("Every few days, weeks or months", "In einem festen Abstand"),
    weekday: t("On certain weekdays", "An bestimmten Wochentagen"),
    monthday: t("On a day of the month", "An einem Tag im Monat"),
    nth_weekday: t("On a weekday of the month", "An einem Wochentag im Monat"),
    dates: t("On fixed dates", "An festen Daten"),
  };
  const nthLabels: [RoutineFormState["nth"], string][] = [
    [1, t("First", "Erster")], [2, t("Second", "Zweiter")], [3, t("Third", "Dritter")], [4, t("Fourth", "Vierter")], [-1, t("Last", "Letzter")],
  ];
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
                setAnchorTouched(false);
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

      <div className="space-y-3">
        <div>
          <label className="text-caption mb-1 block" htmlFor="routine-repeat">{t("When does it come back?", "Wann kommt es wieder?")}</label>
          <select
            id="routine-repeat"
            className="field"
            value={form.repeat}
            onChange={(e) => set("repeat", e.target.value as RoutineFormState["repeat"])}
          >
            {Object.entries(repeatLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {form.repeat === "interval" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm">{t("Every", "Alle")}</span>
              <input
                type="number"
                min={1}
                className="field w-20"
                aria-label={t("Number", "Anzahl")}
                value={form.every}
                onChange={(e) => set("every", Number(e.target.value))}
              />
              <select className="field w-32" aria-label={t("Unit", "Einheit")} value={form.unit} onChange={(e) => set("unit", e.target.value as IntervalUnit)}>
                {Object.entries(unitLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="chip justify-center py-2.5 whitespace-normal text-center" data-active={form.mode === "after_done"} onClick={() => set("mode", "after_done")}>
                {t("Count from when it's done", "Ab dem Erledigen zählen")}
              </button>
              <button type="button" className="chip justify-center py-2.5 whitespace-normal text-center" data-active={form.mode === "fixed"} onClick={() => set("mode", "fixed")}>
                {t("Fixed rhythm", "Fester Rhythmus")}
              </button>
            </div>
            <p className="text-caption">
              {form.mode === "after_done"
                ? t("If you do it later, the next round only starts then.", "Machst du es später, startet die nächste Runde erst dann.")
                : t("The date stays where it is, even if you're a bit late.", "Der Termin bleibt, wo er ist, auch wenn du mal später dran bist.")}
            </p>
            <div>
              <label className="text-caption mb-1 block" htmlFor="routine-start">{t("First time", "Erstes Mal")}</label>
              <input id="routine-start" type="date" className="field" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
          </>
        )}

        {form.repeat === "weekday" && (
          <>
            <div className="flex flex-wrap gap-2">
              {WEEK_ORDER.map((n) => (
                <button key={n} type="button" className="chip" data-active={form.weekdays.includes(n)} onClick={() => toggleIn("weekdays", n)}>
                  {WEEKDAYS_SHORT[lang][n]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">{t("Every", "Jede")}</span>
              <select className="field w-40" aria-label={t("Weekly rhythm", "Wochenrhythmus")} value={form.everyNWeeks} onChange={(e) => set("everyNWeeks", Number(e.target.value))}>
                <option value={1}>{t("week", "Woche")}</option>
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>{t(`${ordinalEn(n)} week`, `${n}. Woche`)}</option>
                ))}
              </select>
            </div>
            {form.everyNWeeks > 1 && (
              <div>
                <label className="text-caption mb-1 block" htmlFor="routine-anchor">{t("When is the next one?", "Wann ist das nächste Mal?")}</label>
                <input
                  id="routine-anchor"
                  type="date"
                  className="field"
                  value={form.anchorDate}
                  onChange={(e) => { setAnchorTouched(true); set("anchorDate", e.target.value); }}
                />
              </div>
            )}
          </>
        )}

        {form.repeat === "monthday" && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">{t("On the", "Am")}</span>
            <select
              className="field w-40"
              aria-label={t("Day of the month", "Tag im Monat")}
              value={String(form.monthDay)}
              onChange={(e) => set("monthDay", e.target.value === "last" ? "last" : Number(e.target.value))}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{lang === "de" ? `${d}.` : ordinalEn(d)}</option>
              ))}
              <option value="last">{t("last day", "letzten Tag")}</option>
            </select>
            <span className="text-sm">{t("of the month", "des Monats")}</span>
          </div>
        )}

        {form.repeat === "nth_weekday" && (
          <div className="flex items-center gap-2 flex-wrap">
            <select className="field w-32" aria-label={t("Which one", "Welcher")} value={form.nth} onChange={(e) => set("nth", Number(e.target.value) as RoutineFormState["nth"])}>
              {nthLabels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className="field w-40" aria-label={t("Weekday", "Wochentag")} value={form.nthWeekday} onChange={(e) => set("nthWeekday", Number(e.target.value))}>
              {WEEK_ORDER.map((n) => <option key={n} value={n}>{WEEKDAYS_LONG[lang][n]}</option>)}
            </select>
            <span className="text-sm">{t("of the month", "im Monat")}</span>
          </div>
        )}

        {form.repeat === "dates" && (
          <div>
            <label className="text-caption mb-1 block" htmlFor="routine-dates">
              {t("One date per line. You'll find them in your municipality's waste calendar.", "Ein Datum pro Zeile. Du findest sie im Entsorgungskalender deiner Gemeinde.")}
            </label>
            <textarea
              id="routine-dates"
              className="field min-h-28"
              value={form.datesText}
              onChange={(e) => set("datesText", e.target.value)}
              placeholder={"12.11.2026\n10.12.2026"}
            />
            {datesInfo && (datesInfo.dates.length > 0 || datesInfo.invalid.length > 0) && (
              <p className="text-caption mt-1">
                {lang === "de"
                  ? `${datesInfo.dates.length} Datum${datesInfo.dates.length === 1 ? "" : "en"} erkannt`
                  : `${datesInfo.dates.length} date${datesInfo.dates.length === 1 ? "" : "s"} recognised`}
                {datesInfo.invalid.length > 0
                  ? lang === "de" ? `. „${datesInfo.invalid[0]}“ kann ich nicht lesen.` : `. I can't read “${datesInfo.invalid[0]}”.`
                  : "."}
              </p>
            )}
          </div>
        )}

        {(form.repeat === "monthday" || form.repeat === "nth_weekday" || form.repeat === "weekday" || (form.repeat === "interval" && form.mode === "fixed")) && (
          <div>
            <div className="text-caption mb-1">{t("Only in these months (otherwise all year)", "Nur in diesen Monaten (sonst das ganze Jahr)")}</div>
            <div className="flex flex-wrap gap-1.5">
              {MONTHS_SHORT[lang].map((label, i) => (
                <button key={label} type="button" className="chip" data-active={form.months.includes(i + 1)} onClick={() => toggleIn("months", i + 1)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
