"use client";

import { useI18n, type Language } from "@/app/context/LanguageContext";

const OPTIONS: { value: Language; label: string; name: string }[] = [
  { value: "de", label: "DE", name: "Deutsch" },
  { value: "en", label: "EN", name: "English" },
];

// Small two-way toggle (DE | EN). Works anywhere — sidebar, settings, landing.
export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("Language", "Sprache")}
      className={`inline-flex rounded-full p-0.5 bg-[var(--surface-2)] border border-[var(--border-strong)] ${className}`}
    >
      {OPTIONS.map((o) => {
        const active = lang === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setLang(o.value)}
            aria-pressed={active}
            title={o.name}
            className={`press rounded-full px-3 py-1 text-xs font-bold tracking-wide transition-colors ${
              active
                ? "bg-[var(--accent)] text-[#fffaf0]"
                : "text-[var(--text-secondary)] hover:text-[var(--text)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
