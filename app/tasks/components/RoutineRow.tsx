"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, ChevronDown, User } from "lucide-react";
import { useI18n } from "../../context/LanguageContext";
import { chf } from "../../expenses/format";
import { ROOM_PRESETS, localizeKnown } from "../constants";
import { dueLabel, waitingLabel } from "../routines/agenda";
import { describeRoutine } from "../routines/describe";
import { handOffFor } from "../routines/handOff";
import { localeOf } from "../routines/i18n";
import { KNOWN_TITLES } from "../routines/knownTitles";
import { daysBetween } from "../routines/schedule";
import type { Occurrence, Routine } from "../routines/types";
import PayPanel from "../routines/components/PayPanel";
import RoutineEditPanel from "./RoutineEditPanel";
import type { RowContext } from "./rowContext";

interface Props {
  routine: Routine;
  // The date to act on, or null when nothing is open (a one-off that is over, a bill that is paid).
  occurrence: Occurrence | null;
  today: string;
  // "agenda": a list of what is due, the date is what matters. "manage": a list of everything,
  // so the rhythm is named as well.
  variant: "agenda" | "manage";
  // Name the room? Not needed when the list is already inside one.
  showRoom?: boolean;
  ctx: RowContext;
}

function shortDate(iso: string, locale: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "numeric", timeZone: "UTC" });
}

