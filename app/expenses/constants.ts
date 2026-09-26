import { Wallet, PiggyBank, Receipt, Users } from "lucide-react";
import { AccountId } from "./types";

export const ACCOUNTS: { id: AccountId; name: string; role: string; color: string; icon: typeof Wallet }[] = [
  { id: "main", name: "Hauptkonto", role: "Puffer & Taschengeld", color: "#16a34a", icon: Wallet },
  { id: "taxes", name: "Steuern", role: "Dauerauftrag", color: "#7c3aed", icon: PiggyBank },
  { id: "bills", name: "Rechnungen", role: "Jahres- & Halbjahresrechnungen", color: "#2563eb", icon: Receipt },
  { id: "joint", name: "Gemeinsamer Haushalt", role: "Essen & Haushalt", color: "#db2777", icon: Users },
];
export const ACC = Object.fromEntries(ACCOUNTS.map((a) => [a.id, a])) as Record<AccountId, (typeof ACCOUNTS)[number]>;

export const MON = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
export const MS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
