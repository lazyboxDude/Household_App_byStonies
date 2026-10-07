// Splits and "wer schuldet wem". Pure, so it is testable. Amounts are CHF with two decimals.

import type { Split } from "./types.ts";

export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Each member's share of `amount`, to the Rappen. The rounding difference goes to the payer
// (or, if the payer is not part of the split, to the biggest share), so the shares always add up.
export function splitShares(amount: number, split: Split, payer: string): Record<string, number> {
  const ids = Object.keys(split);
  const shares: Record<string, number> = {};
  for (const id of ids) shares[id] = r2((amount * split[id]) / 100);
  const diff = r2(amount - ids.reduce((s, id) => s + shares[id], 0));
  if (diff !== 0 && ids.length > 0) {
    const target = ids.includes(payer) ? payer : ids.reduce((a, b) => (split[b] > split[a] ? b : a));
    shares[target] = r2(shares[target] + diff);
  }
  return shares;
}

export interface PaidBill {
  paidBy: string;
  amount: number;
  split: Split | null;
}

export interface Payback {
  from: string;
  to: string;
  amount: number;
}

// Positive = the others owe this person money. Negative = this person owes the others.
export function netBalances(bills: PaidBill[], paybacks: Payback[]): Record<string, number> {
  const net: Record<string, number> = {};
  const add = (id: string, v: number) => {
    net[id] = r2((net[id] ?? 0) + v);
  };
  for (const b of bills) {
    if (!b.split) continue; // nothing to settle
    const shares = splitShares(b.amount, b.split, b.paidBy);
    for (const [id, share] of Object.entries(shares)) {
      if (id === b.paidBy) continue;
      add(id, -share);
      add(b.paidBy, share);
    }
  }
  for (const p of paybacks) {
    add(p.from, p.amount);
    add(p.to, -p.amount);
  }
  return net;
}

// The fewest "X pays Y" transfers that settle everything (greedy: biggest debtor pays biggest creditor).
export function suggestTransfers(net: Record<string, number>): Payback[] {
  const debtors = Object.entries(net).filter(([, v]) => v < -0.004).map(([id, v]) => ({ id, v: -v }));
  const creditors = Object.entries(net).filter(([, v]) => v > 0.004).map(([id, v]) => ({ id, v }));
  debtors.sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
  creditors.sort((a, b) => b.v - a.v || a.id.localeCompare(b.id));
  const out: Payback[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = r2(Math.min(debtors[i].v, creditors[j].v));
    if (pay > 0) out.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
    debtors[i].v = r2(debtors[i].v - pay);
    creditors[j].v = r2(creditors[j].v - pay);
    if (debtors[i].v <= 0.004) i++;
    if (creditors[j].v <= 0.004) j++;
  }
  return out;
}

// Equal split between members; the remainder (e.g. 33.33 x 3) goes to the first.
export function equalSplit(memberIds: string[]): Split {
  const n = memberIds.length;
  const base = Math.floor((10000 / n)) / 100;
  const split: Split = {};
  memberIds.forEach((id, i) => {
    split[id] = i === 0 ? r2(100 - base * (n - 1)) : base;
  });
  return split;
}

export function splitTotal(split: Record<string, number>): number {
  return r2(Object.values(split).reduce((a, b) => a + b, 0));
}
