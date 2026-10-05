import { Wallet, PiggyBank, Receipt, Users } from "lucide-react";
import { AccountId } from "./types";
import type { Language } from "../context/LanguageContext";

type Bi = { de: string; en: string };

export const ACCOUNTS: { id: AccountId; name: Bi; role: Bi; color: string; icon: typeof Wallet }[] = [
  { id: "main", name: { de: "Hauptkonto", en: "Main account" }, role: { de: "Puffer & Taschengeld", en: "Buffer & pocket money" }, color: "#16a34a", icon: Wallet },
  { id: "taxes", name: { de: "Steuern", en: "Taxes" }, role: { de: "Dauerauftrag", en: "Standing order" }, color: "#7c3aed", icon: PiggyBank },
  { id: "bills", name: { de: "Rechnungen", en: "Bills" }, role: { de: "Jahres- & Halbjahresrechnungen", en: "Annual & semi-annual bills" }, color: "#2563eb", icon: Receipt },
  { id: "joint", name: { de: "Gemeinsamer Haushalt", en: "Shared household" }, role: { de: "Essen & Haushalt", en: "Food & household" }, color: "#db2777", icon: Users },
];
export const ACC = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a])) as Record<AccountId, (typeof ACCOUNTS)[number]>;

const MONTHS: Record<Language, string[]> = {
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const MONTHS_SHORT: Record<Language, string[]> = {
  de: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

/** Full month names, indexed 0–11. */
export const monthNames = (lang: Language) => MONTHS[lang];
/** Short month names, indexed 0–11. */
export const monthShort = (lang: Language) => MONTHS_SHORT[lang];
