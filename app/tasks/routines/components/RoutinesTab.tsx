"use client";

import { useEffect, useMemo, useState } from "react";
import { FileUp, Plus, Repeat, Sparkles, Trash2, Loader2 } from "lucide-react";
import { showToast } from "../../../../lib/toast";
import { chf } from "../../../expenses/format";
import { useAuth } from "../../../context/AuthContext";
import { buildAgenda } from "../agenda";
import { plannerBills } from "../billPlan";
import { describeRoutine, whoLabel } from "../describe";
import { fairness as computeFairness } from "../fairness";
import { netBalances, suggestTransfers } from "../settle";
import { useRoutines } from "../useRoutines";
import { FairnessCard, SettleUpCard } from "./BalanceCards";
import ImportPanel from "./ImportPanel";
import PushCard from "./PushCard";
import RoutineForm from "./RoutineForm";
import { AbsencesCard, LivingModeCard } from "./TeamCards";
import WeekAgenda from "./WeekAgenda";

function fairnessKey(householdId: string) {
  return `routines-fairness-${householdId}`;
}

export default function RoutinesTab({ householdId }: { householdId: string }) {
  const { user, household } = useAuth();
  const members = useMemo(() => household?.members ?? [], [household?.members]);
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const calendarEnabled = household?.enabledFeatures.includes("calendar") ?? false;
  const expensesEnabled = household?.enabledFeatures.includes("expenses") ?? false;
  const { routines, occurrences, doneRecent, paidBills, today, isLoading, undoable, addRoutine, deleteRoutine, resolve, payBill, swap, importCalendar, importCleaningPlan, cleaningOpen, finance, team } =
    useRoutines(householdId, user?.id, { calendarEnabled, expensesEnabled }, memberIds);

  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmCleaning, setConfirmCleaning] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // The Fairness-Waage is on by default in a WG and off for couples; each person can flip it for themselves.
  const [fairnessPref, setFairnessPref] = useState<"on" | "off" | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(fairnessKey(householdId));
      // Read-on-mount from localStorage, not a sync with external state changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFairnessPref(v === "on" || v === "off" ? v : null);
    } catch {
      // Storage can be unavailable; the default applies.
    }
  }, [householdId]);
  const showFairness = (fairnessPref ?? (team.livingMode === "wg" ? "on" : "off")) === "on";
  const toggleFairness = () => {
    const next = showFairness ? "off" : "on";
    setFairnessPref(next);
    try {
      localStorage.setItem(fairnessKey(householdId), next);
    } catch {
      // Nothing to persist to; it only lasts for this visit.
    }
  };

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "?";
  const memberName = (id: string | null) => (id ? members.find((m) => m.id === id)?.name ?? null : null);
  const agenda = buildAgenda(routines, occurrences, today);
  const yearlyBills = plannerBills(routines, today).reduce((sum, b) => sum + b.amount * b.months.length, 0);

  const fairness = useMemo(
    () => computeFairness(doneRecent, routines, memberIds, team.settings.fairnessWeights),
    [doneRecent, routines, memberIds, team.settings.fairnessWeights]
  );
  const transfers = useMemo(
    () =>
      suggestTransfers(
        netBalances(
          paidBills.filter((o) => o.doneBy && o.amount != null).map((o) => ({ paidBy: o.doneBy!, amount: o.amount!, split: o.split })),
          team.settlements.map((s) => ({ from: s.fromUser, to: s.toUser, amount: s.amount }))
        )
      ),
    [paidBills, team.settlements]
  );

  const hasTeam = members.length > 1;
  const usesWho = routines.some((r) => r.assignment === "rotation" || r.assignment === "fair_share");
  const hasSplit = routines.some((r) => r.split) || paidBills.length > 0 || team.settlements.length > 0;
  const hasChores = routines.some((r) => r.kind !== "bill");

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
            onSwap={swap}
            members={members}
            userId={user?.id}
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
            livingMode={team.livingMode}
            onSubmit={addRoutine}
            onCancel={() => setAdding(false)}
          />
        )}

        {importing && <ImportPanel routines={routines} today={today} onImport={importCalendar} onCancel={() => setImporting(false)} />}

        {cleaningOpen > 0 && (
          <section className="surface p-5">
            <h2 className="text-headline flex items-center gap-2 mb-1"><Sparkles className="w-5 h-5" style={{ color: "var(--accent)" }} /> Putzplan hier weiterführen?</h2>
            <p className="text-caption mb-3">
              Du hast {cleaningOpen} {cleaningOpen === 1 ? "Aufgabe" : "Aufgaben"} im Putzplan. Hier bekommen sie Zuständigkeit, Tausch und Fairness-Waage.
              Im Putzplan sind sie danach ausgeblendet. Löschst du eine Routine, erscheint die Aufgabe dort wieder.
            </p>
            {confirmCleaning ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    setConfirmCleaning(false);
                    const n = await importCleaningPlan(members);
                    if (n > 0) showToast(`${n} ${n === 1 ? "Aufgabe" : "Aufgaben"} übernommen`, "success");
                  }}
                >
                  Ja, übernehmen
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmCleaning(false)}>Abbrechen</button>
              </div>
            ) : (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmCleaning(true)}>Putzplan übernehmen</button>
            )}
          </section>
        )}

        {hasSplit && hasTeam && <SettleUpCard transfers={transfers} nameOf={nameOf} onSettle={(t) => team.settle(t.from, t.to, t.amount)} />}
        {hasTeam && hasChores && showFairness && (
          <FairnessCard
            fairness={fairness}
            nameOf={nameOf}
            weights={team.settings.fairnessWeights}
            memberIds={memberIds}
            onSaveWeights={(w) => team.saveSettings({ fairnessWeights: w })}
          />
        )}
      </div>

      <div className="lg:col-span-2 space-y-6 self-start">
        <section className="surface p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-headline flex items-center gap-2">
              <Repeat className="w-5 h-5" style={{ color: "var(--accent)" }} /> Routinen
            </h2>
            {!adding && (
              <div className="flex gap-2">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setImporting(true)}>
                  <FileUp className="w-4 h-4" /> Kalender
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(true)}>
                  <Plus className="w-4 h-4" /> Neu
                </button>
              </div>
            )}
          </div>

          {routines.length === 0 ? (
            <div>
              <p className="text-body text-[var(--text-secondary)] mb-3">
                Kehricht, Bad putzen, Papiersammlung, Strom: alles, was regelmässig wiederkommt, kannst du hier eintragen.
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
              {routines.map((r) => {
                const who = whoLabel(r, (id) => memberName(id));
                return (
                  <li key={r.id} className="group flex items-center gap-3 py-3">
                    <span className="text-xl shrink-0" aria-hidden>{r.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{r.title}</div>
                      <div className="text-caption truncate">
                        {describeRoutine(r)}
                        {r.kind === "bill" && r.amount != null ? ` · ${r.amountKind === "estimate" ? "ca. " : ""}${chf(r.amount)}` : ""}
                        {who ? ` · ${who}` : ""}
                        {r.supplies.length > 0 ? ` · Material: ${r.supplies.join(", ")}` : ""}
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
                );
              })}
            </ul>
          )}
          {yearlyBills > 0 && (
            <p className="text-caption mt-3">Deine Rechnungen hier kommen zusammen auf etwa {chf(yearlyBills)} im Jahr.</p>
          )}
          {hasTeam && hasChores && (
            <button type="button" className="text-caption underline mt-3 block" onClick={toggleFairness}>
              {showFairness ? "Fairness-Waage ausblenden" : "Fairness-Waage anzeigen"}
            </button>
          )}
        </section>

        <PushCard />

        {hasTeam && (
          <LivingModeCard mode={team.livingMode} isAuto={team.settings.livingMode === null} onChange={(m) => team.saveSettings({ livingMode: m })} />
        )}
        {hasTeam && usesWho && (
          <AbsencesCard members={members} absences={team.absences} today={today} userId={user?.id} onAdd={team.addAbsence} onRemove={team.removeAbsence} />
        )}
      </div>
    </div>
  );
}
