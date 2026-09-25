// Mirrors a cleaning task's next due date into the shared `calendar_events`
// table (read by app/calendar/page.tsx) via `source_cleaning_task_id`, so
// recurring cleaning tasks show up on the household calendar. Deleting the
// cleaning task (or its room) cascades to remove the linked event in the
// database — no explicit "remove" call is needed from here.

import { supabase } from "../lib/supabase";

export async function upsertCleaningCalendarEvent(params: {
  householdId: string;
  taskId: string;
  title: string;
  date: string; // ISO date, yyyy-mm-dd
}) {
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("id")
    .eq("household_id", params.householdId)
    .eq("source_cleaning_task_id", params.taskId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("calendar_events")
      .update({ title: `🧹 ${params.title}`, date: params.date, time: "09:00", type: "task" })
      .eq("id", existing.id);
  } else {
    await supabase.from("calendar_events").insert({
      household_id: params.householdId,
      source_cleaning_task_id: params.taskId,
      title: `🧹 ${params.title}`,
      date: params.date,
      time: "09:00",
      type: "task",
    });
  }
}
