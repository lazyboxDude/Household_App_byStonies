// Routinen: things that come back on a schedule (Abfuhr, Bad putzen, ...).
// Phase 1: chores and reminders. Phase 2: bills. Weekdays use JS numbering: 0 = Sunday ... 6 = Saturday.

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
}
