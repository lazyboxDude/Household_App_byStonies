"use client";

import { useState } from "react";
import { ArrowLeftRight, Check, SkipForward, Undo2, User } from "lucide-react";
import { chf } from "../../../expenses/format";
import { dueLabel, type AgendaItem } from "../agenda";
import type { Occurrence } from "../types";
import type { PayInput, UndoableAction } from "../useRoutines";
import PayPanel from "./PayPanel";

interface Props {
  items: AgendaItem[];
  memberName: (id: string | null) => string | null;
  onResolve: (occ: Occurrence, status: "done" | "skipped") => void;
  onPay: (occ: Occurrence, input: PayInput) => Promise<boolean>;
  onSwap: (occ: Occurrence, toUserId: string) => void;
  members: { id: string; name: string }[];
  userId: string | undefined;
  finance: { expensesEnabled: boolean; hasVerteilertopf: boolean };
  undoable: UndoableAction | null;
  emptyText?: string;
}

function shortDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-CH", { day: "numeric", month: "numeric", timeZone: "UTC" });
}

// "Diese Woche": chores, Abfuhr, reminders and bills in one calm list.
export default function WeekAgenda({ items, memberName, onResolve, onPay, onSwap, members, userId, finance, undoable, emptyText }: Props) {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [swappingId, setSwappingId] = useState<string | null>(null);

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-caption py-4">{emptyText ?? "Diese Woche steht nichts an."}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const { routine, occurrence } = item;
            const isBill = routine.kind === "bill";
            const person = memberName(isBill ? routine.payerId : occurrence.assignedTo);
            const waiting = item.group === "waiting";
            const amount = isBill ? occurrence.amount ?? routine.amount : null;
            const when = waiting
              ? isBill ? `Offen seit ${shortDate(occurrence.dueDate)}` : "Wartet schon"
              : dueLabel(item.daysUntil, occurrence.dueDate);
            return (
              <li key={occurrence.id} className="py-2">
                <div className="group flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={isBill ? `${routine.title} bezahlt` : `${routine.title} erledigt`}
                    onClick={() => (isBill ? setPayingId(occurrence.id) : onResolve(occurrence, "done"))}
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
                        {when}
                      </span>
                      {amount != null && (
                        <span className="font-mono">
                          {routine.amountKind === "estimate" && occurrence.amount == null ? "ca. " : ""}{chf(amount)}
                        </span>
                      )}
                      {person && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />{isBill ? `${person} zahlt` : person}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isBill && members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSwappingId(swappingId === occurrence.id ? null : occurrence.id)}
                      className="press row-action btn btn-ghost btn-sm"
                      aria-label={`${routine.title} tauschen`}
                      title="Tauschen"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onResolve(occurrence, "skipped")}
                    className="press row-action btn btn-ghost btn-sm"
                    aria-label={`${routine.title} diesmal auslassen`}
                    title="Diesmal auslassen"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
                {!isBill && swappingId === occurrence.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] p-3" style={{ background: "var(--surface-2)" }}>
                    <span className="text-sm">Wer übernimmt?</span>
                    {members.filter((m) => m.id !== occurrence.assignedTo).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="chip"
                        onClick={() => {
                          setSwappingId(null);
                          onSwap(occurrence, m.id);
                        }}
                      >
                        {m.name}
                      </button>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSwappingId(null)}>Abbrechen</button>
                  </div>
                )}
                {isBill && payingId === occurrence.id && (
                  <div className="mt-2">
                    <PayPanel
                      routine={routine}
                      occurrence={occurrence}
                      finance={finance}
                      members={members}
                      userId={userId}
                      onConfirm={async (input) => {
                        const ok = await onPay(occurrence, input);
                        if (ok) setPayingId(null);
                        return ok;
                      }}
                      onCancel={() => setPayingId(null)}
                    />
                  </div>
                )}
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
