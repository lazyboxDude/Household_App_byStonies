export interface Task {
  id: string;
  title: string;
  completed: boolean;
  assignee: string | null;
  created_by: string | null;
  is_shared: boolean;
}

export type Recurrence = "daily" | "weekly" | "biweekly" | "monthly" | "once";

export interface Room {
  id: string;
  name: string;
  icon: string;
}

export interface CleaningTask {
  id: string;
  roomId: string;
  title: string;
  supplies: string[];
  recurrence: Recurrence;
  assignee: string | null;
  lastDone: string | null;
  nextDue: string;
}
