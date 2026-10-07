"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, CheckSquare, DollarSign, ShoppingCart, Settings, LogOut, Calendar } from "lucide-react";
import { useAuth, OptionalFeature } from "@/app/context/AuthContext";
import { useEffect, useRef, useState } from "react";
import Mascot from "@/components/Mascot";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/app/context/LanguageContext";

const NAV_ITEMS: { en: string; de: string; href: string; icon: typeof Home; feature?: OptionalFeature }[] = [
  { en: "Dashboard", de: "Übersicht", href: "/", icon: Home },
  { en: "Tasks", de: "Aufgaben", href: "/tasks", icon: CheckSquare },
  { en: "Shopping", de: "Einkauf", href: "/shopping", icon: ShoppingCart, feature: "shopping" },
  { en: "Finances", de: "Finanzen", href: "/expenses", icon: DollarSign, feature: "expenses" },
  { en: "Calendar", de: "Kalender", href: "/calendar", icon: Calendar, feature: "calendar" },
];

// Settings is not one of the places you go to every day: it sits at the bottom as a gear.
const SETTINGS_HREF = "/settings";

// A page counts as its section too: /expenses/onboarding belongs to Finances.
const isIn = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

interface PillRect {
  x: number;
  y: number;
  w: number;
  h: number;
  ready: boolean;
}

// Main-feature navigation. On desktop this is a persistent left sidebar
// (deep workflows, precise pointer); on mobile it collapses to a bottom tab
// bar (quick, one-thumb reach) — same nav items and animated pill, just a
// different arrangement for the device (skill section 16, "Flexibility").
const Sidebar = () => {
  const pathname = usePathname();
  const { t } = useI18n();
  const { user, household, logout, isAuthenticated } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [pill, setPill] = useState<PillRect>({ x: 0, y: 0, w: 0, h: 0, ready: false });

  // Tasks (+ Dashboard/Settings) is always visible; optional features only
  // show up once a household has switched them on from Settings.
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.feature || !household || household.enabledFeatures.includes(item.feature)
  );

  const settingsActive = isIn(pathname, SETTINGS_HREF);
  // The sliding highlight follows the page you are on, the gear included (on the phone bar).
  const activeHref = settingsActive ? SETTINGS_HREF : visibleNavItems.find((item) => isIn(pathname, item.href))?.href ?? null;

  useEffect(() => {
    const measure = () => {
      const el = activeHref ? itemRefs.current[activeHref] : null;
      const container = containerRef.current;
      if (!el || !container) {
        setPill((p) => (p.ready ? { ...p, ready: false } : p));
        return;
      }
      const er = el.getBoundingClientRect();
      const cr = container.getBoundingClientRect();
      // Hidden at this screen size (the gear on the phone bar, while the sidebar is showing): no highlight.
      if (er.width === 0) {
        setPill((p) => (p.ready ? { ...p, ready: false } : p));
        return;
      }
      setPill({ x: er.left - cr.left, y: er.top - cr.top, w: er.width, h: er.height, ready: true });
    };
    // Measure after layout settles (fonts/icons) and on resize / orientation change.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);

    // Web fonts and icon fonts can swap in after the first paint and shift
    // item positions — a ResizeObserver on the container catches that (and
    // any other late reflow, like the mobile-bar/sidebar breakpoint switch)
    // without polling.
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [activeHref, pathname]);

  // Don't show navigation on the login page or while signed out — after
  // hooks, so hook order stays stable.
  if (pathname === "/login" || !isAuthenticated) return null;

  return (
    <nav
      aria-label={t("Main navigation", "Hauptnavigation")}
      className="material-toolbar navbar-safe-bottom fixed bottom-0 left-0 right-0 border-t z-50
                 md:static md:sticky md:top-0 md:left-auto md:right-auto md:bottom-auto
                 md:h-screen md:w-64 md:shrink-0 md:border-t-0 md:border-r"
    >
      <div className="flex md:flex-col h-16 md:h-full px-4 md:px-3 md:py-6">
        {/* Desktop brand */}
        <div className="hidden md:flex items-center gap-2 px-2 mb-6 shrink-0">
          <Mascot size={40} />
          <span className="text-title text-[var(--text)] whitespace-nowrap" style={{ fontSize: "1.5rem" }}>{t("Our Home Base", "Unsere Home Base")}</span>
        </div>

        <div
          ref={containerRef}
          className="relative flex justify-around w-full items-center md:items-stretch md:flex-1 md:flex-col md:justify-start md:gap-1"
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
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                ref={(el) => {
                  itemRefs.current[item.href] = el;
                }}
                aria-current={isActive ? "page" : undefined}
                className={`relative z-10 press flex flex-1 md:flex-none min-w-0 flex-col md:flex-row items-center gap-0.5 md:gap-3 px-1.5 py-2 md:px-3.5 md:py-2.5 rounded-xl transition-colors duration-300 ${
                  isActive
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                }`}
              >
                <Icon className="w-6 h-6 md:w-5 md:h-5 shrink-0" strokeWidth={isActive ? 2.3 : 1.8} />
                <span className="w-full text-center md:text-left truncate text-[9.5px] leading-tight md:w-auto md:text-sm font-medium">
                  {t(item.en, item.de)}
                </span>
              </Link>
            );
          })}
          {/* Phone bar: the gear closes the row, icon only */}
          <Link
            href={SETTINGS_HREF}
            ref={(el) => {
              itemRefs.current[SETTINGS_HREF] = el;
            }}
            aria-label={t("Settings", "Einstellungen")}
            aria-current={settingsActive ? "page" : undefined}
            title={t("Settings", "Einstellungen")}
            className={`md:hidden relative z-10 press flex shrink-0 w-14 flex-col items-center justify-center py-2 rounded-xl transition-colors duration-300 ${
              settingsActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text)]"
            }`}
          >
            <Settings className="w-6 h-6" strokeWidth={settingsActive ? 2.3 : 1.8} />
          </Link>
        </div>

        {/* Desktop user menu, pinned to the bottom of the sidebar */}
        <div className="hidden md:flex md:flex-col md:gap-3 md:mt-auto md:pt-4 md:border-t divider shrink-0">
          <LanguageSwitcher className="self-start ml-2" />
          {user && (
            <div className="flex items-center gap-3 px-2">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={32}
                  height={32}
                  unoptimized
                  className="w-8 h-8 rounded-full bg-[var(--surface-2)] shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-sm font-medium shrink-0">
                  {user.name?.[0] ?? "U"}
                </div>
              )}
              <span className="text-caption text-[var(--text)] font-medium truncate flex-1">{user.name}</span>
              <Link
                href={SETTINGS_HREF}
                aria-label={t("Settings", "Einstellungen")}
                aria-current={settingsActive ? "page" : undefined}
                title={t("Settings", "Einstellungen")}
                className={`press btn-icon transition-colors shrink-0 ${
                  settingsActive
                    ? "text-[var(--accent)] bg-[var(--accent-soft)]"
                    : "text-[var(--text-tertiary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <Settings className="w-5 h-5" strokeWidth={settingsActive ? 2.3 : 1.8} />
              </Link>
              <button
                type="button"
                onClick={logout}
                className="press btn-icon text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors shrink-0"
                title={t("Log out", "Abmelden")}
                aria-label={t("Log out", "Abmelden")}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
