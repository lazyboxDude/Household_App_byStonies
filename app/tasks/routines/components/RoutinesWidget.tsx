"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { buildAgenda } from "../agenda";
import { useRoutines } from "../useRoutines";
import WeekAgenda from "./WeekAgenda";

// Dashboard card. Stays out of the way (renders nothing) until the household has a routine.
export default function RoutinesWidget({ householdId, style }: { householdId: string; style?: React.CSSProperties }) {
  const { user, household } = useAuth();
  const members = household?.members ?? [];
  const calendarEnabled = household?.enabledFeatures.includes("calendar") ?? false;
  const expensesEnabled = household?.enabledFeatures.includes("expenses") ?? false;
  const { routines, occurrences, today, undoable, resolve, payBill, finance } = useRoutines(householdId, user?.id, {
    calendarEnabled,
    expensesEnabled,
  });

  if (routines.length === 0) return null;

  const items = buildAgenda(routines, occurrences, today).slice(0, 6);
  const memberName = (id: string | null) => (id ? members.find((m) => m.id === id)?.name ?? null : null);

  return (
    <section className="surface p-5 animate-rise" style={style}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-headline">Diese Woche</h2>
        <Link href="/tasks" className="press text-caption flex items-center gap-1 hover:text-[var(--text)]">
          Routinen <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <WeekAgenda items={items} memberName={memberName} onResolve={resolve} onPay={payBill} finance={finance} undoable={undoable} />
    </section>
  );
}
