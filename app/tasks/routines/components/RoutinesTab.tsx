"use client";

import { useState } from "react";
import { Plus, Repeat, Trash2, Loader2 } from "lucide-react";
import { chf } from "../../../expenses/format";
import { useAuth } from "../../../context/AuthContext";
import { buildAgenda } from "../agenda";
import { plannerBills } from "../billPlan";
import { describeRoutine } from "../describe";
import { useRoutines } from "../useRoutines";
import RoutineForm from "./RoutineForm";
import WeekAgenda from "./WeekAgenda";

export default function RoutinesTab({ householdId }: { householdId: string }) {
  const { user, household } = useAuth();
  const members = household?.members ?? [];
  const calendarEnabled = household?.enabledFeatures.includes("calendar") ?? false;
  const expensesEnabled = household?.enabledFeatures.includes("expenses") ?? false;
  const { routines, occurrences, today, isLoading, undoable, addRoutine, deleteRoutine, resolve, payBill, finance } = useRoutines(
    householdId,
    user?.id,
    { calendarEnabled, expensesEnabled }
  );

  const [adding, setAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const memberName = (id: string | null) => (id ? members.find((m) => m.id === id)?.name ?? null : null);
  const agenda = buildAgenda(routines, occurrences, today);
  const yearlyBills = plannerBills(routines, today).reduce((sum, b) => sum + b.amount * b.months.length, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <section className="surface p-5">
          <h2 className="text-headline mb-2">Diese Woche</h2>
          <WeekAgenda
            items={agenda}
            memberName={memberName}
            onResolve={resolve}
            onPay={payBill}
            finance={finance}
            undoable={undoable}
            emptyText={routines.length === 0 ? "Hier erscheint, was in den nächsten Tagen ansteht." : "Diese Woche steht nichts an."}
          />
        </section>

        {adding && (
          <RoutineForm
            today={today}
            members={members}
            calendarEnabled={calendarEnabled}
            expensesEnabled={expensesEnabled}
            onSubmit={addRoutine}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>

      <section className="surface p-5 lg:col-span-2 self-start">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-headline flex items-center gap-2">
            <Repeat className="w-5 h-5" style={{ color: "var(--accent)" }} /> Routinen
          </h2>
          {!adding && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4" /> Neu
            </button>
          )}
        </div>

        {routines.length === 0 ? (
          <div>
            <p className="text-body text-[var(--text-secondary)] mb-3">
              Kehricht, Bad putzen, Papiersammlung: alles, was regelmässig wiederkommt, kannst du hier eintragen.
              Dann musst du nicht mehr daran denken.
            </p>
            {!adding && (
              <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
                Erste Routine anlegen
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {routines.map((r) => (
              <li key={r.id} className="group flex items-center gap-3 py-3">
                <span className="text-xl shrink-0" aria-hidden>{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{r.title}</div>
                  <div className="text-caption truncate">
                    {describeRoutine(r)}
                    {r.kind === "bill" && r.amount != null ? ` · ${r.amountKind === "estimate" ? "ca. " : ""}${chf(r.amount)}` : ""}
                    {memberName(r.kind === "bill" ? r.payerId : r.assigneeId) ? ` · ${memberName(r.kind === "bill" ? r.payerId : r.assigneeId)}` : ""}
                  </div>
                </div>
                {confirmDeleteId === r.id ? (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      className="press text-[11px] font-semibold px-2 py-1 rounded-full bg-[var(--danger)] text-white"
                      onClick={() => {
                        setConfirmDeleteId(null);
                        deleteRoutine(r.id);
                      }}
                    >
                      Löschen
                    </button>
                    <button
                      type="button"
                      className="press text-[11px] font-semibold px-2 py-1 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Abbrechen
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`${r.title} löschen`}
                    className="press row-action text-[var(--text-tertiary)] hover:text-[var(--danger)] shrink-0"
                    onClick={() => setConfirmDeleteId(r.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {yearlyBills > 0 && (
          <p className="text-caption mt-3">Deine Rechnungen hier kommen zusammen auf etwa {chf(yearlyBills)} im Jahr.</p>
        )}
      </section>
    </div>
  );
}
