// Database row -> domain object, shared by the browser hook and the server-side push sender.
import type { Json } from "../../lib/database.types";
import type { AmountKind, Assignment, Occurrence, OccurrenceStatus, Routine, RoutineKind, RoutineMode, Schedule, Split } from "./types";

export function toRoutine(r: {
  id: string; household_id: string; kind: string; title: string; icon: string; schedule: Json;
  mode: string; active_months: number[] | null; lead_days: number; assignee_id: string | null; show_in_calendar: boolean;
  amount: number | null; amount_kind: string | null; payer_id: string | null; expense_category: string | null;
  assignment: string; rotation: string[] | null; effort: number; split: Json | null;
  room_id: string | null; supplies: string[];
}): Routine {
  return {
    id: r.id,
    householdId: r.household_id,
    kind: r.kind as RoutineKind,
    title: r.title,
    icon: r.icon,
    schedule: r.schedule as unknown as Schedule,
    mode: r.mode as RoutineMode,
    activeMonths: r.active_months,
    leadDays: r.lead_days,
    assigneeId: r.assignee_id,
    showInCalendar: r.show_in_calendar,
    amount: r.amount,
    amountKind: r.amount_kind as AmountKind | null,
    payerId: r.payer_id,
    expenseCategory: r.expense_category,
    assignment: r.assignment as Assignment,
    rotation: r.rotation,
    effort: r.effort as Routine["effort"],
    split: r.split as unknown as Split | null,
    roomId: r.room_id,
    supplies: r.supplies,
  };
}

export function toOccurrence(o: {
  id: string; routine_id: string; due_date: string; status: string;
  assigned_to: string | null; done_by: string | null; done_at: string | null;
  amount: number | null; expense_id: string | null; vt_tx_id: string | null;
  locked: boolean; split: Json | null;
}): Occurrence {
  return {
    id: o.id,
    routineId: o.routine_id,
    dueDate: o.due_date,
    status: o.status as OccurrenceStatus,
    assignedTo: o.assigned_to,
    doneBy: o.done_by,
    doneAt: o.done_at,
    amount: o.amount,
    expenseId: o.expense_id,
    vtTxId: o.vt_tx_id,
    locked: o.locked,
    split: o.split as unknown as Split | null,
  };
}

// Names the server route uses.
export const toRoutineRow = toRoutine;
export function toOccurrenceRow(o: Parameters<typeof toOccurrence>[0] & { notified_at: string | null }) {
  return {
    id: o.id,
    routineId: o.routine_id,
    dueDate: o.due_date,
    assignedTo: o.assigned_to,
    amount: o.amount,
    status: o.status,
    notifiedAt: o.notified_at,
  };
}
