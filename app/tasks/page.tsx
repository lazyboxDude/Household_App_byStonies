"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Trophy, Medal, Sparkles } from "lucide-react";
import { UserStats } from "./types";
import TaskListTab from "./components/TaskListTab";
import CleaningPlanTab from "./components/CleaningPlanTab";

const DEFAULT_STATS: UserStats = {
  level: 1,
  currentXP: 15,
  xpToNextLevel: 100,
  totalTasksCompleted: 1,
};

type Tab = "tasks" | "cleaning";

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<Tab>("tasks");

  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const s = localStorage.getItem("task_stats");
      return s ? (JSON.parse(s) as UserStats) : DEFAULT_STATS;
    } catch {
      return DEFAULT_STATS;
    }
  });

  useEffect(() => {
    localStorage.setItem("task_stats", JSON.stringify(stats));
  }, [stats]);

  const awardPoints = (points: number) => {
    setStats((prev) => {
      if (points >= 0) {
        let currentXP = prev.currentXP + points;
        let level = prev.level;
        let xpToNextLevel = prev.xpToNextLevel;

        if (currentXP >= xpToNextLevel) {
          level++;
          currentXP -= xpToNextLevel;
          xpToNextLevel = Math.floor(xpToNextLevel * 1.5);
        }

        return { level, currentXP, xpToNextLevel, totalTasksCompleted: prev.totalTasksCompleted + 1 };
      }

      return {
        ...prev,
        currentXP: Math.max(0, prev.currentXP + points),
        totalTasksCompleted: Math.max(0, prev.totalTasksCompleted - 1),
      };
    });
  };

  const progressPercentage = (stats.currentXP / stats.xpToNextLevel) * 100;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          Household Tasks
        </h1>

        {/* Gamification Stats Card */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-6">
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
                className="bg-yellow-400 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs mt-1 text-indigo-100 text-center">
              {Math.round(stats.xpToNextLevel - stats.currentXP)} XP to next level
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "tasks"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => setActiveTab("cleaning")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "cleaning"
              ? "border-teal-600 text-teal-600 dark:text-teal-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          <Sparkles className="w-4 h-4" /> Cleaning Plan
        </button>
      </div>

      {activeTab === "tasks" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TaskListTab onAwardPoints={awardPoints} />
          </div>

          {/* Sidebar / Leaderboard */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Medal className="w-5 h-5 text-orange-500" />
                Top Contributors
              </h2>
              <div className="space-y-4">
                {/* Mock Leaderboard */}
                {[
                  { name: "Dad", xp: 1250, rank: 1 },
                  { name: "Mom", xp: 980, rank: 2 },
                  { name: "Kid", xp: 450, rank: 3 },
                ].map((user) => (
                  <div key={user.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          user.rank === 1
                            ? "bg-yellow-100 text-yellow-700"
                            : user.rank === 2
                            ? "bg-gray-100 text-gray-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {user.rank}
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{user.name}</span>
                    </div>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{user.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800">
              <h3 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2">Daily Challenge</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3">
                Complete 3 tasks before 8 PM to earn a bonus 50 XP!
              </p>
              <div className="w-full bg-white dark:bg-gray-700 rounded-full h-2 mb-1">
                <div className="bg-indigo-500 h-full rounded-full w-1/3"></div>
              </div>
              <p className="text-xs text-right text-indigo-600 dark:text-indigo-400">1/3 Completed</p>
            </div>
          </div>
        </div>
      ) : (
        <CleaningPlanTab onAwardPoints={awardPoints} />
      )}
    </div>
  );
}
