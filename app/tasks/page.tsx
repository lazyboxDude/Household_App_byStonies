"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ListChecks, Sparkles, Loader2 } from "lucide-react";
import TaskListTab from "./components/TaskListTab";
import CleaningPlanTab from "./components/CleaningPlanTab";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

interface TaskCounts {
  open: number;
  done: number;
}

type Tab = "tasks" | "cleaning";

export default function TasksPage() {
  const { household } = useAuth();
  const householdId = household?.id;

  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [counts, setCounts] = useState<TaskCounts>({ open: 0, done: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // A plain, non-competitive read of how the household is doing — open vs.
  // done, nothing to compare between people. Enough to keep chores from
  // quietly falling behind, without the points/levels/leaderboard that
  // didn't land.
  const loadCounts = useCallback(async () => {
    if (!householdId) return;
    const [{ count: open }, { count: done }] = await Promise.all([
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId)
        .eq("completed", false),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("household_id", householdId)
        .eq("completed", true),
    ]);
    setCounts({ open: open ?? 0, done: done ?? 0 });
  }, [householdId]);

  useEffect(() => {
    // Standard fetch-on-mount: loadCounts sets isLoading(false) once done.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCounts().finally(() => setIsLoading(false));
  }, [loadCounts]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`task-counts-${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${householdId}` },
        loadCounts
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, loadCounts]);

  if (!householdId) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-display flex items-center gap-3 mb-6 animate-rise">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          Household Tasks
        </h1>
        <div className="surface p-8 text-center animate-rise">
          <p className="text-body text-[var(--text-secondary)] mb-4">
            Join or create a household to share tasks and the cleaning plan.
          </p>
          <Link href="/login" className="btn btn-primary inline-flex">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-rise">
        <h1 className="text-display flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          Household Tasks
        </h1>

        {/* Progress — a plain, non-competitive count, not a scoreboard */}
        <div className="surface p-4 flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--accent-soft)" }}
          >
            <ListChecks className="w-5 h-5" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <div className="text-headline">
              {counts.open === 0 ? "All caught up" : `${counts.open} open`}
            </div>
            <p className="text-caption">
              {counts.done} completed so far{counts.open === 0 && counts.done > 0 ? " · nicely done" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b divider">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`press px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-300 ${
            activeTab === "tasks"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => setActiveTab("cleaning")}
          className={`press px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-300 flex items-center gap-1.5 ${
            activeTab === "cleaning"
              ? "border-teal-600 text-teal-600 dark:text-teal-400"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
          }`}
        >
          <Sparkles className="w-4 h-4" /> Cleaning Plan
        </button>
      </div>

      {activeTab === "tasks" ? (
        <div className="animate-rise">
          <TaskListTab householdId={householdId} />
        </div>
      ) : (
        <div className="animate-rise">
          <CleaningPlanTab householdId={householdId} />
        </div>
      )}
    </div>
  );
}
