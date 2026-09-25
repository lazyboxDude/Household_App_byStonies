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
