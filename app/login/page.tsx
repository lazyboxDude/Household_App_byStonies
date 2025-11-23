"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { Home, UserPlus, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const { login, createHousehold, joinHousehold, user, household } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState<"name" | "household">("name");
  const [name, setName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      login(name);
      setStep("household");
    }
  };

  const handleHouseholdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create" && householdName.trim()) {
      createHousehold(householdName);
      router.push("/");
    } else if (mode === "join" && inviteCode.trim()) {
      const success = joinHousehold(inviteCode);
      if (success) router.push("/");
      else alert("Invalid code (Try DEMO123)");
    }
  };

  // If already fully logged in, redirect
  if (user && household) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-orange-100 dark:bg-orange-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome Home
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Manage your household together
          </p>
        </div>

        {step === "name" ? (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                What's your name?
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                placeholder="e.g. Alex"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setMode("create")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  mode === "create"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                }`}
              >
                Create New Home
              </button>
              <button
                onClick={() => setMode("join")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  mode === "join"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                }`}
              >
                Join Existing
              </button>
            </div>

            <form onSubmit={handleHouseholdSubmit} className="space-y-4">
              {mode === "create" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Household Name
                  </label>
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
                    placeholder="e.g. The Stonies"
                  />
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> You'll get an invite code to share
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none uppercase tracking-widest"
                    placeholder="e.g. X8Y2Z1"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={mode === "create" ? !householdName.trim() : !inviteCode.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mode === "create" ? "Create Household" : "Join Household"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
