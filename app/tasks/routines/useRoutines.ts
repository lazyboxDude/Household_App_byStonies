"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Json } from "../../lib/database.types";
import { showToast } from "../../../lib/toast";
import { chf } from "../../expenses/format";
import { missingOccurrences } from "./ensure";
import { nextAfterDone, todayLocalISO } from "./schedule";
import type { AmountKind, Occurrence, OccurrenceStatus, Routine, RoutineKind, RoutineMode, Schedule } from "./types";

const ERROR_TEXT = "Das hat gerade nicht geklappt. Magst du es nochmal versuchen?";
const UNDO_WINDOW_MS = 8000;

export interface NewRoutine {
  kind: RoutineKind;
  title: string;
  icon: string;
  schedule: Schedule;
  mode: RoutineMode;
  activeMonths: number[] | null;
  leadDays: number;
  assigneeId: string | null;
  showInCalendar: boolean;
  amount: number | null;
  amountKind: AmountKind | null;
  payerId: string | null;
  expenseCategory: string | null;
}

// Where a paid bill is booked. All optional: paying only closes the bill.
export interface PayInput {
  amount: number;
  bookExpense: boolean; // as an expense of the person paying
  account: "bills" | "joint" | "main" | "taxes" | null; // Verteilertopf account to debit
  keepAmount: boolean; // use this amount for the next due dates
}

export interface Features {
  calendarEnabled: boolean;
  expensesEnabled: boolean;
}

export interface UndoableAction {
  label: string;
  undo: () => Promise<void>;
}

export function toRoutine(r: {
  id: string; household_id: string; kind: string; title: string; icon: string; schedule: Json;
  mode: string; active_months: number[] | null; lead_days: number; assignee_id: string | null; show_in_calendar: boolean;
  amount: number | null; amount_kind: string | null; payer_id: string | null; expense_category: string | null;
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
  };
}

function toOccurrence(o: {
  id: string; routine_id: string; due_date: string; status: string;
  assigned_to: string | null; done_by: string | null; done_at: string | null;
  amount: number | null; expense_id: string | null; vt_tx_id: string | null;
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
  };
}

