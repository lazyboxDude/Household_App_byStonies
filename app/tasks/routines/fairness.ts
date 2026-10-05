// The Fairness-Waage: who carried how much effort recently. A calm picture, not a scoreboard:
// no points, no ranking, just "share of effort" next to "share we agreed on".

import type { Occurrence, Routine } from "./types.ts";

export interface FairnessRow {
  userId: string;
  effort: number;
  share: number; // percent of all effort, 0-100
  target: number; // percent
  delta: number; // share - target
}

export interface Fairness {
  rows: FairnessRow[];
  total: number;
  balanced: boolean; // nobody is more than 10 points off their target
  mostLoaded: string | null; // only set when not balanced
}

export const BALANCE_TOLERANCE = 10;

// Target shares: the given weights normalised over the members, or everyone equal.
export function targetShares(members: string[], weights: Record<string, number> | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (members.length === 0) return out;
  const raw = members.map((m) => Math.max(0, weights?.[m] ?? 0));
  const sum = raw.reduce((a, b) => a + b, 0);
  members.forEach((m, i) => {
    out[m] = sum > 0 ? (raw[i] / sum) * 100 : 100 / members.length;
  });
  return out;
}

// `done` = occurrences completed in the period (the caller picks the last 30 days).
// Bills do not count: paying is not chore effort.
export function fairness(
  done: Occurrence[],
  routines: Routine[],
  members: string[],
  weights: Record<string, number> | null
): Fairness {
  const byId = new Map(routines.map((r) => [r.id, r]));
  const effort: Record<string, number> = Object.fromEntries(members.map((m) => [m, 0]));
  for (const o of done) {
    if (o.status !== "done" || !o.doneBy || !(o.doneBy in effort)) continue;
    const r = byId.get(o.routineId);
    if (!r || r.kind === "bill") continue;
    effort[o.doneBy] += r.effort;
  }
  const total = Object.values(effort).reduce((a, b) => a + b, 0);
  const targets = targetShares(members, weights);
  const rows: FairnessRow[] = members.map((m) => {
    const share = total > 0 ? (effort[m] / total) * 100 : targets[m];
    return { userId: m, effort: effort[m], share, target: targets[m], delta: share - targets[m] };
  });
  const worst = rows.reduce<FairnessRow | null>((a, r) => (a === null || r.delta > a.delta ? r : a), null);
  const balanced = total === 0 || rows.every((r) => Math.abs(r.delta) <= BALANCE_TOLERANCE);
  return { rows, total, balanced, mostLoaded: balanced || !worst ? null : worst.userId };
}

// Effort per member, for "fair share" picks: done work plus what is already planned.
export function loadsFrom(done: Occurrence[], routines: Routine[], members: string[]): Record<string, number> {
  const byId = new Map(routines.map((r) => [r.id, r]));
  const loads: Record<string, number> = Object.fromEntries(members.map((m) => [m, 0]));
  for (const o of done) {
    if (o.status !== "done" || !o.doneBy || !(o.doneBy in loads)) continue;
    const r = byId.get(o.routineId);
    if (r && r.kind !== "bill") loads[o.doneBy] += r.effort;
  }
  return loads;
}
