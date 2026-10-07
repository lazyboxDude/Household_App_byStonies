// Language helpers for the pure Routinen modules. No React in here, so `node --test` can load them.
// Components get the language from useI18n() and hand it to these functions as a plain argument.

import type { Language } from "../../context/LanguageContext";

export type Lang = Language;
export type Bilingual = { en: string; de: string };

// BCP-47 locale for Intl / toLocale*String, same mapping as LanguageContext.
export function localeOf(lang: Lang): string {
  return lang === "de" ? "de-CH" : "en-US";
}

export function pick(text: Bilingual, lang: Lang): string {
  return text[lang];
}

/** "2nd", "3rd", "21st" ... */
export function ordinalEn(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export const WEEKDAYS_SHORT: Record<Lang, string[]> = {
  de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

export const WEEKDAYS_LONG: Record<Lang, string[]> = {
  de: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
};

export const MONTHS_SHORT: Record<Lang, string[]> = {
  de: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
