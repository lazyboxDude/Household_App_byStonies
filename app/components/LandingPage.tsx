"use client";

import Link from "next/link";
import { Home, CheckSquare, ShoppingCart, DollarSign, Calendar, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: CheckSquare,
    title: "Tasks",
    description: "Split chores fairly and keep track of what's done.",
  },
  {
    icon: ShoppingCart,
    title: "Shopping",
    description: "One shared list, no more duplicate trips to the store.",
  },
  {
    icon: DollarSign,
    title: "Finanzen",
    description: "Track shared expenses, budgets, and who owes what.",
  },
  {
    icon: Calendar,
    title: "Calendar",
    description: "See every household event in one shared place.",
  },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, var(--accent-soft), transparent), var(--bg)",
      }}
    >
      <div className="w-full max-w-4xl text-center pt-20 pb-10 animate-rise">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--accent-soft)" }}
        >
          <Home className="w-8 h-8" style={{ color: "var(--accent)" }} />
        </div>
        <h1 className="text-display text-[var(--text)]">Our Home Base</h1>
        <p className="text-body text-[var(--text-secondary)] mt-3 max-w-md mx-auto">
          The shared home for your household — tasks, shopping, finances, and calendar, all in one place.
        </p>
        <Link href="/login" className="btn btn-primary inline-flex mt-8 px-6 py-3">
          Get started <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div
        className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 pb-20 animate-rise"
        style={{ "--stagger-i": 1 } as React.CSSProperties}
      >
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="surface p-5 text-left">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center mb-3"
                style={{ background: "var(--accent-soft)" }}
              >
                <Icon className="w-4 h-4" style={{ color: "var(--accent)" }} />
              </div>
              <h2 className="text-headline">{f.title}</h2>
              <p className="text-caption mt-1 normal-case">{f.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
