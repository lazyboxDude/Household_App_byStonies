"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckSquare,
  DollarSign,
  Calendar,
  ShoppingCart,
  Settings,
  Users
} from "lucide-react";

interface StoredTask { completed: boolean; }
interface StoredShoppingItem { completed: boolean; }
interface StoredExpense { amount: number; date: string; }
interface StoredCalendarEvent { date: string; }

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [counts] = useState(() => {
    const tasks = readJSON<StoredTask[]>("tasks", []);
    const items = readJSON<StoredShoppingItem[]>("shopping_items", []);
    const expenses = readJSON<StoredExpense[]>("expenses", []);
    const events = readJSON<StoredCalendarEvent[]>("calendar_events", []);

    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const spentThisMonth = expenses
      .filter((e) => e.date?.startsWith(monthPrefix))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const todayStr = now.toDateString();
    const eventsToday = events.filter((ev) => new Date(ev.date).toDateString() === todayStr).length;

    return {
      tasksPending: tasks.filter((t) => !t.completed).length,
      shoppingItems: items.filter((i) => !i.completed).length,
      eventsToday,
      spentThisMonth,
    };
  });

  const menuItems = [
    {
      title: "Tasks",
      href: "/tasks",
      icon: CheckSquare,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      description: "Manage chores & to-dos",
      count: `${counts.tasksPending} Pending`
    },
    {
      title: "Finances",
      href: "/expenses",
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      description: "Track shared expenses",
      count: `$${counts.spentThisMonth.toFixed(2)} this month`
    },
    {
      title: "Calendar",
      href: "/calendar",
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      description: "Events & planning",
      count: `${counts.eventsToday} Today`
    },
    {
      title: "Shopping",
      href: "/shopping",
      icon: ShoppingCart,
      color: "text-orange-500",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      description: "Groceries & supplies",
      count: `${counts.shoppingItems} Items`
    },
    {
      title: "Household",
      href: "/settings", // Placeholder
      icon: Users,
      color: "text-pink-500",
      bgColor: "bg-pink-100 dark:bg-pink-900/30",
      description: "Members & roles",
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      color: "text-gray-500",
      bgColor: "bg-[var(--surface-3)]",
      description: "App preferences",
    }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-8 text-center md:text-left animate-rise">
        <h1 className="text-display text-[var(--text)]">Welcome Home 🏠</h1>
        <p className="text-body text-[var(--text-secondary)] mt-2">
          What would you like to do today?
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="block animate-rise"
              style={{ "--stagger-i": i } as React.CSSProperties}
            >
              <div className="surface card-interactive press h-full p-6">
                <div
                  className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center mb-4`}
                >
                  <Icon className={`w-6 h-6 ${item.color}`} />
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-headline text-[var(--text)]">
                      {item.title}
                    </h2>
                    <p className="text-caption mt-1">
                      {item.description}
                    </p>
                  </div>
                </div>

                {item.count && (
                  <div className="mt-4 pt-4 border-t divider">
                    <span className="text-micro normal-case font-medium px-2 py-1 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]">
                      {item.count}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
