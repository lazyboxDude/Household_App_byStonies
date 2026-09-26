"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Plus, Trash2, User, ListTodo, Loader2, Lock, Users } from "lucide-react";
import { Task } from "../types";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

export default function TaskListTab({ householdId }: { householdId: string }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskShared, setNewTaskShared] = useState(true);

  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    if (!error) setTasks((data ?? []) as Task[]);
    setIsLoading(false);
  }, [householdId]);

  useEffect(() => {
    // Standard fetch-on-mount: loadTasks sets isLoading(false) once done.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const channel = supabase
      .channel(`tasks-${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${householdId}` },
        loadTasks
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, loadTasks]);

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const { data, error } = await supabase
      .from("tasks")
      .insert({ household_id: householdId, title: newTaskTitle.trim(), is_shared: newTaskShared })
      .select()
      .single();
    if (!error) {
      setTasks((prev) => [...prev, data as Task]);
      setNewTaskTitle("");
    }
  };

  const toggleShared = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextShared = !task.is_shared;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_shared: nextShared } : t)));

    const { error } = await supabase.from("tasks").update({ is_shared: nextShared }).eq("id", taskId);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_shared: !nextShared } : t)));
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const isCompleting = !task.completed;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: isCompleting } : t)));

    const { error } = await supabase.from("tasks").update({ completed: isCompleting }).eq("id", taskId);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: !isCompleting } : t)));
    }
  };

  const deleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) loadTasks();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Task Input */}
      <div className="surface p-4 flex items-center gap-3">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Buy a toolbox, set up smart home, ..."
          className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-[var(--text)] placeholder-[var(--text-tertiary)]"
        />
        <button
          type="button"
          onClick={() => setNewTaskShared((v) => !v)}
          className="press flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full shrink-0"
          style={{
            background: newTaskShared ? "var(--accent-soft)" : "var(--surface-2)",
            color: newTaskShared ? "var(--accent)" : "var(--text-secondary)",
          }}
          title={newTaskShared ? "Visible to the whole household" : "Only visible to you"}
        >
          {newTaskShared ? <Users className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {newTaskShared ? "Shared" : "Only me"}
        </button>
        <button onClick={addTask} className="btn btn-icon" style={{ background: "#4f46e5", color: "white" }}>
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.map((task, i) => (
          <div
            key={task.id}
            className={`group surface card-interactive flex items-center justify-between p-4 animate-rise ${
              task.completed ? "opacity-75" : ""
            }`}
            style={{ "--stagger-i": i } as React.CSSProperties}
          >
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => toggleTask(task.id)}
                className={`press flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${
                  task.completed
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-[var(--border-strong)] hover:border-indigo-500 text-transparent"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <div className="flex-1">
                <h3
                  className={`font-medium ${
                    task.completed ? "text-[var(--text-tertiary)] line-through" : "text-[var(--text)]"
                  }`}
                >
                  {task.title}
                </h3>
                {(task.assignee || !task.is_shared) && (
                  <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                    {task.assignee && (
                      <span className="flex items-center gap-1 bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                        <User className="w-3 h-3" /> {task.assignee}
                      </span>
                    )}
                    {!task.is_shared && (
                      <span className="flex items-center gap-1 bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" /> Only me
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {task.created_by === user?.id && (
              <button
                onClick={() => toggleShared(task.id)}
                className="press row-action text-[var(--text-tertiary)] hover:text-[var(--text)] p-2"
                title={task.is_shared ? "Make private" : "Share with household"}
              >
                {task.is_shared ? <Lock className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => deleteTask(task.id)}
              className="press row-action text-[var(--text-tertiary)] hover:text-[var(--danger)] p-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <ListTodo className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p>No tasks yet. Add one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