// Loads a household's routines and their occurrences, fills the next ~8 weeks,
// and mirrors open occurrences into the calendar when that feature is on.
export function useRoutines(householdId: string | undefined, userId: string | undefined, features: Features) {
  const { calendarEnabled, expensesEnabled } = features;
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [undoable, setUndoable] = useState<UndoableAction | null>(null);
  // Whether this household uses the Verteilertopf, so the pay panel can offer to debit an account.
  const [hasVerteilertopf, setHasVerteilertopf] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = todayLocalISO();

  const fetchAll = useCallback(async () => {
    if (!householdId) return null;
    const [r, o] = await Promise.all([
      supabase.from("routines").select("*").eq("household_id", householdId).order("created_at", { ascending: true }),
      // Everything still open (waiting chores) plus everything from today on.
      supabase
        .from("routine_occurrences")
        .select("*")
        .eq("household_id", householdId)
        .or(`status.eq.open,due_date.gte.${todayLocalISO()}`)
        .order("due_date", { ascending: true }),
    ]);
    if (r.error || o.error) return null;
    return { routines: (r.data ?? []).map(toRoutine), occurrences: (o.data ?? []).map(toOccurrence) };
  }, [householdId]);

  const syncCalendar = useCallback(
    async (rs: Routine[], occs: Occurrence[]) => {
      if (!householdId || !calendarEnabled) return;
      const day = todayLocalISO();
      const { data: events } = await supabase
        .from("calendar_events")
        .select("source_occurrence_id")
        .eq("household_id", householdId)
        .not("source_occurrence_id", "is", null)
        .gte("date", day);
      const have = new Set((events ?? []).map((e) => e.source_occurrence_id));
      const byId = new Map(rs.map((r) => [r.id, r]));
      const rows = occs
        .filter((o) => o.status === "open" && o.dueDate >= day && !have.has(o.id))
        .flatMap((o) => {
          const r = byId.get(o.routineId);
          if (!r || !r.showInCalendar) return [];
          return [{
            household_id: householdId,
            source_occurrence_id: o.id,
            title: `${r.icon} ${r.title}${r.kind === "bill" && (o.amount ?? r.amount) != null ? ` · ${chf((o.amount ?? r.amount)!)}` : ""}`,
            date: o.dueDate,
            time: "09:00",
            type: r.kind === "chore" ? "task" : "event",
          }];
        });
      if (rows.length > 0) {
        await supabase.from("calendar_events").upsert(rows, { onConflict: "source_occurrence_id", ignoreDuplicates: true });
      }
    },
    [householdId, calendarEnabled]
  );

  // `fill` = also create missing occurrences and calendar entries (on open and after changes).
  const refresh = useCallback(
    async (fill: boolean) => {
      let data = await fetchAll();
      if (!data) return;
      if (fill) {
        const missing = missingOccurrences(data.routines, data.occurrences, todayLocalISO());
        if (missing.length > 0 && householdId) {
          const byId = new Map(data.routines.map((r) => [r.id, r]));
          await supabase.from("routine_occurrences").upsert(
            missing.map((m) => ({
              household_id: householdId,
              routine_id: m.routineId,
              due_date: m.dueDate,
              assigned_to: byId.get(m.routineId)?.assigneeId ?? null,
            })),
            { onConflict: "routine_id,due_date", ignoreDuplicates: true }
          );
          data = (await fetchAll()) ?? data;
        }
        await syncCalendar(data.routines, data.occurrences);
      }
      setRoutines(data.routines);
      setOccurrences(data.occurrences);
    },
    [fetchAll, syncCalendar, householdId]
  );

  useEffect(() => {
    if (!householdId) return;
    // Standard fetch-on-mount: sets isLoading(false) once the first load is done.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(true).finally(() => setIsLoading(false));
  }, [householdId, refresh]);

  useEffect(() => {
    if (!householdId || !expensesEnabled) return;
    supabase
      .from("verteilertopf_tx")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .then(({ count }) => setHasVerteilertopf((count ?? 0) > 0));
  }, [householdId, expensesEnabled]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`routines-${householdId}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "routines", filter: `household_id=eq.${householdId}` }, () => refresh(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "routine_occurrences", filter: `household_id=eq.${householdId}` }, () => refresh(false))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, refresh]);

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const offerUndo = useCallback((action: UndoableAction) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoable({
      label: action.label,
      undo: async () => {
        if (undoTimer.current) clearTimeout(undoTimer.current);
        setUndoable(null);
        await action.undo();
      },
    });
    undoTimer.current = setTimeout(() => setUndoable(null), UNDO_WINDOW_MS);
  }, []);

  const addRoutine = useCallback(
    async (input: NewRoutine): Promise<boolean> => {
      if (!householdId) return false;
      const { error } = await supabase.from("routines").insert({
        household_id: householdId,
        kind: input.kind,
        title: input.title,
        icon: input.icon,
        schedule: input.schedule as unknown as Json,
        mode: input.mode,
        active_months: input.activeMonths,
        lead_days: input.leadDays,
        assignee_id: input.assigneeId,
        show_in_calendar: input.showInCalendar,
        amount: input.amount,
        amount_kind: input.amountKind,
        payer_id: input.payerId,
        expense_category: input.expenseCategory,
      });
      if (error) {
        showToast(ERROR_TEXT, "error");
        return false;
      }
      await refresh(true);
      return true;
    },
    [householdId, refresh]
  );

  const deleteRoutine = useCallback(
    async (id: string) => {
      // Occurrences and their calendar entries go with it (database cascade).
      setRoutines((prev) => prev.filter((r) => r.id !== id));
      setOccurrences((prev) => prev.filter((o) => o.routineId !== id));
      const { error } = await supabase.from("routines").delete().eq("id", id);
      if (error) {
        showToast(ERROR_TEXT, "error");
        refresh(false);
      }
    },
    [refresh]
  );

  // Marks an occurrence done (or skipped). For "after done" routines the next one is
  // created first and counted from today, so there is never a moment without an open one.
  // Older open occurrences of the same routine are caught up (skipped) along with it.
  const resolve = useCallback(
    async (occ: Occurrence, status: "done" | "skipped") => {
      const routine = routines.find((r) => r.id === occ.routineId);
      if (!routine || !householdId) return;
      const day = todayLocalISO();

      let nextId: string | null = null;
      if (routine.mode === "after_done") {
        const nextDue = nextAfterDone(routine.schedule, day);
        if (nextDue) {
          const { data, error } = await supabase
            .from("routine_occurrences")
            .upsert(
              { household_id: householdId, routine_id: routine.id, due_date: nextDue, assigned_to: routine.assigneeId },
              { onConflict: "routine_id,due_date", ignoreDuplicates: true }
            )
            .select("id");
          if (error) {
            showToast(ERROR_TEXT, "error");
            return;
          }
          nextId = data?.[0]?.id ?? null; // null if it already existed — then undo leaves it alone
        }
      }

      // Only a chore catches up: every unpaid bill is its own payment and stays open.
      const older = routine.kind !== "chore" ? [] : occurrences.filter(
        (o) => o.routineId === routine.id && o.status === "open" && o.id !== occ.id && o.dueDate < occ.dueDate
      );
      const { error } = await supabase
        .from("routine_occurrences")
        .update({ status, done_by: status === "done" ? userId ?? null : null, done_at: status === "done" ? new Date().toISOString() : null })
        .eq("id", occ.id);
      if (error) {
        if (nextId) await supabase.from("routine_occurrences").delete().eq("id", nextId);
        showToast(ERROR_TEXT, "error");
        return;
      }
      if (older.length > 0) {
        await supabase.from("routine_occurrences").update({ status: "skipped" }).in("id", older.map((o) => o.id));
      }
      // The calendar only lists what is still to do.
      await supabase.from("calendar_events").delete().in("source_occurrence_id", [occ.id, ...older.map((o) => o.id)]);

      await refresh(true);
      offerUndo({
        label: status === "done" ? `„${routine.title}“ erledigt` : `„${routine.title}“ ausgelassen`,
        undo: async () => {
          await supabase
            .from("routine_occurrences")
            .update({ status: "open", done_by: null, done_at: null })
            .in("id", [occ.id, ...older.map((o) => o.id)]);
          if (nextId) await supabase.from("routine_occurrences").delete().eq("id", nextId);
          await refresh(true);
        },
      });
    },
    [routines, occurrences, householdId, userId, refresh, offerUndo]
  );

  // Pays a bill: closes the occurrence and, if asked, books it as an expense and/or debits a
  // Verteilertopf account. Each step is undone again if a later one fails.
  const payBill = useCallback(
    async (occ: Occurrence, input: PayInput): Promise<boolean> => {
      const routine = routines.find((r) => r.id === occ.routineId);
      if (!routine || routine.kind !== "bill" || !householdId) return false;
      const day = todayLocalISO();
      const amount = Math.round(input.amount * 100) / 100;

      let expenseId: string | null = null;
      let txId: string | null = null;
      const rollback = async () => {
        if (expenseId) await supabase.from("expenses").delete().eq("id", expenseId);
        if (txId) await supabase.from("verteilertopf_tx").delete().eq("id", txId);
      };

      if (input.bookExpense && userId) {
        const { data, error } = await supabase
          .from("expenses")
          .insert({
            household_id: householdId,
            user_id: userId,
            title: routine.title,
            amount,
            date: new Date().toISOString(),
            category: routine.expenseCategory || "Rechnungen",
            note: "Aus Routinen",
          })
          .select("id")
          .single();
        if (error || !data) {
          showToast(ERROR_TEXT, "error");
          return false;
        }
        expenseId = data.id;
      }

      if (input.account) {
        const { data, error } = await supabase
          .from("verteilertopf_tx")
          .insert({ household_id: householdId, kind: "expense", date: day, account: input.account, amount: -amount, description: routine.title })
          .select("id")
          .single();
        if (error || !data) {
          await rollback();
          showToast(ERROR_TEXT, "error");
          return false;
        }
        txId = data.id;
      }

      const { error } = await supabase
        .from("routine_occurrences")
        .update({ status: "done", done_by: userId ?? null, done_at: new Date().toISOString(), amount, expense_id: expenseId, vt_tx_id: txId })
        .eq("id", occ.id);
      if (error) {
        await rollback();
        showToast(ERROR_TEXT, "error");
        return false;
      }

      const previousAmount = routine.amount;
      const newAmount = input.keepAmount && routine.amountKind !== "fixed" && amount !== routine.amount ? amount : null;
      if (newAmount !== null) await supabase.from("routines").update({ amount: newAmount }).eq("id", routine.id);
      await supabase.from("calendar_events").delete().eq("source_occurrence_id", occ.id);

      await refresh(true);
      offerUndo({
        label: `„${routine.title}“ bezahlt`,
        undo: async () => {
          await supabase
            .from("routine_occurrences")
            .update({ status: "open", done_by: null, done_at: null, amount: null, expense_id: null, vt_tx_id: null })
            .eq("id", occ.id);
          await rollback();
          if (newAmount !== null) await supabase.from("routines").update({ amount: previousAmount }).eq("id", routine.id);
          await refresh(true);
        },
      });
      return true;
    },
    [routines, householdId, userId, refresh, offerUndo]
  );

  return {
    routines, occurrences, today, isLoading, undoable, addRoutine, deleteRoutine, resolve, payBill,
    finance: { expensesEnabled, hasVerteilertopf },
  };
}
