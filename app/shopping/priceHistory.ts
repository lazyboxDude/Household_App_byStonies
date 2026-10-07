// Price memory for the shopping list. Pure, so it is testable.
// Every time an item with a price is checked off we log one purchase; from
// those logs we tell what an item "usually" costs and whether it changed.

export interface PriceLogEntry {
  id: string;
  item_key: string;
  item_name: string;
  store: string | null;
  price: number;
  bought_at: string;
}

export type Direction = "up" | "down" | "same" | "new";

export interface PriceTrend {
  key: string;
  name: string;
  store: string | null;
  latest: number;
  /** What it usually cost before the latest purchase; null for a first purchase. */
  usual: number | null;
  /** Latest minus usual, in CHF; null for a first purchase. */
  change: number | null;
  /** Change in percent; null for a first purchase. */
  changePct: number | null;
  direction: Direction;
  boughtAt: string;
  /** Prices oldest to newest, for a sparkline. */
  history: number[];
}

/** How many past purchases count as "usual". Older ones are ignored so inflation does not hide itself. */
const USUAL_WINDOW = 5;
/** Changes below this share of the usual price are noise (rounding, coins). */
const SAME_THRESHOLD = 0.01;

/** Same item typed as "Pasta", " pasta " or "PASTA" gets one key. */
export function itemKey(text: string): string {
  return text.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function byDate(a: PriceLogEntry, b: PriceLogEntry): number {
  return a.bought_at < b.bought_at ? -1 : a.bought_at > b.bought_at ? 1 : 0;
}

/**
 * What this item usually costs: the median of the last few purchases. Prefers
 * purchases at the same store (Migros and Aldi differ on purpose) and falls
 * back to all stores. Null when it was never bought.
 */
export function usualPrice(entries: PriceLogEntry[], key: string, store?: string | null): number | null {
  const mine = entries.filter((e) => e.item_key === key).sort(byDate);
  if (mine.length === 0) return null;
  const sameStore = store ? mine.filter((e) => e.store === store) : [];
  const pool = sameStore.length > 0 ? sameStore : mine;
  return round2(median(pool.slice(-USUAL_WINDOW).map((e) => e.price)));
}

/** The most recent purchase of an item, to suggest where it was bought last. */
export function lastPurchase(entries: PriceLogEntry[], key: string): PriceLogEntry | null {
  const mine = entries.filter((e) => e.item_key === key).sort(byDate);
  return mine.length > 0 ? mine[mine.length - 1] : null;
}

export function classify(latest: number, usual: number | null): Direction {
  if (usual === null) return "new";
  if (usual === 0) return latest === 0 ? "same" : "up";
  const pct = (latest - usual) / usual;
  if (Math.abs(pct) < SAME_THRESHOLD) return "same";
  return pct > 0 ? "up" : "down";
}

/** One trend per item, comparing its latest purchase with what came before. */
export function summarize(entries: PriceLogEntry[]): PriceTrend[] {
  const groups = new Map<string, PriceLogEntry[]>();
  for (const e of entries) {
    const list = groups.get(e.item_key);
    if (list) list.push(e);
    else groups.set(e.item_key, [e]);
  }

  const trends: PriceTrend[] = [];
  for (const [key, list] of groups) {
    const sorted = list.sort(byDate);
    const latest = sorted[sorted.length - 1];
    const before = sorted.slice(0, -1);
    const usual = before.length > 0 ? usualPrice(before, key, latest.store) : null;
    const direction = classify(latest.price, usual);
    const change = usual === null ? null : round2(latest.price - usual);
    trends.push({
      key,
      name: latest.item_name,
      store: latest.store,
      latest: latest.price,
      usual,
      change,
      changePct: usual === null || usual === 0 ? null : Math.round(((latest.price - usual) / usual) * 100),
      direction,
      boughtAt: latest.bought_at,
      history: sorted.slice(-8).map((e) => e.price),
    });
  }

  // Changed items first (the thing worth knowing), then the rest by recency.
  const rank: Record<Direction, number> = { up: 0, down: 1, same: 2, new: 3 };
  return trends.sort((a, b) => rank[a.direction] - rank[b.direction] || (a.boughtAt < b.boughtAt ? 1 : -1));
}

export function formatPrice(n: number): string {
  return n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
