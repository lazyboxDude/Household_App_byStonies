"use client";

import { CheckCircle2, ListTodo, Users, X } from "lucide-react";

export default function TaskOnboarding({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="surface p-6 mb-6 animate-rise relative">
      <button
        onClick={onDismiss}
        className="press absolute top-4 right-4 text-[var(--text-tertiary)] hover:text-[var(--text)]"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--accent-soft)" }}
        >
          <ListTodo className="w-6 h-6" style={{ color: "var(--accent)" }} />
        </div>
        <div className="flex-1">
          <h2 className="text-headline mb-1">Welcome to Household Tasks</h2>
          <p className="text-body text-[var(--text-secondary)] mb-4">
            We&apos;ve added a few starter tasks below to get you going. Here&apos;s how it works:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
              Add anything that needs doing — chores, errands, one-offs.
            </li>
            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <Users className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
              Everyone in the household sees the same list, live.
            </li>
            <li className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
              <ListTodo className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
              Switch to the Cleaning Plan tab for a recurring rota instead of one-off tasks.
            </li>
          </ul>
          <button onClick={onDismiss} className="btn btn-primary px-5 py-2">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
