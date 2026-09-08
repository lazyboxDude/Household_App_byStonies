// Mirrors a cleaning task's next due date into the shared `calendar_events`
// localStorage list (read by app/calendar/page.tsx) so recurring cleaning
// tasks show up on the household calendar without duplicating storage.

export function calendarEventIdForCleaningTask(taskId: string) {
  return `cleaning-${taskId}`;
}

interface RawCalendarEvent {
  id: string;
  [key: string]: unknown;
}

export function upsertCleaningCalendarEvent(params: {
  taskId: string;
  title: string;
  date: string; // ISO date
}) {
  try {
    const raw = localStorage.getItem("calendar_events");
    const list: RawCalendarEvent[] = raw ? JSON.parse(raw) : [];
    const id = calendarEventIdForCleaningTask(params.taskId);
    const event: RawCalendarEvent = {
      id,
      title: `🧹 ${params.title}`,
      date: params.date,
      time: "09:00",
      type: "task",
    };

    const idx = list.findIndex((e) => e.id === id);
    if (idx >= 0) list[idx] = event;
    else list.push(event);

    localStorage.setItem("calendar_events", JSON.stringify(list));
  } catch (err) {
    console.error("Failed to sync cleaning task to calendar", err);
  }
}

export function removeCleaningCalendarEvent(taskId: string) {
  try {
    const raw = localStorage.getItem("calendar_events");
    if (!raw) return;
    const list: RawCalendarEvent[] = JSON.parse(raw);
    const id = calendarEventIdForCleaningTask(taskId);
    localStorage.setItem("calendar_events", JSON.stringify(list.filter((e) => e.id !== id)));
  } catch (err) {
    console.error("Failed to remove cleaning task from calendar", err);
  }
}
