"use client";

import { Check, SkipForward, Undo2, User } from "lucide-react";
import { dueLabel, type AgendaItem } from "../agenda";
import type { Occurrence } from "../types";
import type { UndoableAction } from "../useRoutines";

interface Props {
  items: AgendaItem[];
  memberName: (id: string | null) => string | null;
  onResolve: (occ: Occurrence, status: "done" | "skipped") => void;
  undoable: UndoableAction | null;
  emptyText?: string;
}

// "Diese Woche": chores, Abfuhr and reminders for the next 7 days in one calm list.
export default function WeekAgenda({ items, memberName, onResolve, undoable, emptyText }: Props) {
  return (
    <div>
      {items.length === 0 ? (
        <p className="text-caption py-4">{emptyText ?? "Diese Woche steht nichts an."}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const { routine, occurrence } = item;
            const who = memberName(occurrence.assignedTo);
            const waiting = item.group === "waiting";
            return (
              <li key={occurrence.id} className="group flex items-center gap-3 py-2">
                <button
                  type="button"
                  aria-label={`${routine.title} erledigt`}
                  onClick={() => onResolve(occurrence, "done")}
                  className="press w-7 h-7 rounded-full border-2 shrink-0 flex items-center justify-center text-transparent hover:text-[var(--success)]"
                  style={{ borderColor: "var(--border-strong)" }}
                >
                  <Check className="w-4 h-4" />
                </button>
                <span className="text-xl shrink-0" aria-hidden>{routine.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{routine.title}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption">
                    <span
                      className={item.headsUp || item.group === "today" ? "font-semibold" : undefined}
                      style={item.headsUp || item.group === "today" ? { color: "var(--accent)" } : undefined}
                    >
                      {waiting ? "Wartet schon" : dueLabel(item.daysUntil, occurrence.dueDate)}
                    </span>
                    {who && <span className="flex items-center gap-1"><User className="w-3 h-3" />{who}</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onResolve(occurrence, "skipped")}
                  className="press row-action btn btn-ghost btn-sm"
                  aria-label={`${routine.title} diesmal auslassen`}
                  title="Diesmal auslassen"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {undoable && (
        <div
          role="status"
          className="mt-3 flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm"
          style={{ background: "var(--surface-2)" }}
        >
          <span className="truncate">{undoable.label}</span>
          <button type="button" onClick={() => undoable.undo()} className="press btn btn-ghost btn-sm shrink-0">
            <Undo2 className="w-4 h-4" /> Rückgängig
          </button>
        </div>
      )}
    </div>
  );
}
