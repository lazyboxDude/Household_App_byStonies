"use client";

import { useMemo, useState } from "react";
import { parseDateList } from "../schedule";
import { buildRoutine, emptyForm, formFromTemplate, livingDefaults, nextWeekdayDate, previewDates, withKind, type BuiltRoutine, type RoutineFormState } from "../formModel";
import { ROUTINE_TEMPLATES } from "../templates";
import type { AmountKind, Assignment, IntervalUnit, LivingMode, RoutineKind } from "../types";

const WEEKDAYS = [
  { n: 1, label: "Mo" }, { n: 2, label: "Di" }, { n: 3, label: "Mi" }, { n: 4, label: "Do" },
  { n: 5, label: "Fr" }, { n: 6, label: "Sa" }, { n: 0, label: "So" },
];
const WEEKDAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const ICONS = ["🔁", "🗑️", "♻️", "📦", "🌿", "🛁", "🧹", "🪴", "🧺", "🍳", "🐈", "🚗"];
const UNIT_LABELS: Record<IntervalUnit, string> = { day: "Tage", week: "Wochen", month: "Monate", year: "Jahre" };
const KIND_LABELS: Record<RoutineKind, string> = { chore: "Aufgabe", reminder: "Erinnerung", bill: "Rechnung" };
const KIND_HINTS: Record<RoutineKind, string> = {
  chore: "Jemand erledigt sie, zum Beispiel Bad putzen.",
  reminder: "Nur ein Hinweis, zum Beispiel die Kehricht-Abfuhr.",
  bill: "Du siehst, was wann fällig ist, und hakst sie als bezahlt ab.",
};
const ASSIGNMENTS: { value: Assignment; label: string; hint: string }[] = [
  { value: "open", label: "Wer Zeit hat", hint: "Niemand ist fest zuständig. Wer es macht, hakt es ab." },
  { value: "fixed", label: "Immer dieselbe Person", hint: "Eine Person kümmert sich darum." },
  { value: "rotation", label: "Reihum", hint: "Ihr wechselt euch ab. Wer weg ist, wird übersprungen." },
  { value: "fair_share", label: "Fair verteilt", hint: "Es trifft, wer zuletzt am wenigsten gemacht hat." },
];
const EFFORTS: { value: 1 | 2 | 3 | 5; label: string }[] = [
  { value: 1, label: "Schnell erledigt" },
  { value: 2, label: "Normal" },
  { value: 3, label: "Aufwendig" },
  { value: 5, label: "Richtig viel Arbeit" },
];
const SPLIT_MODES = [
  { value: "none", label: "Nicht aufteilen", hint: "Zum Beispiel, wenn es vom gemeinsamen Konto geht." },
  { value: "equal", label: "Gleichmässig", hint: "Alle zahlen gleich viel." },
  { value: "custom", label: "Eigene Prozente", hint: "Zum Beispiel 60 und 40." },
] as const;
const AMOUNT_KINDS: { value: AmountKind; label: string; hint: string }[] = [
  { value: "fixed", label: "Immer gleich", hint: "Zum Beispiel die Miete." },
  { value: "estimate", label: "Ungefähr", hint: "Zum Beispiel der Strom-Abschlag. Du korrigierst den Betrag, wenn du bezahlst." },
  { value: "variable", label: "Schwankt", hint: "Den Betrag trägst du ein, wenn du bezahlst." },
];
const REPEAT_LABELS = {
  interval: "In einem festen Abstand",
  weekday: "An bestimmten Wochentagen",
  monthday: "An einem Tag im Monat",
  nth_weekday: "An einem Wochentag im Monat",
  dates: "An festen Daten",
} as const;

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-CH", { weekday: "short", day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });
}

interface Props {
  today: string;
  members: { id: string; name: string }[];
  calendarEnabled: boolean;
  expensesEnabled: boolean;
  livingMode: LivingMode;
  onSubmit: (routine: BuiltRoutine) => Promise<boolean>;
  onCancel: () => void;
}

