"use client";

import { useState } from "react";
import { SkipForward, Trash2 } from "lucide-react";
import { useI18n } from "../../context/LanguageContext";
import { SUPPLY_SUGGESTIONS, ROOM_PRESETS, localizeKnown } from "../constants";
import { describeRoutine } from "../routines/describe";
import { KNOWN_TITLES } from "../routines/knownTitles";
import { turnOrder } from "../routines/quickAdd";
import type { Occurrence, Routine } from "../routines/types";
import type { RowContext } from "./rowContext";

type Who = "open" | "turns" | "fair" | { member: string };

function currentWho(r: Routine): Who {
  if (r.assignment === "fixed" && r.assigneeId) return { member: r.assigneeId };
  if (r.assignment === "rotation") return "turns";
  if (r.assignment === "fair_share") return "fair";
  return "open";
}

const same = (a: Who, b: Who) => (typeof a === "string" || typeof b === "string" ? a === b : a.member === b.member);

// The details behind a row: how often, what it needs, and the few things worth changing later
// (name, room, who does it), plus skipping this time and deleting.
export default function RoutineEditPanel({
  routine,
  occurrence,
  ctx,
}: {
  routine: Routine;
  occurrence: Occurrence | null;
  ctx: RowContext;
}) {
  const { t, lang } = useI18n();
  const { members, userId, rooms, actions } = ctx;
  const shownTitle = localizeKnown(routine.title, KNOWN_TITLES, lang);
  const [title, setTitle] = useState(shownTitle);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isBill = routine.kind === "bill";
  const who = currentWho(routine);
  // Me first, then the others in the household's order.
  const memberIds = turnOrder(members.map((m) => m.id), userId);

  const saveTitle = () => {
    const next = title.trim();
    if (!next || next === shownTitle) {
      setTitle(shownTitle);
      return;
    }
    actions.update(routine.id, { title: next });
  };

  const chooseWho = (next: Who) => {
    if (same(who, next)) return;
    if (next === "open") actions.update(routine.id, { assignment: "open" });
    else if (next === "turns") actions.update(routine.id, { assignment: "rotation", rotation: memberIds });
    else if (next === "fair") actions.update(routine.id, { assignment: "fair_share" });
    else actions.update(routine.id, { assignment: "fixed", assigneeId: next.member });
  };

  const nameOf = (id: string) => (id === userId ? t("Me", "Ich") : members.find((m) => m.id === id)?.name ?? "?");

  return (
    <div className="mt-1 mb-2 ml-10 rounded-[var(--radius-md)] p-3 space-y-3" style={{ background: "var(--surface-2)" }}>
      <div className="text-caption">
        {describeRoutine(routine, lang)}
        {routine.supplies.length > 0 && (
          <> · {t("Supplies", "Material")}: {routine.supplies.map((s) => localizeKnown(s, SUPPLY_SUGGESTIONS, lang)).join(", ")}</>
        )}
      </div>

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
