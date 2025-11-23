"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, DollarSign, Calendar } from "lucide-react";

const Navbar = () => {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Expenses", href: "/expenses", icon: DollarSign },
    // { name: "Calendar", href: "/calendar", icon: Calendar }, // Future feature
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:relative md:border-t-0 md:border-b">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-around md:justify-start md:space-x-8 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col md:flex-row items-center p-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                <Icon className="w-6 h-6 md:w-5 md:h-5 md:mr-2" />
                <span className="text-xs md:text-sm font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
