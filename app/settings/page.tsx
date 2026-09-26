"use client";

import { useAuth, OptionalFeature } from "../context/AuthContext";
import { Copy, LogOut, User, Home, Shield, ArrowRight, ShoppingCart, DollarSign, Calendar, Sparkles, type LucideIcon } from "lucide-react";
import Image from 'next/image';
import { useState } from "react";

const FEATURES: { key: OptionalFeature; icon: LucideIcon; title: string; description: string }[] = [
  {
    key: "shopping",
    icon: ShoppingCart,
    title: "Shopping List",
    description: "A shared list your household can add to and check off together.",
  },
  {
    key: "expenses",
    icon: DollarSign,
    title: "Expenses & Budget",
    description: "Private-by-default budgets and expenses, plus shareable savings pots.",
  },
  {
    key: "calendar",
    icon: Calendar,
    title: "Calendar",
    description: "A shared household calendar for events, synced with the cleaning plan.",
  },
];

export default function SettingsPage() {
  const { user, household, logout, login, loginWithGoogle, toggleFeature } = useAuth();
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [isNameLoading, setIsNameLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const copyCode = () => {
    if (household?.inviteCode) {
      navigator.clipboard.writeText(household.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsNameLoading(true);
    await login(name);
    setIsNameLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    await loginWithGoogle();
    setIsGoogleLoading(false);
  };

  if (!user) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-display mb-8 animate-rise">Settings</h1>
        <div className="surface p-8 animate-rise">
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--accent-soft)" }}
            >
              <User className="w-8 h-8" style={{ color: "var(--accent)" }} />
            </div>
            <h2 className="text-title">Sign In</h2>
            <p className="text-body text-[var(--text-secondary)] mt-2">Log in to manage your household</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto">
            <div>
              <label className="block text-caption mb-1.5">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="field"
                placeholder="e.g. Alex"
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim() || isNameLoading}
              className="btn btn-primary w-full py-3"
            >
              {isNameLoading ? "Signing in..." : <>Continue <ArrowRight className="w-4 h-4" /></>}
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
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-display animate-rise">Settings</h1>

      {/* Profile Section */}
      <div className="surface p-6 animate-rise" style={{ "--stagger-i": 1 } as React.CSSProperties}>
        <h2 className="text-headline mb-4 flex items-center gap-2">
          <User className="w-5 h-5" style={{ color: "var(--accent)" }} />
          My Profile
        </h2>
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name}
              width={64}
              height={64}
              unoptimized
              className="w-16 h-16 rounded-full bg-[var(--surface-2)]"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-lg font-medium">
              {user.name?.[0] ?? 'U'}
            </div>
          )}
          <div>
            <p className="text-headline">{user.name}</p>
            <p className="text-caption">Member since Nov 2025</p>
          </div>
        </div>
      </div>

      {/* Household Section */}
      <div className="surface p-6 animate-rise" style={{ "--stagger-i": 2 } as React.CSSProperties}>
        <h2 className="text-headline mb-4 flex items-center gap-2">
          <Home className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Household Management
        </h2>

        {household ? (
          <div className="space-y-6">
            <div>
              <label className="text-caption block mb-1">Household Name</label>
              <p className="text-headline">{household.name}</p>
            </div>

            <div className="surface-2 p-4" style={{ background: "var(--accent-soft)", borderColor: "transparent" }}>
              <label className="text-caption block mb-2" style={{ color: "var(--accent)" }}>
                Invite Code
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[var(--surface)] px-3 py-2 rounded-[var(--radius-sm)] border divider font-mono text-lg tracking-widest text-center">
                  {household.inviteCode}
                </code>
                <button onClick={copyCode} className="btn btn-primary btn-icon" title="Copy Code">
                  {copied ? <Shield className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-caption mt-2" style={{ color: "var(--accent)" }}>
                Share this code with family members to let them join your household.
              </p>
            </div>

            <div>
              <h3 className="text-headline mb-3">Members ({household.members.length})</h3>
              <div className="space-y-1">
                {household.members.map((member) => (
                  <div key={member.id} className="press flex items-center justify-between p-2 rounded-[var(--radius-md)] hover:bg-[var(--surface-2)]">
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <Image src={member.avatar} alt={member.name} width={32} height={32} unoptimized className="w-8 h-8 rounded-full bg-[var(--surface-2)]" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-sm font-medium">{member.name?.[0] ?? 'U'}</div>
                      )}
                      <span className="text-body">{member.name}</span>
                    </div>
                    {member.id === user.id && (
                      <span className="text-micro normal-case px-2 py-1 rounded-full bg-[var(--surface-2)]">You</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-body text-[var(--text-secondary)]">
            You are not part of a household yet.
          </div>
        )}
      </div>

      {/* Features Section */}
      {household && (
        <div className="surface p-6 animate-rise" style={{ "--stagger-i": 3 } as React.CSSProperties}>
          <h2 className="text-headline mb-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Features
          </h2>
          <p className="text-caption mb-4">
            Tasks is always on. Turn on the others as your household needs them.
          </p>
          <div className="space-y-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isOn = household.enabledFeatures.includes(feature.key);
              return (
                <div key={feature.key} className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: "var(--text-secondary)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{feature.title}</p>
                    <p className="text-caption">{feature.description}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={isOn}
                    aria-label={`Toggle ${feature.title}`}
                    onClick={() => toggleFeature(feature.key, !isOn)}
                    className="press relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0"
                    style={{ background: isOn ? "var(--accent)" : "var(--surface-3)" }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300"
                      style={{ transform: isOn ? "translateX(20px)" : "translateX(0)" }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={logout}
        className="btn btn-danger w-full py-3 animate-rise"
        style={{ "--stagger-i": 4 } as React.CSSProperties}
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  );
}
