"use client";

import { useId } from "react";
import { useI18n } from "../../../context/LanguageContext";
import { nextWeekdayDate, type ScheduleFields } from "../formModel";
import { MONTHS_SHORT, WEEKDAYS_LONG, WEEKDAYS_SHORT, ordinalEn } from "../i18n";
import { parseDateList } from "../schedule";
import type { IntervalUnit } from "../types";

// Mon first, like a calendar week.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  value: ScheduleFields;
  onChange: (next: ScheduleFields) => void;
  today: string;
  // "First time" for something new, "Next time" for something that already exists.
  startLabel: string;
}

// "When does it come back?" with everything behind it: a few days apart, certain weekdays, a day
// of the month, fixed dates, and the months it applies to. Used by the full form for a new task
// and by the details of a task that exists.
export default function ScheduleEditor({ value: form, onChange, today, startLabel }: Props) {
  const { t, lang } = useI18n();
  const id = useId();

  const set = <K extends keyof ScheduleFields>(key: K, next: ScheduleFields[K]) => onChange({ ...form, [key]: next });

  const toggleWeekday = (n: number) => {
    const list = form.weekdays.includes(n) ? form.weekdays.filter((x) => x !== n) : [...form.weekdays, n];
    // The date of the next time follows the weekdays, until the person has picked one themselves.
    const follows = form.anchorDate === nextWeekdayDate(form.weekdays, today);
    onChange({ ...form, weekdays: list, ...(follows ? { anchorDate: nextWeekdayDate(list, today) } : {}) });
  };
  const toggleMonth = (n: number) => set("months", form.months.includes(n) ? form.months.filter((x) => x !== n) : [...form.months, n]);

  const datesInfo = form.repeat === "dates" ? parseDateList(form.datesText) : null;

  const unitLabels: Record<IntervalUnit, string> = {
    day: t("days", "Tage"), week: t("weeks", "Wochen"), month: t("months", "Monate"), year: t("years", "Jahre"),
  };
  const repeatLabels: Record<ScheduleFields["repeat"], string> = {
    interval: t("Every few days, weeks or months", "In einem festen Abstand"),
    weekday: t("On certain weekdays", "An bestimmten Wochentagen"),
    monthday: t("On a day of the month", "An einem Tag im Monat"),
    nth_weekday: t("On a weekday of the month", "An einem Wochentag im Monat"),
    dates: t("On fixed dates", "An festen Daten"),
  };
  const nthLabels: [ScheduleFields["nth"], string][] = [
    [1, t("First", "Erster")], [2, t("Second", "Zweiter")], [3, t("Third", "Dritter")], [4, t("Fourth", "Vierter")], [-1, t("Last", "Letzter")],
  ];

  return (
    <div className="space-y-3">
      <div>
        <label className="text-caption mb-1 block" htmlFor={`${id}-repeat`}>{t("When does it come back?", "Wann kommt es wieder?")}</label>
        <select
          id={`${id}-repeat`}
          className="field"
          value={form.repeat}
          onChange={(e) => set("repeat", e.target.value as ScheduleFields["repeat"])}
        >
          {Object.entries(repeatLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {form.repeat === "interval" && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">{t("Every", "Alle")}</span>
            <input
              type="number"
              min={1}
              className="field" style={{ width: "5rem" }}
              aria-label={t("Number", "Anzahl")}
              value={form.every}
              onChange={(e) => set("every", Number(e.target.value))}
            />
            <select className="field" style={{ width: "auto", maxWidth: "100%" }} aria-label={t("Unit", "Einheit")} value={form.unit} onChange={(e) => set("unit", e.target.value as IntervalUnit)}>
              {Object.entries(unitLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="chip justify-center py-2.5 text-center" style={{ whiteSpace: "normal" }} data-active={form.mode === "after_done"} onClick={() => set("mode", "after_done")}>
              {t("Count from when it's done", "Ab dem Erledigen zählen")}
            </button>
            <button type="button" className="chip justify-center py-2.5 text-center" style={{ whiteSpace: "normal" }} data-active={form.mode === "fixed"} onClick={() => set("mode", "fixed")}>
              {t("Fixed rhythm", "Fester Rhythmus")}
            </button>
          </div>
          <p className="text-caption">
            {form.mode === "after_done"
              ? t("If you do it later, the next round only starts then.", "Machst du es später, startet die nächste Runde erst dann.")
              : t("The date stays where it is, even if you're a bit late.", "Der Termin bleibt, wo er ist, auch wenn du mal später dran bist.")}
          </p>
          <div>
            <label className="text-caption mb-1 block" htmlFor={`${id}-start`}>{startLabel}</label>
            <input id={`${id}-start`} type="date" className="field" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </div>
        </>
      )}

      {form.repeat === "weekday" && (
        <>
          <div className="flex flex-wrap gap-2">
            {WEEK_ORDER.map((n) => (
              <button key={n} type="button" className="chip" data-active={form.weekdays.includes(n)} onClick={() => toggleWeekday(n)}>
                {WEEKDAYS_SHORT[lang][n]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">{t("Every", "Jede")}</span>
            <select className="field" style={{ width: "auto", maxWidth: "100%" }} aria-label={t("Weekly rhythm", "Wochenrhythmus")} value={form.everyNWeeks} onChange={(e) => set("everyNWeeks", Number(e.target.value))}>
              <option value={1}>{t("week", "Woche")}</option>
              {[2, 3, 4].map((n) => (
                <option key={n} value={n}>{t(`${ordinalEn(n)} week`, `${n}. Woche`)}</option>
              ))}
            </select>
          </div>
          {form.everyNWeeks > 1 && (
            <div>
              <label className="text-caption mb-1 block" htmlFor={`${id}-anchor`}>{t("When is the next one?", "Wann ist das nächste Mal?")}</label>
              <input
                id={`${id}-anchor`}
                type="date"
                className="field"
                value={form.anchorDate}
                onChange={(e) => set("anchorDate", e.target.value)}
              />
            </div>
          )}
        </>
      )}

      {form.repeat === "monthday" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm">{t("On the", "Am")}</span>
          <select
            className="field" style={{ width: "auto", maxWidth: "100%" }}
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
          <select className="field" style={{ width: "auto", maxWidth: "100%" }} aria-label={t("Which one", "Welcher")} value={form.nth} onChange={(e) => set("nth", Number(e.target.value) as ScheduleFields["nth"])}>
            {nthLabels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select className="field" style={{ width: "auto", maxWidth: "100%" }} aria-label={t("Weekday", "Wochentag")} value={form.nthWeekday} onChange={(e) => set("nthWeekday", Number(e.target.value))}>
            {WEEK_ORDER.map((n) => <option key={n} value={n}>{WEEKDAYS_LONG[lang][n]}</option>)}
          </select>
          <span className="text-sm">{t("of the month", "im Monat")}</span>
        </div>
      )}

      {form.repeat === "dates" && (
        <div>
          <label className="text-caption mb-1 block" htmlFor={`${id}-dates`}>
            {t("One date per line. You'll find them in your municipality's waste calendar.", "Ein Datum pro Zeile. Du findest sie im Entsorgungskalender deiner Gemeinde.")}
          </label>
          <textarea
            id={`${id}-dates`}
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
              <button key={label} type="button" className="chip" data-active={form.months.includes(i + 1)} onClick={() => toggleMonth(i + 1)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
