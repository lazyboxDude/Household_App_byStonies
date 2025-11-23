"use client";

import Link from "next/link";
import Image from 'next/image';
import { usePathname } from "next/navigation";
import { Home, CheckSquare, DollarSign, ShoppingCart, Settings, LogOut, Calendar } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

const Navbar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Don't show navbar on login page
  if (pathname === "/login") return null;

  const navItems = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Tasks", href: "/tasks", icon: CheckSquare },
    { name: "Shopping", href: "/shopping", icon: ShoppingCart },
    { name: "Expenses", href: "/expenses", icon: DollarSign },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:relative md:border-t-0 md:border-b z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          <div className="flex justify-around w-full md:w-auto md:justify-start md:space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col md:flex-row items-center p-2 rounded-lg transition-colors ${
                    isActive
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400"
                  }`}
                >
                  <Icon className="w-6 h-6 md:w-5 md:h-5 md:mr-2" />
                  <span className="text-xs md:text-sm font-medium hidden md:block">{item.name}</span>
                  {/* Mobile label */}
                  <span className="text-[10px] md:hidden mt-1">{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user.name}
                </span>
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={32}
                  height={32}
                  unoptimized
                  className="w-8 h-8 rounded-full bg-gray-100"
                />
                <button 
                  onClick={logout}
                  className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
