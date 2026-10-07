"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useI18n } from "../../../context/LanguageContext";
import RoutineRow from "../../components/RoutineRow";
import UndoBar from "../../components/UndoBar";
import type { RowContext } from "../../components/rowContext";
import { buildAgenda } from "../agenda";
import { useRoutines } from "../useRoutines";

// Dashboard card. Stays out of the way (renders nothing) until the household has a recurring task.
export default function RoutinesWidget({ householdId, style }: { householdId: string; style?: React.CSSProperties }) {
  const { user, household } = useAuth();
  const { t } = useI18n();
  const members = useMemo(() => household?.members ?? [], [household?.members]);
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const calendarEnabled = household?.enabledFeatures.includes("calendar") ?? false;
  const expensesEnabled = household?.enabledFeatures.includes("expenses") ?? false;
  const data = useRoutines(householdId, user?.id, { calendarEnabled, expensesEnabled }, memberIds);

  if (data.routines.length === 0) return null;

  const items = buildAgenda(data.routines, data.occurrences, data.today).slice(0, 6);
  // No room names here: the card is a glance, the rooms live on the Tasks page.
  const ctx: RowContext = {
    members,
    userId: user?.id,
    rooms: [],
    finance: data.finance,
    actions: { resolve: data.resolve, swap: data.swap, pay: data.payBill, update: data.updateRoutine, remove: data.deleteRoutine },
  };

  return (
    <section className="surface p-5 animate-rise" style={style}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-headline">{t("This week", "Diese Woche")}</h2>
        <Link href="/tasks" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
          {t("Tasks", "Aufgaben")} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-caption py-4">{t("Nothing is due this week.", "Diese Woche steht nichts an.")}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <RoutineRow key={item.occurrence.id} routine={item.routine} occurrence={item.occurrence} today={data.today} variant="agenda" ctx={ctx} />
          ))}
        </ul>
      )}
      <UndoBar undoable={data.undoable} />
    </section>
  );
}
