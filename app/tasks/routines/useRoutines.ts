"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Database, Json } from "../../lib/database.types";
import { showToast } from "../../../lib/toast";
import { useI18n } from "../../context/LanguageContext";
import { chf } from "../../expenses/format";
import { missingOccurrences } from "./ensure";
import { mergedDates, type ImportItem } from "./calendarImport";
import { planCleaningMigration, type CleaningRecurrence } from "./cleaningMigration";
import { loadsFrom } from "./fairness";
import { planAssignments } from "./rotation";
import { addDays, nextAfterDone, todayLocalISO } from "./schedule";
import type { Assignment, Occurrence, Routine } from "./types";
import type { BuiltRoutine } from "./formModel";
import { toOccurrence, toRoutine } from "./rowMappers";
import { useRoutineTeam } from "./useRoutineTeam";

const UNDO_WINDOW_MS = 8000;

// What the form or the quick-add bar hands over to be saved.
export type NewRoutine = BuiltRoutine;

// What can be changed on a task later, without starting over.
export interface RoutinePatch {
  title?: string;
  roomId?: string | null;
  assignment?: Assignment;
  assigneeId?: string | null;
  rotation?: string[] | null;
  supplies?: string[];
}

// Where a paid bill is booked. All optional: paying only closes the bill.
export interface PayInput {
  paidBy: string; // who paid it; an expense can only be booked for yourself
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

// Loads a household's routines and their occurrences, fills the next ~8 weeks,
// and mirrors open occurrences into the calendar when that feature is on.
export function useRoutines(householdId: string | undefined, userId: string | undefined, features: Features, memberIds: string[]) {
  const { calendarEnabled, expensesEnabled } = features;
  const { t } = useI18n();
  const errorText = t("That didn't work just now. Want to try again?", "Das hat gerade nicht geklappt. Magst du es nochmal versuchen?");
  const team = useRoutineTeam(householdId, memberIds);
  // What the planner needs, kept in refs so loading does not restart when they change;
  // the effect below reruns the plan instead.
  const planRef = useRef({ absences: team.absences, memberIds });
  const memberKey = memberIds.join(",");
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  // Done in the last 30 days (Fairness-Waage, rotation continuity) and every paid bill with a split (Ausgleich).
  const [doneRecent, setDoneRecent] = useState<Occurrence[]>([]);
  const [paidBills, setPaidBills] = useState<Occurrence[]>([]);
  // Cleaning Plan tasks that have not been taken over yet (0 also when the column does not exist yet).
  const [cleaningOpen, setCleaningOpen] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [undoable, setUndoable] = useState<UndoableAction | null>(null);
  // Whether this household uses the Verteilertopf, so the pay panel can offer to debit an account.
  const [hasVerteilertopf, setHasVerteilertopf] = useState(false);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  const today = todayLocalISO();

  const fetchAll = useCallback(async () => {
    if (!householdId) return null;
    const since = addDays(todayLocalISO(), -30);
    const [r, o, d, p] = await Promise.all([
      supabase.from("routines").select("*").eq("household_id", householdId).order("created_at", { ascending: true }),
      // Everything still open (waiting chores) plus everything from today on.
      supabase
        .from("routine_occurrences")
        .select("*")
        .eq("household_id", householdId)
        .or(`status.eq.open,due_date.gte.${todayLocalISO()}`)
        .order("due_date", { ascending: true }),
      supabase.from("routine_occurrences").select("*").eq("household_id", householdId).eq("status", "done").gte("done_at", `${since}T00:00:00`),
      supabase.from("routine_occurrences").select("*").eq("household_id", householdId).eq("status", "done").not("split", "is", null),
    ]);
    if (r.error || o.error) return null;
    return {
      routines: (r.data ?? []).map(toRoutine),
      occurrences: (o.data ?? []).map(toOccurrence),
      // Older databases without these columns/rows just give empty lists.
      doneRecent: d.error ? [] : (d.data ?? []).map(toOccurrence),
      paidBills: p.error ? [] : (p.data ?? []).map(toOccurrence),
    };
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

  // Decides who does what (rotation, fair share, fixed) and writes only what changed.
  // Safe to run from several devices: the plan is deterministic, so they agree.
  const planWho = useCallback(
    async (rs: Routine[], occs: Occurrence[], done: Occurrence[]): Promise<Occurrence[]> => {
      const { absences, memberIds: members } = planRef.current;
      if (members.length === 0) return occs;
      const day = todayLocalISO();
      const seen = new Set(occs.map((o) => o.id));
      const history = [...occs, ...done.filter((o) => !seen.has(o.id))];
      const loads = loadsFrom(done, rs, members);
      const changes = rs.flatMap((r) => planAssignments(r, history, members, absences, day, loads));
      if (changes.length === 0) return occs;

      const byPerson = new Map<string | null, string[]>();
      for (const c of changes) byPerson.set(c.assignedTo, [...(byPerson.get(c.assignedTo) ?? []), c.occurrenceId]);
      const results = await Promise.all(
        [...byPerson].map(([person, ids]) => supabase.from("routine_occurrences").update({ assigned_to: person }).in("id", ids))
      );
      if (results.some((x) => x.error)) return occs;
      const patch = new Map(changes.map((c) => [c.occurrenceId, c.assignedTo]));
      return occs.map((o) => (patch.has(o.id) ? { ...o, assignedTo: patch.get(o.id) ?? null } : o));
    },
    []
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
        data = { ...data, occurrences: await planWho(data.routines, data.occurrences, data.doneRecent) };
        await syncCalendar(data.routines, data.occurrences);
      }
      setRoutines(data.routines);
      setOccurrences(data.occurrences);
      setDoneRecent(data.doneRecent);
      setPaidBills(data.paidBills);
    },
    [fetchAll, syncCalendar, householdId, planWho]
  );

  useEffect(() => {
    if (!householdId) return;
    // Standard fetch-on-mount: sets isLoading(false) once the first load is done.
    refresh(true).finally(() => {
      loadedRef.current = true;
      setIsLoading(false);
    });
  }, [householdId, refresh]);

  // Absences or members changed: plan who does what again.
  useEffect(() => {
    planRef.current = { absences: team.absences, memberIds };
    if (loadedRef.current) refresh(true);
    // Keyed on content (absenceKey/memberKey), not on array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.absenceKey, memberKey]);

  const loadCleaningOpen = useCallback(async () => {
    if (!householdId) return;
    const { count, error } = await supabase
      .from("cleaning_tasks")
      .select("id", { count: "exact", head: true })
      .eq("household_id", householdId)
      .is("migrated_routine_id", null);
    setCleaningOpen(error ? 0 : count ?? 0);
  }, [householdId]);

  useEffect(() => {
    // Standard fetch-on-mount.
    loadCleaningOpen();
  }, [loadCleaningOpen]);

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
        assignment: input.assignment,
        rotation: input.rotation,
        effort: input.effort,
        split: input.split as unknown as Json,
        room_id: input.roomId,
        supplies: input.supplies,
      });
      if (error) {
        showToast(errorText, "error");
        return false;
      }
      await refresh(true);
      return true;
    },
    [householdId, refresh, errorText]
  );

  // Renames, moves to another room or changes who does it. The plan for who does what runs again
  // afterwards, so open dates follow the new setting; a hand-over done by hand stays as it is.
  const updateRoutine = useCallback(
    async (id: string, patch: RoutinePatch): Promise<boolean> => {
      const current = routines.find((r) => r.id === id);
      if (!current) return false;
      const title = patch.title !== undefined ? patch.title.trim() : undefined;
      if (title !== undefined && !title) return false;

      const next: Routine = { ...current };
      const row: Database["public"]["Tables"]["routines"]["Update"] = {};
      if (title !== undefined) { next.title = title; row.title = title; }
      if (patch.roomId !== undefined) { next.roomId = patch.roomId; row.room_id = patch.roomId; }
      if (patch.supplies !== undefined) { next.supplies = patch.supplies; row.supplies = patch.supplies; }
      if (patch.assignment !== undefined) {
        next.assignment = patch.assignment;
        next.assigneeId = patch.assignment === "fixed" ? patch.assigneeId ?? null : null;
        next.rotation = patch.assignment === "rotation" ? patch.rotation ?? null : null;
        row.assignment = next.assignment;
        row.assignee_id = next.assigneeId;
        row.rotation = next.rotation;
      }

      setRoutines((prev) => prev.map((r) => (r.id === id ? next : r)));
      const { error } = await supabase.from("routines").update(row).eq("id", id);
      if (error) {
        showToast(errorText, "error");
        await refresh(false);
        return false;
      }
      if (title !== undefined && current.kind !== "bill") {
        const ids = occurrences.filter((o) => o.routineId === id && o.status === "open").map((o) => o.id);
        if (ids.length > 0) {
          await supabase.from("calendar_events").update({ title: `${current.icon} ${title}` }).in("source_occurrence_id", ids);
        }
      }
      await refresh(true);
      return true;
    },
    [routines, occurrences, refresh, errorText]
  );

  const deleteRoutine = useCallback(
    async (id: string) => {
      // Occurrences and their calendar entries go with it (database cascade).
      setRoutines((prev) => prev.filter((r) => r.id !== id));
      setOccurrences((prev) => prev.filter((o) => o.routineId !== id));
      const { error } = await supabase.from("routines").delete().eq("id", id);
      if (error) {
        showToast(errorText, "error");
        refresh(false);
      }
    },
    [refresh, errorText]
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
            showToast(errorText, "error");
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
        showToast(errorText, "error");
        return;
      }
      if (older.length > 0) {
        await supabase.from("routine_occurrences").update({ status: "skipped" }).in("id", older.map((o) => o.id));
      }
      // The calendar only lists what is still to do.
      await supabase.from("calendar_events").delete().in("source_occurrence_id", [occ.id, ...older.map((o) => o.id)]);

      await refresh(true);
      offerUndo({
        label:
          status === "done"
            ? t(`“${routine.title}” done`, `„${routine.title}“ erledigt`)
            : t(`“${routine.title}” skipped`, `„${routine.title}“ ausgelassen`),
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
    [routines, occurrences, householdId, userId, refresh, offerUndo, errorText, t]
  );

  // Entsorgungskalender: creates a date-list reminder per waste type, or adds the new dates
  // to the reminder that already has this name (the yearly re-import).
  const importCalendar = useCallback(
    async (items: ImportItem[]): Promise<{ created: number; updated: number } | null> => {
      if (!householdId) return null;
      let created = 0;
      let updated = 0;
      for (const item of items) {
        if (item.action === "create") {
          const { error } = await supabase.from("routines").insert({
            household_id: householdId,
            kind: "reminder",
            title: item.title,
            icon: item.icon,
            schedule: { type: "dates", dates: item.dates } as unknown as Json,
            mode: "fixed",
            lead_days: 1,
            assignment: "open",
            effort: 2,
            show_in_calendar: true,
          });
          if (error) {
            showToast(errorText, "error");
            continue;
          }
          created++;
        } else if (item.action === "update" && item.routineId) {
          const { error } = await supabase
            .from("routines")
            .update({ schedule: { type: "dates", dates: mergedDates(item) } as unknown as Json })
            .eq("id", item.routineId);
          if (error) {
            showToast(errorText, "error");
            continue;
          }
          updated++;
        }
      }
      await refresh(true);
      return { created, updated };
    },
    [householdId, refresh, errorText]
  );

  // Takes the Cleaning Plan over: every task becomes a routine and is hidden in the Cleaning Plan
  // (its row stays; deleting the routine brings the task back). Overdue tasks stay overdue.
  const importCleaningPlan = useCallback(
    async (members: { id: string; name: string }[]): Promise<number> => {
      if (!householdId) return 0;
      const [{ data: tasks, error: tErr }, { data: rooms }] = await Promise.all([
        supabase.from("cleaning_tasks").select("*").eq("household_id", householdId).is("migrated_routine_id", null).order("created_at", { ascending: true }),
        supabase.from("rooms").select("*").eq("household_id", householdId),
      ]);
      if (tErr || !tasks) {
        showToast(errorText, "error");
        return 0;
      }
      const roomById = new Map((rooms ?? []).map((r) => [r.id, { name: r.name, icon: r.icon }]));
      let moved = 0;
      for (const t of tasks) {
        const plan = planCleaningMigration(
          { id: t.id, roomId: t.room_id, title: t.title, supplies: t.supplies, recurrence: t.recurrence as CleaningRecurrence, assignee: t.assignee, nextDue: t.next_due },
          roomById.get(t.room_id),
          members
        );
        const { data: routine, error } = await supabase
          .from("routines")
          .insert({
            household_id: householdId,
            kind: "chore",
            title: plan.title,
            icon: plan.icon,
            schedule: plan.schedule as unknown as Json,
            mode: plan.mode,
            lead_days: 0,
            assignment: plan.assignment,
            assignee_id: plan.assigneeId,
            effort: 2,
            show_in_calendar: true,
            room_id: plan.roomId,
            supplies: plan.supplies,
          })
          .select("id")
          .single();
        if (error || !routine) continue;
        const { error: occError } = await supabase
          .from("routine_occurrences")
          .insert({ household_id: householdId, routine_id: routine.id, due_date: plan.firstDue, assigned_to: plan.assigneeId });
        const { error: linkError } = occError
          ? { error: occError }
          : await supabase.from("cleaning_tasks").update({ migrated_routine_id: routine.id }).eq("id", t.id);
        if (linkError) {
          await supabase.from("routines").delete().eq("id", routine.id); // occurrences go with it
          continue;
        }
        // The Cleaning Plan's own calendar entry would now duplicate the routine's.
        await supabase.from("calendar_events").delete().eq("source_cleaning_task_id", t.id);
        moved++;
      }
      await Promise.all([refresh(true), loadCleaningOpen()]);
      if (moved < tasks.length) {
        showToast(
          t("A few tasks could not be moved. They stay in your old cleaning plan.", "Ein paar Aufgaben konnte ich nicht übernehmen. Sie bleiben im alten Putzplan."),
          "info"
        );
      }
      return moved;
    },
    [householdId, refresh, loadCleaningOpen, errorText, t]
  );

  // Hands one occurrence to someone else. It is locked so the rotation leaves it alone
  // and simply carries on from there.
  const swap = useCallback(
    async (occ: Occurrence, toUserId: string) => {
      const before = { assignedTo: occ.assignedTo, locked: occ.locked };
      setOccurrences((prev) => prev.map((o) => (o.id === occ.id ? { ...o, assignedTo: toUserId, locked: true } : o)));
      const { error } = await supabase.from("routine_occurrences").update({ assigned_to: toUserId, locked: true }).eq("id", occ.id);
      if (error) {
        showToast(errorText, "error");
        refresh(false);
        return;
      }
      await refresh(true);
      const routine = routines.find((r) => r.id === occ.routineId);
      offerUndo({
        label: t(`“${routine?.title ?? "Task"}” handed over`, `„${routine?.title ?? "Aufgabe"}“ abgegeben`),
        undo: async () => {
          await supabase.from("routine_occurrences").update({ assigned_to: before.assignedTo, locked: before.locked }).eq("id", occ.id);
          await refresh(true);
        },
      });
    },
    [routines, refresh, offerUndo, errorText, t]
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

      if (input.bookExpense && userId && input.paidBy === userId) {
        const { data, error } = await supabase
          .from("expenses")
          .insert({
            household_id: householdId,
            user_id: userId,
            title: routine.title,
            amount,
            date: new Date().toISOString(),
            category: routine.expenseCategory || "Rechnungen",
            note: t("From tasks", "Aus Aufgaben"),
          })
          .select("id")
          .single();
        if (error || !data) {
          showToast(errorText, "error");
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
          showToast(errorText, "error");
          return false;
        }
        txId = data.id;
      }

      const { error } = await supabase
        .from("routine_occurrences")
        .update({
          status: "done",
          done_by: input.paidBy,
          done_at: new Date().toISOString(),
          amount,
          expense_id: expenseId,
          vt_tx_id: txId,
          split: routine.split as unknown as Json,
        })
        .eq("id", occ.id);
      if (error) {
        await rollback();
        showToast(errorText, "error");
        return false;
      }

      const previousAmount = routine.amount;
      const newAmount = input.keepAmount && routine.amountKind !== "fixed" && amount !== routine.amount ? amount : null;
      if (newAmount !== null) await supabase.from("routines").update({ amount: newAmount }).eq("id", routine.id);
      await supabase.from("calendar_events").delete().eq("source_occurrence_id", occ.id);

      await refresh(true);
      offerUndo({
        label: t(`“${routine.title}” paid`, `„${routine.title}“ bezahlt`),
        undo: async () => {
          await supabase
            .from("routine_occurrences")
            .update({ status: "open", done_by: null, done_at: null, amount: null, expense_id: null, vt_tx_id: null, split: null })
            .eq("id", occ.id);
          await rollback();
          if (newAmount !== null) await supabase.from("routines").update({ amount: previousAmount }).eq("id", routine.id);
          await refresh(true);
        },
      });
      return true;
    },
    [routines, householdId, userId, refresh, offerUndo, errorText, t]
  );

  return {
    routines, occurrences, doneRecent, paidBills, today, isLoading, undoable, addRoutine, updateRoutine, deleteRoutine, resolve, payBill, swap, importCalendar, importCleaningPlan, cleaningOpen,
    finance: { expensesEnabled, hasVerteilertopf },
    team,
  };
}
