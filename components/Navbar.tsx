"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, DollarSign, ShoppingCart, Settings, LogOut, Calendar } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Shopping", href: "/shopping", icon: ShoppingCart },
  { name: "Expenses", href: "/expenses", icon: DollarSign },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface PillRect {
  x: number;
  y: number;
  w: number;
  h: number;
  ready: boolean;
}

const Navbar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pill, setPill] = useState<PillRect>({ x: 0, y: 0, w: 0, h: 0, ready: false });

  const activeHref = NAV_ITEMS.find((item) => item.href === pathname)?.href ?? NAV_ITEMS[0].href;

  useEffect(() => {
    const measure = () => {
      const el = itemRefs.current[activeHref];
      const container = containerRef.current;
      if (!el || !container) return;
      const er = el.getBoundingClientRect();
      const cr = container.getBoundingClientRect();
      setPill({ x: er.left - cr.left, y: er.top - cr.top, w: er.width, h: er.height, ready: true });
    };
    // Measure after layout settles (fonts/icons) and on resize / orientation change.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);

    // Web fonts and icon fonts can swap in after the first paint and shift
    // item positions — a ResizeObserver on the container catches that (and
    // any other late reflow) without polling.
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [activeHref, pathname]);

  // Don't show navbar on login page — after hooks, so hook order stays stable.
  if (pathname === "/login") return null;

  return (
    <nav className="material-toolbar navbar-safe-bottom fixed bottom-0 left-0 right-0 border-t md:sticky md:top-0 md:border-t-0 md:border-b z-50">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          <div
            ref={containerRef}
            className="relative flex justify-around w-full md:w-auto md:justify-start md:gap-1"
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 rounded-xl pointer-events-none"
              style={{
                background: "var(--accent-soft)",
                transform: `translate(${pill.x}px, ${pill.y}px)`,
                width: pill.w,
                height: pill.h,
                opacity: pill.ready ? 1 : 0,
                transition:
                  "transform var(--dur-base) var(--ease-spring), width var(--dur-base) var(--ease-spring), height var(--dur-base) var(--ease-spring), opacity var(--dur-fast) var(--ease-out)",
              }}
            />
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  ref={(el) => {
                    itemRefs.current[item.href] = el;
                  }}
                  className={`relative z-10 press flex flex-1 md:flex-none min-w-0 flex-col md:flex-row items-center gap-0.5 md:gap-2 px-1.5 py-2 md:px-3.5 md:py-2 rounded-xl transition-colors duration-300 ${
                    isActive
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                  }`}
                >
                  <Icon className="w-6 h-6 md:w-5 md:h-5 shrink-0" strokeWidth={isActive ? 2.3 : 1.8} />
                  <span className="w-full text-center truncate text-[9.5px] leading-tight md:w-auto md:text-sm font-medium">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-caption text-[var(--text)] font-medium">{user.name}</span>
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={32}
                    height={32}
                    unoptimized
                    className="w-8 h-8 rounded-full bg-[var(--surface-2)]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-sm font-medium">
                    {user.name?.[0] ?? "U"}
                  </div>
                )}
                <button
                  onClick={logout}
                  className="press btn-icon text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
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
