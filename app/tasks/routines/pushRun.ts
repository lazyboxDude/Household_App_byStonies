// One run of the daily reminder sender, with everything outside the world passed in so it can
// be tested: loading data, sending, marking. The API route only wires the real ones.

import { planPushMessages, todayIn, type PushOccurrence } from "./pushPlan.ts";
import type { Absence, Routine } from "./types.ts";

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId: string;
}

export interface PushData {
  routines: Routine[];
  occurrences: PushOccurrence[];
  membersByHousehold: Map<string, string[]>;
  absences: Absence[];
}

export type SendResult = "ok" | "gone" | "error";

export interface PushDeps {
  subscriptions: () => Promise<PushSubscriptionRow[]>;
  loadData: (userIds: string[]) => Promise<PushData>;
  send: (sub: PushSubscriptionRow, payload: string) => Promise<SendResult>;
  removeSubscription: (endpoint: string) => Promise<void>;
  markNotified: (occurrenceIds: string[], at: string) => Promise<void>;
}

export interface PushSummary {
  today: string;
  messages: number;
  delivered: number;
  removed: number;
  failed: number;
}

export async function runPush(deps: PushDeps, now = new Date(), timeZone = "Europe/Zurich"): Promise<PushSummary> {
  const today = todayIn(timeZone, now);
  const summary: PushSummary = { today, messages: 0, delivered: 0, removed: 0, failed: 0 };
  const subs = await deps.subscriptions();
  if (subs.length === 0) return summary;

  const userIds = [...new Set(subs.map((s) => s.userId))];
  const data = await deps.loadData(userIds);
  // Only people who have a device are messaged; everyone else in the household is left out.
  const messages = planPushMessages(data.routines, data.occurrences, data.membersByHousehold, data.absences, today)
    .filter((m) => userIds.includes(m.userId));
  summary.messages = messages.length;

  for (const message of messages) {
    const payload = JSON.stringify({ title: message.title, body: message.body, url: message.url, tag: `routinen-${today}` });
    let delivered = 0;
    for (const sub of subs.filter((s) => s.userId === message.userId)) {
      const result = await deps.send(sub, payload);
      if (result === "ok") delivered++;
      else if (result === "gone") {
        await deps.removeSubscription(sub.endpoint);
        summary.removed++;
      } else summary.failed++;
    }
    summary.delivered += delivered;
    // Only count it as announced when at least one device got it; otherwise tomorrow's run tries again.
    if (delivered > 0) await deps.markNotified(message.occurrenceIds, now.toISOString());
  }
  return summary;
}
