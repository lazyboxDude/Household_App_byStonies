import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "../../../lib/supabaseAdmin";
import { runPush, type PushDeps } from "../../../tasks/routines/pushRun";
import { toOccurrenceRow, toRoutineRow } from "../../../tasks/routines/rowMappers";
import { addDays } from "../../../tasks/routines/schedule";
import { todayIn } from "../../../tasks/routines/pushPlan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Daily reminder sender. Vercel Cron calls it (see vercel.json) with
// `Authorization: Bearer $CRON_SECRET`; nothing else may.
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });

  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = process.env;
  const db = createAdminClient();
  const missing = [
    !publicKey && "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    !privateKey && "VAPID_PRIVATE_KEY",
    !subject && "VAPID_SUBJECT",
    !db && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);
  if (missing.length > 0 || !db || !publicKey || !privateKey || !subject) {
    return NextResponse.json({ error: "Push is not configured", missing }, { status: 503 });
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const today = todayIn("Europe/Zurich");
  const deps: PushDeps = {
    subscriptions: async () => {
      const { data, error } = await db.from("push_subscriptions").select("endpoint, p256dh, auth, user_id");
      if (error) throw new Error(error.message);
      return (data ?? []).map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth, userId: s.user_id }));
    },
    loadData: async (userIds) => {
      const { data: memberships, error: mErr } = await db.from("household_members").select("household_id, user_id").in("user_id", userIds);
      if (mErr) throw new Error(mErr.message);
      const householdIds = [...new Set((memberships ?? []).map((m) => m.household_id))];
      if (householdIds.length === 0) return { routines: [], occurrences: [], membersByHousehold: new Map(), absences: [] };

      const [members, routines, occurrences, absences] = await Promise.all([
        db.from("household_members").select("household_id, user_id").in("household_id", householdIds),
        db.from("routines").select("*").in("household_id", householdIds),
        db
          .from("routine_occurrences")
          .select("*")
          .in("household_id", householdIds)
          .eq("status", "open")
          .is("notified_at", null)
          .gte("due_date", today)
          .lte("due_date", addDays(today, 21)),
        db.from("routine_absences").select("*").in("household_id", householdIds).gte("to_date", today),
      ]);
      for (const r of [members, routines, occurrences, absences]) if (r.error) throw new Error(r.error.message);

      const membersByHousehold = new Map<string, string[]>();
      for (const m of members.data ?? []) membersByHousehold.set(m.household_id, [...(membersByHousehold.get(m.household_id) ?? []), m.user_id]);
      return {
        routines: (routines.data ?? []).map(toRoutineRow),
        occurrences: (occurrences.data ?? []).map(toOccurrenceRow),
        membersByHousehold,
        absences: (absences.data ?? []).map((a) => ({ id: a.id, userId: a.user_id, fromDate: a.from_date, toDate: a.to_date })),
      };
    },
    send: async (sub, payload) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 12 * 60 * 60 });
        return "ok";
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        return status === 404 || status === 410 ? "gone" : "error";
      }
    },
    removeSubscription: async (endpoint) => {
      await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
    },
    markNotified: async (ids, at) => {
      await db.from("routine_occurrences").update({ notified_at: at }).in("id", ids);
    },
  };

  try {
    return NextResponse.json(await runPush(deps));
  } catch (err) {
    console.error("push run failed", err);
    return NextResponse.json({ error: "Push run failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
