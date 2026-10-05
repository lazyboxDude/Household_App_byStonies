"use client";

import { useEffect, useState } from "react";
import { Calendar, Copy, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { showToast } from "../../../lib/toast";

// Subscription link for the household calendar (ICS feed). Anyone holding the
// link can read the calendar, so members can reset it to invalidate the old one.
export default function CalendarFeedCard({ householdId }: { householdId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("households")
      .select("calendar_feed_token")
      .eq("id", householdId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) setLoadFailed(true);
        else setToken(data.calendar_feed_token);
      });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  // The token only exists after a client-side fetch, so `window` is always defined here.
  const feedUrl = token ? `${window.location.origin}/api/calendar/feed/${token}.ics` : null;
  const webcalUrl = feedUrl?.replace(/^https?:/, "webcal:") ?? null;

  const copyLink = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      showToast("Link copied", "success");
    } catch {
      showToast("Could not copy — select the link and copy it manually", "error");
    }
  };

  const resetLink = async () => {
    if (!window.confirm("Reset the link? Calendars subscribed to the old link will stop updating until you add the new one.")) return;
    setIsResetting(true);
    const { data, error } = await supabase.rpc("rotate_calendar_feed_token", { p_household_id: householdId });
    setIsResetting(false);
    if (error || !data) {
      showToast("Could not reset the link. Please try again.", "error");
      return;
    }
    setToken(data);
    showToast("New link created", "success");
  };

  return (
    <div className="surface p-6 animate-rise" style={{ "--stagger-i": 4 } as React.CSSProperties}>
      <h2 className="text-headline mb-1 flex items-center gap-2">
        <Calendar className="w-5 h-5" style={{ color: "var(--accent)" }} />
        Calendar link
      </h2>
      <p className="text-caption mb-4">
        Subscribe to your household calendar in Google Calendar, Apple Calendar or Outlook. Changes in the
        app show up there automatically (Google can take a few hours to refresh).
      </p>

      {loadFailed ? (
        <p className="text-caption" style={{ color: "var(--danger)" }}>
          Could not load the calendar link. Please reload the page.
        </p>
      ) : !feedUrl ? (
        <div className="h-10 rounded-[var(--radius-md)] animate-pulse" style={{ background: "var(--surface-2)" }} />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              readOnly
              value={feedUrl}
              aria-label="Calendar subscription link"
              onFocus={(e) => e.currentTarget.select()}
              className="field flex-1 min-w-0 text-xs"
            />
            <button onClick={copyLink} className="btn press px-3" aria-label="Copy link">
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl!)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary text-sm"
            >
              Add to Google Calendar
            </a>
            <a href={webcalUrl!} className="btn text-sm">
              Apple / Outlook
            </a>
            <button onClick={resetLink} disabled={isResetting} className="btn text-sm ml-auto">
              <RefreshCw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
              Reset link
            </button>
          </div>

          <p className="text-caption">
            Keep this link private — anyone who has it can see your calendar. In Google Calendar you can also
            use “Other calendars → From URL” and paste the link. The buttons only work from the deployed app,
            not from localhost.
          </p>
        </div>
      )}
    </div>
  );
}
