// Routinen: things that come back on a schedule (Abfuhr, Bad putzen, ...).
// Phase 1: chores and reminders. Phase 2: bills. Phase 3: who does it, fairness, splits. Weekdays use JS numbering: 0 = Sunday ... 6 = Saturday.

export type RoutineKind = "chore" | "reminder" | "bill";

export type IntervalUnit = "day" | "week" | "month" | "year";

export type Schedule =
  | { type: "interval"; every: number; unit: IntervalUnit; anchor: string }
  | { type: "weekday"; weekdays: number[]; everyNWeeks?: number; anchor?: string }
  | { type: "monthday"; day: number | "last"; months?: number[] }
  | { type: "nth_weekday"; nth: 1 | 2 | 3 | 4 | -1; weekday: number; months?: number[] }
  | { type: "dates"; dates: string[] };

// "fixed": the calendar decides (Abfuhr). "after_done": the next one counts from
// when it was actually done (Bad putzen). after_done only works with "interval".
export type RoutineMode = "fixed" | "after_done";

// fixed: Miete. estimate: Strom-Abschlag (corrected once the real amount is known).
// variable: entered when paid.
export type AmountKind = "fixed" | "estimate" | "variable";

// open: whoever has time. fixed: assigneeId. rotation: round-robin through `rotation`.
// fair_share: whoever has carried the least effort lately.
export type Assignment = "open" | "fixed" | "rotation" | "fair_share";

// user id -> percent, sums to 100
export type Split = Record<string, number>;

export type LivingMode = "couple" | "wg";

export interface Routine {
  id: string;
  householdId: string;
  kind: RoutineKind;
  title: string;
  icon: string;
  schedule: Schedule;
  mode: RoutineMode;
  activeMonths: number[] | null; // 1-12, null = all year
  leadDays: number; // heads-up N days before the due date
  assigneeId: string | null;
  showInCalendar: boolean;
  // Bills only (null otherwise). Amount in CHF per due date.
  amount: number | null;
  amountKind: AmountKind | null;
  payerId: string | null;
  expenseCategory: string | null;
  // Who does it (chores and reminders)
  assignment: Assignment;
  rotation: string[] | null; // user ids in turn order
  effort: 1 | 2 | 3 | 5; // how heavy it feels; the Fairness-Waage adds these up
  // Bills: how the cost is divided between members. null = nothing to settle.
  split: Split | null;
  // Taken over from the Cleaning Plan
  roomId: string | null;
  supplies: string[];
}

export type OccurrenceStatus = "open" | "done" | "skipped";

export interface Occurrence {
  id: string;
  routineId: string;
  dueDate: string; // yyyy-mm-dd
  status: OccurrenceStatus;
  assignedTo: string | null;
  doneBy: string | null;
  doneAt: string | null;
  // Bills: what was actually paid and the bookings that created.
  amount: number | null;
  expenseId: string | null;
  vtTxId: string | null;
  locked: boolean; // swapped by hand: rotation changes leave it alone
  split: Split | null; // copy of the routine's split when it was paid
}

export interface Absence {
  id: string;
  userId: string;
  fromDate: string;
  toDate: string;
}

export interface Settlement {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  createdAt: string;
}

export interface RoutineSettings {
  livingMode: LivingMode | null; // null = by member count
  fairnessWeights: Record<string, number> | null; // user id -> target share in percent
}
