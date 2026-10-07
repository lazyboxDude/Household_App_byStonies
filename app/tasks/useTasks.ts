"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Task } from "./types";

// The id of a task that is on screen but not saved yet.
const PENDING = "pending-";

// Plain to-dos without a date ("Zahnarzt anrufen"), live. Shared with the household or private.
export function useTasks(householdId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!householdId) return;
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    if (!error) setTasks((data ?? []) as Task[]);
  }, [householdId]);

  useEffect(() => {
    // Standard fetch-on-mount: sets isLoading(false) once the first load is done.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setIsLoading(false));
  }, [load]);

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`tasks-${householdId}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${householdId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, load]);

  // The new task shows up at once and is swapped for the saved one when the answer is in. If
  // saving fails it disappears again. Until then it cannot be ticked off or deleted.
  const addTask = useCallback(
    async (title: string, shared: boolean, assignee: string | null = null): Promise<boolean> => {
      const trimmed = title.trim();
      if (!householdId || !trimmed) return false;
      const tempId = `${PENDING}${Math.random().toString(36).slice(2)}`;
      setTasks((prev) => [...prev, { id: tempId, title: trimmed, completed: false, assignee, created_by: null, is_shared: shared }]);
      const { data, error } = await supabase
        .from("tasks")
        .insert({ household_id: householdId, title: trimmed, is_shared: shared, assignee })
        .select()
        .single();
      if (error || !data) {
        setTasks((prev) => prev.filter((x) => x.id !== tempId));
        return false;
      }
      // A refresh that came in meanwhile may already have replaced the list with the saved row.
      setTasks((prev) => (prev.some((x) => x.id === data.id) ? prev.filter((x) => x.id !== tempId) : prev.map((x) => (x.id === tempId ? (data as Task) : x))));
      return true;
    },
    [householdId]
  );

  const toggleTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((x) => x.id === taskId);
      if (!task || taskId.startsWith(PENDING)) return;
      const completed = !task.completed;
      setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, completed } : x)));
      const { error } = await supabase.from("tasks").update({ completed }).eq("id", taskId);
      if (error) setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, completed: !completed } : x)));
    },
    [tasks]
  );

  const toggleShared = useCallback(
    async (taskId: string) => {
      const task = tasks.find((x) => x.id === taskId);
      if (!task || taskId.startsWith(PENDING)) return;
      const is_shared = !task.is_shared;
      setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, is_shared } : x)));
      const { error } = await supabase.from("tasks").update({ is_shared }).eq("id", taskId);
      if (error) setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, is_shared: !is_shared } : x)));
    },
    [tasks]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (taskId.startsWith(PENDING)) return;
      setTasks((prev) => prev.filter((x) => x.id !== taskId));
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) load();
    },
    [load]
  );

  return { tasks, isLoading, addTask, toggleTask, toggleShared, deleteTask };
}
