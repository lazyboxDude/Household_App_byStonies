"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import Mascot from "@/components/Mascot";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "../context/LanguageContext";
import Turnstile, { TurnstileHandle } from "../components/Turnstile";

export default function LoginPage() {
  const { login, loginWithGoogle, createHousehold, joinHousehold, user, household } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  // "household" is reached either by explicitly finishing the name step, or
  // by landing back here signed in (e.g. the Google OAuth redirect) without
  // a household yet — derive it instead of syncing it via an effect.
  const [manualStep, setManualStep] = useState<"name" | "household" | null>(null);
  const step: "name" | "household" = manualStep ?? (user && !household ? "household" : "name");

  const [name, setName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [ownershipMode, setOwnershipMode] = useState<"equal" | "owner_led">("equal");
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isHouseholdLoading, setIsHouseholdLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  const turnstileEnabled = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  // Only offer Google once the provider is switched on in Supabase, otherwise
  // the button just ends in a "provider is not enabled" error.
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true";
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (turnstileEnabled && !turnstileToken) return;
    setIsNameLoading(true);
    const ok = await login(name, turnstileToken || undefined);
    setIsNameLoading(false);
    // Turnstile tokens are single-use — reset the widget for the next attempt.
    turnstileRef.current?.reset();
    setTurnstileToken("");
    if (ok) setManualStep("household");
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    await loginWithGoogle();
    setIsGoogleLoading(false);
  };

  const handleHouseholdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    setIsHouseholdLoading(true);
    if (mode === "create" && householdName.trim()) {
      await createHousehold(householdName, ownershipMode);
      setIsHouseholdLoading(false);
      router.push("/");
    } else if (mode === "join" && inviteCode.trim()) {
      const success = await joinHousehold(inviteCode);
      setIsHouseholdLoading(false);
      if (success) router.push("/");
      else setJoinError(t("Invalid invite code.", "Dieser Einladungscode stimmt nicht."));
    } else {
      setIsHouseholdLoading(false);
    }
  };

  // If already fully logged in, redirect
  useEffect(() => {
    if (user && household) router.push("/");
  }, [user, household, router]);

  if (user && household) {
    return null;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, var(--accent-soft), transparent)",
      }}
    >
      <LanguageSwitcher className="absolute top-4 right-4" />
      <div className="surface-raised animate-sheet p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Mascot mood="wave" size={96} className="mx-auto" />
          <h1 className="text-title text-[var(--text)]">{t("Welcome Home", "Willkommen zu Hause")}</h1>
          <p className="text-body text-[var(--text-secondary)] mt-2">
            {t("Manage your household together", "Euren Haushalt gemeinsam organisieren")}
          </p>
        </div>

        {step === "name" ? (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div>
              <label className="block text-caption mb-1.5">{t("What's your name?", "Wie heißt du?")}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field"
                placeholder={t("e.g. Alex", "z. B. Alex")}
                autoFocus
              />
            </div>

            {turnstileEnabled && (
              <div className="flex justify-center">
                <Turnstile ref={turnstileRef} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken("")} />
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || isNameLoading || (turnstileEnabled && !turnstileToken)}
              className="btn btn-primary w-full py-3"
            >
              {isNameLoading ? t("Signing in...", "Anmelden …") : <>{t("Continue", "Weiter")} <ArrowRight className="w-4 h-4" /></>}
            </button>

            {googleEnabled && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t divider" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 bg-[var(--surface)] text-caption">{t("Or continue with", "Oder weiter mit")}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  className="btn btn-secondary w-full py-3"
                >
                  {isGoogleLoading ? (
                    <span className="animate-pulse">{t("Connecting...", "Verbinden …")}</span>
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
              </>
            )}
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
                onClick={() => {
                  setMode("create");
                  setJoinError("");
                }}
                className="relative z-10 press py-2 text-sm font-medium rounded-md text-[var(--text)]"
              >
                {t("Create New Home", "Neues Zuhause")}
              </button>
              <button
                onClick={() => {
                  setMode("join");
                  setJoinError("");
                }}
                className="relative z-10 press py-2 text-sm font-medium rounded-md text-[var(--text)]"
              >
                {t("Join Existing", "Beitreten")}
              </button>
            </div>

            <form onSubmit={handleHouseholdSubmit} className="space-y-4">
              {mode === "create" ? (
                <div>
                  <label className="block text-caption mb-1.5">{t("Household Name", "Name des Haushalts")}</label>
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    className="field"
                    placeholder={t("e.g. The Stonies", "z. B. Familie Stonies")}
                  />
                  <p className="text-caption mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {t("You'll get an invite code to share", "Du bekommst einen Einladungscode zum Teilen")}
                  </p>

                  <label className="block text-caption mb-1.5 mt-4">{t("How do you want to share control?", "Wie wollt ihr Entscheidungen teilen?")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOwnershipMode("equal")}
                      className="press text-left p-3 rounded-[var(--radius-md)] border transition-colors"
                      style={{
                        borderColor: ownershipMode === "equal" ? "var(--accent)" : "var(--border)",
                        background: ownershipMode === "equal" ? "var(--accent-soft)" : "var(--surface-2)",
                      }}
                    >
                      <span className="block text-sm font-medium text-[var(--text)]">{t("Equal", "Gleichberechtigt")}</span>
                      <span className="block text-caption mt-0.5">
                        {t("Everyone decides together — good for couples", "Alle entscheiden gemeinsam – gut für Paare")}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOwnershipMode("owner_led")}
                      className="press text-left p-3 rounded-[var(--radius-md)] border transition-colors"
                      style={{
                        borderColor: ownershipMode === "owner_led" ? "var(--accent)" : "var(--border)",
                        background: ownershipMode === "owner_led" ? "var(--accent-soft)" : "var(--surface-2)",
                      }}
                    >
                      <span className="block text-sm font-medium text-[var(--text)]">{t("Main tenant", "Hauptmieter:in")}</span>
                      <span className="block text-caption mt-0.5">
                        {t("You keep control of settings — good for shared flats", "Du behältst die Einstellungen in der Hand – gut für WGs")}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-caption mb-1.5">{t("Invite Code", "Einladungscode")}</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="field uppercase tracking-widest"
                    placeholder="X8Y2Z1"
                  />
                  {joinError && (
                    <p className="text-caption mt-2" style={{ color: "var(--danger)" }}>
                      {joinError}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={(mode === "create" ? !householdName.trim() : !inviteCode.trim()) || isHouseholdLoading}
                className="btn btn-primary w-full py-3"
              >
                {isHouseholdLoading
                  ? t("Please wait...", "Einen Moment …")
                  : mode === "create"
                  ? t("Create Household", "Haushalt erstellen")
                  : t("Join Household", "Haushalt beitreten")}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
