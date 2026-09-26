"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Trophy, Medal, Sparkles, Loader2 } from "lucide-react";
import { UserStats } from "./types";
import TaskListTab from "./components/TaskListTab";
import CleaningPlanTab from "./components/CleaningPlanTab";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const DEFAULT_STATS: UserStats = {
  level: 1,
  currentXP: 0,
  xpToNextLevel: 100,
  totalTasksCompleted: 0,
};

interface LeaderboardEntry {
  userId: string;
  name: string;
  avatar: string | null;
  totalXpEarned: number;
}

type Tab = "tasks" | "cleaning";

export default function TasksPage() {
  const { user, household } = useAuth();
  const householdId = household?.id;
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [totalXpEarned, setTotalXpEarned] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!householdId || !userId) return;
    const { data } = await supabase
      .from("member_stats")
      .select("*")
      .eq("household_id", householdId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setStats({
        level: data.level,
        currentXP: data.current_xp,
        xpToNextLevel: data.xp_to_next_level,
        totalTasksCompleted: data.total_tasks_completed,
      });
      setTotalXpEarned(data.total_xp_earned);
    } else {
      setStats(DEFAULT_STATS);
      setTotalXpEarned(0);
    }
  }, [householdId, userId]);

  const loadLeaderboard = useCallback(async () => {
    if (!householdId) return;
    const [{ data: members }, { data: statsRows }] = await Promise.all([
      supabase.from("household_members").select("user_id, profiles(name, avatar_url)").eq("household_id", householdId),
      supabase.from("member_stats").select("user_id, total_xp_earned").eq("household_id", householdId),
    ]);

    const entries: LeaderboardEntry[] = (members ?? []).map((m) => {
      const profile = m.profiles as { name: string; avatar_url: string | null } | null;
      const s = statsRows?.find((row) => row.user_id === m.user_id);
      return {
        userId: m.user_id,
        name: profile?.name ?? "Member",
        avatar: profile?.avatar_url ?? null,
        totalXpEarned: s?.total_xp_earned ?? 0,
      };
    });
    entries.sort((a, b) => b.totalXpEarned - a.totalXpEarned);
    setLeaderboard(entries);
  }, [householdId]);

  useEffect(() => {
    // Standard fetch-on-mount: sets isLoading(false) once both loads finish.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([loadStats(), loadLeaderboard()]).finally(() => setIsLoading(false));
  }, [loadStats, loadLeaderboard]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`member-stats-${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_stats", filter: `household_id=eq.${householdId}` },
        () => {
          loadStats();
          loadLeaderboard();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, loadStats, loadLeaderboard]);

  const awardPoints = async (points: number) => {
    if (!householdId || !userId) return;

    const { data: current } = await supabase
      .from("member_stats")
      .select("*")
      .eq("household_id", householdId)
      .eq("user_id", userId)
      .maybeSingle();

    const prev = current ?? {
      level: 1,
      current_xp: 0,
      xp_to_next_level: 100,
      total_tasks_completed: 0,
      total_xp_earned: 0,
    };

    let level = prev.level;
    let currentXP = prev.current_xp;
    let xpToNextLevel = prev.xp_to_next_level;
    let totalTasksCompleted = prev.total_tasks_completed;

    if (points >= 0) {
      currentXP += points;
      if (currentXP >= xpToNextLevel) {
        level++;
        currentXP -= xpToNextLevel;
        xpToNextLevel = Math.floor(xpToNextLevel * 1.5);
      }
      totalTasksCompleted += 1;
    } else {
      currentXP = Math.max(0, currentXP + points);
      totalTasksCompleted = Math.max(0, totalTasksCompleted - 1);
    }
    const nextTotalXpEarned = Math.max(0, prev.total_xp_earned + points);

    // Optimistic local update — realtime will reconcile this and every
    // other member's view shortly after.
    setStats({ level, currentXP, xpToNextLevel, totalTasksCompleted });
    setTotalXpEarned(nextTotalXpEarned);

    await supabase.from("member_stats").upsert({
      household_id: householdId,
      user_id: userId,
      level,
      current_xp: currentXP,
      xp_to_next_level: xpToNextLevel,
      total_tasks_completed: totalTasksCompleted,
      total_xp_earned: nextTotalXpEarned,
    });
  };

  const progressPercentage = (stats.currentXP / stats.xpToNextLevel) * 100;

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

        {/* Gamification Stats Card */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-[var(--radius-lg)] shadow-lg flex items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="bg-white/20 p-2 rounded-full mb-1">
              <Trophy className="w-6 h-6 text-yellow-300" />
            </div>
            <span className="font-bold text-xl">Lvl {stats.level}</span>
          </div>

          <div className="flex-1 min-w-[150px]">
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span>{stats.currentXP} XP</span>
              <span>{stats.xpToNextLevel} XP</span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-yellow-400 h-full rounded-full transition-all"
                style={{
                  width: `${progressPercentage}%`,
                  transitionDuration: "var(--dur-slow)",
                  transitionTimingFunction: "var(--ease-spring)",
                }}
              />
            </div>
            <p className="text-xs mt-1 text-indigo-100 text-center">
              {Math.round(stats.xpToNextLevel - stats.currentXP)} XP to next level
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-rise">
          <div className="lg:col-span-2">
            <TaskListTab householdId={householdId} onAwardPoints={awardPoints} />
          </div>

          {/* Sidebar / Leaderboard */}
          <div className="space-y-6">
            <div className="surface p-5">
              <h2 className="text-headline mb-4 flex items-center gap-2">
                <Medal className="w-5 h-5 text-orange-500" />
                Top Contributors
              </h2>
              <div className="space-y-4">
                {leaderboard.length === 0 && <p className="text-caption">No members yet.</p>}
                {leaderboard.map((entry, i) => {
                  const rank = i + 1;
                  return (
                    <div key={entry.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            rank === 1
                              ? "bg-yellow-100 text-yellow-700"
                              : rank === 2
                              ? "bg-[var(--surface-2)] text-[var(--text-secondary)]"
                              : "bg-orange-50 text-orange-700"
                          }`}
                        >
                          {rank}
                        </div>
                        <span className="text-body font-medium">
                          {entry.userId === userId ? "You" : entry.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {entry.totalXpEarned} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[var(--radius-lg)] p-5 border border-indigo-100 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
              <h3 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2">This Household</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                {stats.totalTasksCompleted} tasks completed by you · {totalXpEarned} XP earned all-time
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-rise">
          <CleaningPlanTab householdId={householdId} onAwardPoints={awardPoints} />
        </div>
      )}
    </div>
  );
}