export default function RoutineForm({ today, members, calendarEnabled, expensesEnabled, livingMode, onSubmit, onCancel }: Props) {
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const [form, setForm] = useState<RoutineFormState>(() => livingDefaults(emptyForm(today), livingMode, memberIds));
  const [anchorTouched, setAnchorTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof RoutineFormState>(key: K, value: RoutineFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleIn = (key: "weekdays" | "months", n: number) =>
    setForm((prev) => {
      const list = prev[key].includes(n) ? prev[key].filter((x) => x !== n) : [...prev[key], n];
      const next = { ...prev, [key]: list };
      if (key === "weekdays" && !anchorTouched) next.anchorDate = nextWeekdayDate(list, today);
      return next;
    });

  const built = useMemo(() => buildRoutine(form, memberIds), [form, memberIds]);
  const preview = built.ok ? previewDates(built.routine, today) : [];
  const datesInfo = form.repeat === "dates" ? parseDateList(form.datesText) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!built.ok) {
      setMessage(built.message);
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
        <div className="text-caption mb-2">Mit einer Vorlage starten</div>
        <div className="flex flex-wrap gap-2">
          {ROUTINE_TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              className="chip"
              onClick={() => {
                setForm(livingDefaults(formFromTemplate(t, today), livingMode, memberIds));
                setAnchorTouched(false);
                setMessage(null);
              }}
            >
              <span aria-hidden>{t.icon}</span> {t.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["chore", "reminder", "bill"] as const).map((k) => (
          <button
            key={k}
            type="button"
            className="chip justify-center py-2.5"
            data-active={form.kind === k}
            onClick={() => setForm((prev) => livingDefaults(withKind(prev, k), livingMode, memberIds))}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>
      <p className="text-caption -mt-3">{KIND_HINTS[form.kind]}</p>

      <div>
        <label className="text-caption mb-1 block" htmlFor="routine-title">Wie heisst es?</label>
        <input
          id="routine-title"
          className="field"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Zum Beispiel: Kehricht rausstellen"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              aria-label={`Symbol ${icon}`}
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

      <div className="space-y-3">
        <div>
          <label className="text-caption mb-1 block" htmlFor="routine-repeat">Wann kommt es wieder?</label>
          <select
            id="routine-repeat"
            className="field"
            value={form.repeat}
            onChange={(e) => set("repeat", e.target.value as RoutineFormState["repeat"])}
          >
            {Object.entries(REPEAT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {form.repeat === "interval" && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm">Alle</span>
              <input
                type="number"
                min={1}
                className="field w-20"
                aria-label="Anzahl"
                value={form.every}
                onChange={(e) => set("every", Number(e.target.value))}
              />
              <select className="field w-32" aria-label="Einheit" value={form.unit} onChange={(e) => set("unit", e.target.value as IntervalUnit)}>
                {Object.entries(UNIT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {form.kind !== "bill" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="chip justify-center py-2.5 whitespace-normal text-center" data-active={form.mode === "after_done"} onClick={() => set("mode", "after_done")}>
                    Ab dem Erledigen zählen
                  </button>
                  <button type="button" className="chip justify-center py-2.5 whitespace-normal text-center" data-active={form.mode === "fixed"} onClick={() => set("mode", "fixed")}>
                    Fester Rhythmus
                  </button>
                </div>
                <p className="text-caption">
                  {form.mode === "after_done"
                    ? "Putzt du später, startet die nächste Runde erst dann."
                    : "Der Termin bleibt im Kalender, auch wenn du mal später dran bist."}
                </p>
              </>
            )}
            <div>
              <label className="text-caption mb-1 block" htmlFor="routine-start">Erstes Mal</label>
              <input id="routine-start" type="date" className="field" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
          </>
        )}

        {form.repeat === "weekday" && (
          <>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <button key={d.n} type="button" className="chip" data-active={form.weekdays.includes(d.n)} onClick={() => toggleIn("weekdays", d.n)}>
                  {d.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Jede</span>
              <select className="field w-40" aria-label="Wochenrhythmus" value={form.everyNWeeks} onChange={(e) => set("everyNWeeks", Number(e.target.value))}>
                <option value={1}>Woche</option>
                <option value={2}>2. Woche</option>
                <option value={3}>3. Woche</option>
                <option value={4}>4. Woche</option>
              </select>
            </div>
            {form.everyNWeeks > 1 && (
              <div>
                <label className="text-caption mb-1 block" htmlFor="routine-anchor">Wann ist das nächste Mal?</label>
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
            <span className="text-sm">Am</span>
            <select
              className="field w-40"
              aria-label="Tag im Monat"
              value={String(form.monthDay)}
              onChange={(e) => set("monthDay", e.target.value === "last" ? "last" : Number(e.target.value))}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}.</option>
              ))}
              <option value="last">letzten Tag</option>
            </select>
            <span className="text-sm">des Monats</span>
          </div>
        )}

        {form.repeat === "nth_weekday" && (
          <div className="flex items-center gap-2 flex-wrap">
            <select className="field w-32" aria-label="Welcher" value={form.nth} onChange={(e) => set("nth", Number(e.target.value) as RoutineFormState["nth"])}>
              <option value={1}>Erster</option>
              <option value={2}>Zweiter</option>
              <option value={3}>Dritter</option>
              <option value={4}>Vierter</option>
              <option value={-1}>Letzter</option>
            </select>
            <select className="field w-40" aria-label="Wochentag" value={form.nthWeekday} onChange={(e) => set("nthWeekday", Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 0].map((n) => <option key={n} value={n}>{WEEKDAY_NAMES[n]}</option>)}
            </select>
            <span className="text-sm">im Monat</span>
          </div>
        )}

        {form.repeat === "dates" && (
          <div>
            <label className="text-caption mb-1 block" htmlFor="routine-dates">
              Ein Datum pro Zeile. Du findest sie im Entsorgungskalender deiner Gemeinde.
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
                {datesInfo.dates.length} Datum{datesInfo.dates.length === 1 ? "" : "en"} erkannt
                {datesInfo.invalid.length > 0 ? `. „${datesInfo.invalid[0]}“ kann ich nicht lesen.` : "."}
              </p>
            )}
          </div>
        )}

        {(form.repeat === "monthday" || form.repeat === "nth_weekday" || (form.repeat === "weekday") || (form.repeat === "interval" && (form.mode === "fixed" || form.kind === "bill"))) && (
          <div>
            <div className="text-caption mb-1">Nur in diesen Monaten (sonst das ganze Jahr)</div>
            <div className="flex flex-wrap gap-1.5">
              {MONTH_LABELS.map((label, i) => (
                <button key={label} type="button" className="chip" data-active={form.months.includes(i + 1)} onClick={() => toggleIn("months", i + 1)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {form.kind === "bill" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {AMOUNT_KINDS.map((a) => (
              <button key={a.value} type="button" className="chip justify-center py-2.5 whitespace-normal text-center" data-active={form.amountKind === a.value} onClick={() => set("amountKind", a.value)}>
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-caption -mt-1">{AMOUNT_KINDS.find((a) => a.value === form.amountKind)?.hint}</p>
          <div>
            <label className="text-caption mb-1 block" htmlFor="routine-amount">
              {form.amountKind === "variable" ? "Ungefähr wie viel? (kannst du leer lassen)" : "Wie viel pro Mal?"}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="routine-amount"
                className="field font-mono"
                inputMode="decimal"
                value={form.amountText}
                onChange={(e) => set("amountText", e.target.value)}
                placeholder="95.00"
              />
              <span className="text-sm text-[var(--text-secondary)]">CHF</span>
            </div>
          </div>
          {expensesEnabled && (
            <div>
              <label className="text-caption mb-1 block" htmlFor="routine-category">Kategorie in Finanzen (sonst „Rechnungen“)</label>
              <input id="routine-category" className="field" value={form.expenseCategory} onChange={(e) => set("expenseCategory", e.target.value)} placeholder="Zum Beispiel Wohnen" />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-caption mb-1 block" htmlFor="routine-lead">Vorher Bescheid sagen</label>
          <select id="routine-lead" className="field" value={form.leadDays} onChange={(e) => set("leadDays", Number(e.target.value))}>
            <option value={0}>Erst am Tag selbst</option>
            <option value={1}>Einen Tag vorher</option>
            <option value={2}>Zwei Tage vorher</option>
            <option value={3}>Drei Tage vorher</option>
            <option value={7}>Eine Woche vorher</option>
          </select>
        </div>
        {form.kind === "bill" ? (
          <div>
            <label className="text-caption mb-1 block" htmlFor="routine-assignee">Wer zahlt?</label>
            <select id="routine-assignee" className="field" value={form.payerId ?? ""} onChange={(e) => set("payerId", e.target.value || null)}>
              <option value="">Mal der, mal die</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="text-caption mb-1 block" htmlFor="routine-effort">Wie aufwendig ist es?</label>
            <select id="routine-effort" className="field" value={form.effort} onChange={(e) => set("effort", Number(e.target.value) as RoutineFormState["effort"])}>
              {EFFORTS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {form.kind !== "bill" && members.length > 1 && (
        <div className="space-y-3">
          <div className="text-caption">Wer macht es?</div>
          <div className="grid grid-cols-2 gap-2">
            {ASSIGNMENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                className="chip justify-center py-2.5 whitespace-normal text-center"
                data-active={form.assignment === a.value}
                onClick={() => set("assignment", a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-caption -mt-1">{ASSIGNMENTS.find((a) => a.value === form.assignment)?.hint}</p>
          {form.assignment === "fixed" && (
            <select aria-label="Wer" className="field" value={form.assigneeId ?? ""} onChange={(e) => set("assigneeId", e.target.value || null)}>
              <option value="">Bitte auswählen</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          {form.assignment === "rotation" && (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="chip"
                  data-active={form.rotation.includes(m.id)}
                  onClick={() => set("rotation", form.rotation.includes(m.id) ? form.rotation.filter((x) => x !== m.id) : [...form.rotation, m.id])}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {form.kind === "bill" && members.length > 1 && (
        <div className="space-y-3">
          <div className="text-caption">Aufteilen</div>
          <div className="grid grid-cols-3 gap-2">
            {SPLIT_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                className="chip justify-center py-2.5 whitespace-normal text-center"
                data-active={form.splitMode === m.value}
                onClick={() => set("splitMode", m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-caption -mt-1">{SPLIT_MODES.find((m) => m.value === form.splitMode)?.hint}</p>
          {form.splitMode === "custom" && (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="text-sm w-28 truncate">{m.name}</span>
                  <input
                    className="field w-24 font-mono"
                    inputMode="decimal"
                    aria-label={`Prozent ${m.name}`}
                    value={form.splitCustom[m.id] ?? ""}
                    onChange={(e) => set("splitCustom", { ...form.splitCustom, [m.id]: e.target.value })}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {calendarEnabled && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={form.showInCalendar} onChange={(e) => set("showInCalendar", e.target.checked)} />
          Im Kalender anzeigen
        </label>
      )}

      {preview.length > 0 && built.ok && (
        <p className="text-caption">
          {built.routine.mode === "after_done" ? "Los geht es am " : "Die nächsten Termine: "}
          {preview.map(formatDate).join(" · ")}
        </p>
      )}
      {built.ok && built.routine.mode === "fixed" && preview.length === 0 && (
        <p className="text-caption">In den nächsten drei Jahren gibt es dazu keinen Termin. Magst du die Monate oder Daten nochmal anschauen?</p>
      )}

      {message && !built.ok && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{message}</p>}

      <div className="flex gap-2 justify-end">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Abbrechen</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>Speichern</button>
      </div>
    </form>
  );
}
