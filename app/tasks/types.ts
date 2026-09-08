export interface Task {
  id: string;
  title: string;
  points: number;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
}

export interface UserStats {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalTasksCompleted: number;
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
  assignee?: string;
  lastDone?: string;
  nextDue: string;
}
