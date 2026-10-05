// Shared formatting/id helpers for the Finanzen feature (Budgets, Verteilertopf, Sparziele).
export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function r2(n: number) {
  return Math.round(n * 100) / 100;
}

export function fmt(n: number) {
  const v = r2(n);
  return v.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function chf(n: number, sign = false) {
  return (sign && n > 0 ? "+" : "") + fmt(n) + " CHF";
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fdate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// Categories and similar labels are stored as plain text. A few well-known
// ones are written by the app itself (in German or English, depending on the
// language at the time) — show those in the current language; anything a
// person typed stays exactly as they wrote it.
const KNOWN_LABELS: { de: string; en: string }[] = [
  { de: "Sonstiges", en: "Other" },
  { de: "Lebensmittel", en: "Groceries" },
  { de: "Essen", en: "Food" },
  { de: "Auswärts essen", en: "Eating Out" },
  { de: "Online", en: "Online" },
  { de: "Nicht kategorisiert", en: "Uncategorized" },
];

export function localizeLabel(value: string, lang: "de" | "en"): string {
  const match = KNOWN_LABELS.find((k) => k.de === value || k.en === value);
  return match ? match[lang] : value;
}

export function curYM() {
  return todayIso().slice(0, 7);
}
