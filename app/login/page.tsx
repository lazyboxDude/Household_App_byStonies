"use client";

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { Home, ArrowRight, Sparkles } from "lucide-react";

export default function LoginPage() {
  const { login, loginWithGoogle, createHousehold, joinHousehold, user, household } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<"name" | "household">("name");
  const [name, setName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      login(name);
      setStep("household");
    }
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    // Simulate network delay
    setTimeout(() => {
      loginWithGoogle();
      setIsGoogleLoading(false);
      setStep("household");
    }, 1000);
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
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, var(--accent-soft), transparent), var(--bg)",
      }}
    >
      <div className="surface-raised animate-sheet p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--accent-soft)" }}
          >
            <Home className="w-8 h-8" style={{ color: "var(--accent)" }} />
          </div>
          <h1 className="text-title text-[var(--text)]">Welcome Home</h1>
          <p className="text-body text-[var(--text-secondary)] mt-2">
            Manage your household together
          </p>
        </div>

        {step === "name" ? (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label className="block text-caption mb-1.5">What&apos;s your name?</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field"
                placeholder="e.g. Alex"
                autoFocus
              />
            </div>
            <button type="submit" disabled={!name.trim()} className="btn btn-primary w-full py-3">
              Continue <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t divider" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 bg-[var(--surface)] text-caption">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="btn btn-secondary w-full py-3"
            >
              {isGoogleLoading ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-rise">
            <div className="relative grid grid-cols-2 rounded-[var(--radius-md)] p-1 bg-[var(--surface-2)]">
              <span
                aria-hidden
                className="absolute inset-y-1 w-[calc(50%-4px)] rounded-[calc(var(--radius-md)-2px)] bg-[var(--surface)] shadow-sm transition-transform"
                style={{
                  transform: mode === "join" ? "translateX(calc(100% + 8px))" : "translateX(0)",
                  transitionTimingFunction: "var(--ease-spring)",
                  transitionDuration: "var(--dur-base)",
                }}
              />
              <button
                onClick={() => setMode("create")}
                className="relative z-10 press py-2 text-sm font-medium rounded-md text-[var(--text)]"
              >
                Create New Home
              </button>
              <button
                onClick={() => setMode("join")}
                className="relative z-10 press py-2 text-sm font-medium rounded-md text-[var(--text)]"
              >
                Join Existing
              </button>
            </div>

            <form onSubmit={handleHouseholdSubmit} className="space-y-4">
              {mode === "create" ? (
                <div>
                  <label className="block text-caption mb-1.5">Household Name</label>
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    className="field"
                    placeholder="e.g. The Stonies"
                  />
                  <p className="text-caption mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> You&apos;ll get an invite code to share
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-caption mb-1.5">Invite Code</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="field uppercase tracking-widest"
                    placeholder="e.g. X8Y2Z1"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={mode === "create" ? !householdName.trim() : !inviteCode.trim()}
                className="btn btn-primary w-full py-3"
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
