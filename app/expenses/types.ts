export interface Budget {
  id: string;
  category: string;
  amount: number; // monthly budget
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string; // ISO
  category: string;
  note?: string;
}

export interface Pot {
  id: string;
  name: string;
  target: number;
  saved: number;
  ownerUserId: string | null; // null = shared/joint pot, visible to the whole household
}

export interface Debt {
  id: string;
  name: string;
  total: number; // original amount owed
  remaining: number; // current outstanding balance
  monthlyPayment: number; // planned monthly payment
  ownerUserId: string | null; // null = shared/joint debt, visible to the whole household
}

export type AccountId = "main" | "taxes" | "bills" | "joint";

export interface DistSettings {
  taxes: number; // monthly standing order to taxes account
  bills: number; // monthly standing order to bills account
  joint: number; // monthly standing order to joint household account
  minBuffer: number; // minimum buffer to keep on the main account
}

export interface IrregularBill {
  id: string;
  name: string;
  amount: number; // amount per occurrence
  months: number[]; // months (1-12) in which the bill is due
}

export interface DistTransaction {
  id: string;
  group?: string; // groups the transactions created by a single income distribution
  kind: "income" | "transfer" | "expense";
  date: string; // ISO yyyy-mm-dd
  account: AccountId;
  amount: number; // positive = credit, negative = debit
  desc: string;
}

// The Finanzen feature is a single tab bar covering both the Verteilertopf
// (account/income planning) and the Budgets & Ausgaben side.
export type FinanceTab = "uebersicht" | "lohn" | "budgets" | "planer" | "schulden" | "sparziele" | "einstellungen";
