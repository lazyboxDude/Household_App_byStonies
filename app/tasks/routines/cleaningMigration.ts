// Turns a Cleaning Plan task into a routine. Pure, so it is testable.
//
// The Cleaning Plan is "after done": the next round counts from when it was done. That is exactly
// a Routinen "after done" interval, and "monthly" becomes a real calendar month instead of 30 days.

import type { Assignment, RoutineMode, Schedule } from "./types.ts";

export type CleaningRecurrence = "daily" | "weekly" | "biweekly" | "monthly" | "once";

export interface CleaningTaskRow {
  id: string;
  roomId: string;
  title: string;
  supplies: string[];
  recurrence: CleaningRecurrence;
  assignee: string | null; // free text
  nextDue: string; // yyyy-mm-dd
}

export interface CleaningRoom {
  name: string;
  icon: string;
}

export interface CleaningRoutinePlan {
  title: string;
  icon: string;
  schedule: Schedule;
  mode: RoutineMode;
  assignment: Assignment;
  assigneeId: string | null;
  roomId: string;
  supplies: string[];
  // The routine's first occurrence keeps the task's own due date, so an overdue task stays overdue.
  firstDue: string;
}

export function planCleaningMigration(
  task: CleaningTaskRow,
  room: CleaningRoom | undefined,
  members: { id: string; name: string }[]
): CleaningRoutinePlan {
  const anchor = task.nextDue;
  let schedule: Schedule;
  let mode: RoutineMode = "after_done";
  switch (task.recurrence) {
    case "daily":
      schedule = { type: "interval", every: 1, unit: "day", anchor };
      break;
    case "weekly":
      schedule = { type: "interval", every: 1, unit: "week", anchor };
      break;
    case "biweekly":
      schedule = { type: "interval", every: 2, unit: "week", anchor };
      break;
    case "monthly":
      schedule = { type: "interval", every: 1, unit: "month", anchor };
      break;
    default:
      // "once": a single date, done when it is done
      schedule = { type: "dates", dates: [anchor] };
      mode = "fixed";
  }

  // The old assignee was free text; it only carries over when it clearly names a member.
  const wanted = task.assignee?.trim().toLowerCase();
  const match = wanted ? members.find((m) => m.name.trim().toLowerCase() === wanted) : undefined;

  return {
    // The room is a link of its own now (and a stored room name may be the English preset),
    // so the title stays exactly what the person wrote.
    title: task.title,
    icon: room?.icon ?? "🧹",
    schedule,
    mode,
    assignment: match ? "fixed" : "open",
    assigneeId: match?.id ?? null,
    roomId: task.roomId,
    supplies: task.supplies,
    firstDue: anchor,
  };
}
