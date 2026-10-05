"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type Language = "de" | "en";

const STORAGE_KEY = "hb-language";

// Language lives in localStorage and is read through useSyncExternalStore, so
// the server render and first client render agree (German) and the real choice
// is applied right after hydration without an effect-driven setState.
const listeners = new Set<() => void>();
// Remembers the choice even if localStorage is unavailable.
let chosen: Language | null = null;

function detectLanguage(): Language {
  if (chosen) return chosen;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch {
    // Storage can be blocked (private mode) — fall through to the browser language.
  }
  return window.navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

interface I18nValue {
  lang: Language;
  setLang: (lang: Language) => void;
  /** Pick the string for the current language: `t("Tasks", "Aufgaben")`. */
  t: (en: string, de: string) => string;
  /** BCP-47 locale for Intl / toLocale*String. */
  locale: string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribe, detectLanguage, () => "de" as Language);

  const setLang = useCallback((next: Language) => {
    chosen = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisted, but `chosen` keeps it for this session.
    }
    listeners.forEach((cb) => cb());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (en, de) => (lang === "de" ? de : en),
      locale: lang === "de" ? "de-CH" : "en-US",
    }),
    [lang, setLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
