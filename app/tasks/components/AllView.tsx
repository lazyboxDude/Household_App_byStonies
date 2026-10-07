"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import Mascot from "@/components/Mascot";
import { useI18n } from "../../context/LanguageContext";
import { nextOccurrence } from "../routines/agenda";
import AbsencesCard from "../routines/components/AbsencesCard";
import type { useRoutineTeam } from "../routines/useRoutineTeam";
import type { Occurrence, Routine, RoutineKind } from "../routines/types";
import RoutineRow from "./RoutineRow";
import type { RowContext } from "./rowContext";

interface Props {
  today: string;
  routines: Routine[];
  occurrences: Occurrence[];
  ctx: RowContext;
  team: ReturnType<typeof useRoutineTeam>;
  onNew: () => void;
}

// "Alle": everything that is planned, for looking after it. Open a row for its details, to change
// who does it or to delete it.
export default function AllView({ today, routines, occurrences, ctx, team, onNew }: Props) {
  const { t } = useI18n();
  const { members, userId } = ctx;

  const rows = useMemo(() => {
    const list = routines.map((r) => ({ routine: r, occurrence: nextOccurrence(r, occurrences, today) }));
    return list.sort(
      (a, b) =>
        (a.occurrence?.dueDate ?? "9999").localeCompare(b.occurrence?.dueDate ?? "9999") ||
        a.routine.title.localeCompare(b.routine.title)
    );
  }, [routines, occurrences, today]);

  const groups: { kind: RoutineKind; title: string }[] = [
    { kind: "chore", title: t("Tasks that come back", "Wiederkehrende Aufgaben") },
    { kind: "reminder", title: t("Reminders", "Erinnerungen") },
    { kind: "bill", title: t("Bills", "Rechnungen") },
  ];
  const usesTurns = routines.some((r) => r.assignment === "rotation" || r.assignment === "fair_share");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption">
            {t("Everything that comes back, in one list. Open a row to change it.", "Alles, was wiederkommt, in einer Liste. Öffne eine Zeile, um etwas zu ändern.")}
          </p>
          <button type="button" className="btn btn-secondary btn-sm shrink-0" onClick={onNew}>
            <Plus className="w-4 h-4" /> {t("New", "Neu")}
          </button>
        </div>

        {routines.length === 0 ? (
          <div className="surface flex flex-col items-center text-center px-6 py-10 text-[var(--text-secondary)]">
            <Mascot mood="think" size={80} />
            <p className="font-hand text-2xl font-semibold mt-2">{t("Nothing comes back yet.", "Noch kommt nichts wieder.")}</p>
            <p className="text-caption mt-1 mb-4">
              {t(
                "Trash collection, cleaning the bathroom, watering the plants: write it down once and it keeps coming up by itself.",
                "Kehricht, Bad putzen, Pflanzen giessen: einmal aufschreiben, dann meldet es sich von selbst."
              )}
            </p>
            <button type="button" className="btn btn-primary" onClick={onNew}>{t("Add the first one", "Erste Aufgabe anlegen")}</button>
          </div>
        ) : (
          groups.map((g) => {
            const list = rows.filter((x) => x.routine.kind === g.kind);
            if (list.length === 0) return null;
            return (
              <section key={g.kind} className="surface p-4">
                <h2 className="text-micro flex items-center gap-2 mb-1">
                  {g.title}
                  <span className="rounded-full px-1.5 py-px" style={{ background: "var(--surface-2)" }}>{list.length}</span>
                </h2>
                <ul>
                  {list.map(({ routine, occurrence }) => (
                    <RoutineRow key={routine.id} routine={routine} occurrence={occurrence} today={today} variant="manage" ctx={ctx} />
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>

      {members.length > 1 && usesTurns && (
        <div className="lg:col-span-2 self-start">
          <AbsencesCard members={members} absences={team.absences} today={today} userId={userId} onAdd={team.addAbsence} onRemove={team.removeAbsence} />
        </div>
      )}
    </div>
  );
}