// One task in a list: tick it off, hand it over, open the details. The same row everywhere, so a
// task behaves the same on the Heute list, in a room and on the dashboard.
export default function RoutineRow({ routine, occurrence, today, variant, showRoom = true, ctx }: Props) {
  const { t, lang } = useI18n();
  const { members, userId, rooms, finance, actions } = ctx;
  const [expanded, setExpanded] = useState(false);
  const [paying, setPaying] = useState(false);
  const [choosing, setChoosing] = useState(false);

  const isBill = routine.kind === "bill";
  const title = localizeKnown(routine.title, KNOWN_TITLES, lang);
  const room = routine.roomId ? rooms.find((r) => r.id === routine.roomId) ?? null : null;
  const nameOf = (id: string | null) => (id ? (id === userId ? t("You", "Du") : members.find((m) => m.id === id)?.name ?? null) : null);

  const daysUntil = occurrence ? daysBetween(today, occurrence.dueDate) : null;
  const waiting = daysUntil !== null && daysUntil < 0;
  const headsUp = daysUntil !== null && daysUntil > 0 && daysUntil <= routine.leadDays;
  let when: string | null = null;
  if (occurrence && daysUntil !== null) {
    if (waiting && isBill) when = t(`Open since ${shortDate(occurrence.dueDate, localeOf(lang))}`, `Offen seit ${shortDate(occurrence.dueDate, localeOf(lang))}`);
    else if (waiting) when = waitingLabel(daysUntil, occurrence.dueDate, lang);
    else when = dueLabel(daysUntil, occurrence.dueDate, lang);
  }

  const person = nameOf(isBill ? routine.payerId : occurrence?.assignedTo ?? null);
  const amount = isBill && occurrence ? occurrence.amount ?? routine.amount : null;

  const memberIds = members.map((m) => m.id);
  const handOff = !isBill && occurrence ? handOffFor(occurrence.assignedTo, userId, memberIds) : ({ kind: "none" } as const);
  const otherName = handOff.kind === "direct" && !handOff.takeOver ? members.find((m) => m.id === handOff.toId)?.name ?? "" : "";

  const onCheck = () => {
    if (!occurrence) return;
    if (isBill) setPaying((v) => !v);
    else actions.resolve(occurrence, "done");
  };

  const onHandOff = () => {
    if (!occurrence) return;
    if (handOff.kind === "direct") actions.swap(occurrence, handOff.toId);
    else if (handOff.kind === "choose") setChoosing((v) => !v);
  };

  const handOffLabel =
    handOff.kind === "direct" && handOff.takeOver
      ? t("Take over", "Übernehmen")
      : otherName
        ? t(`Give to ${otherName}`, `An ${otherName} abgeben`)
        : t("Hand over", "Abgeben");

  const pillStyle: React.CSSProperties = waiting
    ? { background: "var(--danger-soft)", color: "var(--danger)" }
    : daysUntil === 0
      ? { background: "var(--accent-soft)", color: "var(--accent)" }
      : headsUp
        ? { color: "var(--accent)" }
        : {};

  return (
    <li className="py-1.5">
      <div className="flex items-start gap-1.5">
        {occurrence ? (
          <button
            type="button"
            onClick={onCheck}
            aria-label={isBill ? t(`Mark “${title}” as paid`, `„${title}“ als bezahlt markieren`) : t(`Mark “${title}” as done`, `„${title}“ als erledigt markieren`)}
            className="press shrink-0 w-10 h-10 -ml-1.5 flex items-center justify-center"
          >
            <span
              className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-transparent hover:text-[var(--success)] hover:border-[var(--success)] transition-colors"
              style={{ borderColor: "var(--border-strong)" }}
            >
              <Check className="w-4 h-4" />
            </span>
          </button>
        ) : (
          <span className="shrink-0 w-10 h-10 -ml-1.5" aria-hidden />
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left py-1 press"
        >
          <span className="flex items-start gap-2">
            <span className="text-lg shrink-0 leading-5" aria-hidden>{routine.icon}</span>
            <span className="font-medium text-sm leading-5 line-clamp-2 min-w-0">{title}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 mt-[3px] text-[var(--text-tertiary)] transition-transform ${expanded ? "rotate-180" : ""}`}
              aria-hidden
            />
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption">
            {when && (
              <span
                className={`rounded-full ${waiting || daysUntil === 0 ? "px-2 py-0.5 text-[11px] font-semibold" : headsUp ? "font-semibold" : ""}`}
                style={pillStyle}
              >
                {when}
              </span>
            )}
            {!occurrence && <span>{t("Nothing planned right now", "Gerade nichts geplant")}</span>}
            {variant === "manage" && <span>{describeRoutine(routine, lang, true)}</span>}
            {showRoom && room && (
              <span>{room.icon} {localizeKnown(room.name, ROOM_PRESETS, lang)}</span>
            )}
            {amount != null && (
              <span className="font-mono">
                {routine.amountKind === "estimate" && occurrence?.amount == null ? t("approx. ", "ca. ") : ""}{chf(amount)}
              </span>
            )}
            {person && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" aria-hidden />{isBill ? t(`${person} pays`, `${person} zahlt`) : person}
              </span>
            )}
          </span>
        </button>

        {handOff.kind !== "none" && (
          <button
            type="button"
            onClick={onHandOff}
            className="press btn btn-ghost btn-sm shrink-0 !px-2.5 text-xs"
            aria-label={`${handOffLabel}: ${title}`}
            title={handOffLabel}
          >
            <ArrowLeftRight className="w-4 h-4" aria-hidden />
            {/* Icon only on a phone, so the name keeps its room; the label is in the tooltip and for screen readers. */}
            <span className="hidden sm:inline max-w-[11rem] truncate">{handOffLabel}</span>
          </button>
        )}
      </div>

      {choosing && occurrence && handOff.kind === "choose" && (
        <div className="mt-1 ml-10 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] p-3" style={{ background: "var(--surface-2)" }}>
          <span className="text-sm">{t("Who takes it?", "Wer übernimmt?")}</span>
          {handOff.optionIds.map((id) => (
            <button
              key={id}
              type="button"
              className="chip"
              onClick={() => {
                setChoosing(false);
                actions.swap(occurrence, id);
              }}
            >
              {members.find((m) => m.id === id)?.name ?? "?"}
            </button>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChoosing(false)}>{t("Cancel", "Abbrechen")}</button>
        </div>
      )}

      {isBill && paying && occurrence && (
        <div className="mt-1 ml-10">
          <PayPanel
            routine={routine}
            occurrence={occurrence}
            finance={finance}
            members={members}
            userId={userId}
            onConfirm={async (input) => {
              const ok = await actions.pay(occurrence, input);
              if (ok) setPaying(false);
              return ok;
            }}
            onCancel={() => setPaying(false)}
          />
        </div>
      )}

      {expanded && <RoutineEditPanel routine={routine} occurrence={occurrence} ctx={ctx} />}
    </li>
  );
}
