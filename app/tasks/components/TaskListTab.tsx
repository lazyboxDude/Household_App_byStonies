"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Plus, Star, Trash2, User, Medal } from "lucide-react";
import { Task } from "../types";

const DEFAULT_TASKS: Task[] = [
  { id: "1", title: "Buy a toolbox", points: 20, completed: false },
  { id: "2", title: "Set up smart home hub", points: 50, completed: false },
  { id: "3", title: "Water plants", points: 15, completed: true, assignee: "Kid" },
];

export default function TaskListTab({
  onAwardPoints,
}: {
  onAwardPoints: (points: number) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const s = localStorage.getItem("tasks");
      return s ? (JSON.parse(s) as Task[]) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  });

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPoints, setNewTaskPoints] = useState(10);

  const addTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      points: newTaskPoints,
      completed: false,
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
  };

  const toggleTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isCompleting = !task.completed;

    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, completed: isCompleting } : t)));
    onAwardPoints(isCompleting ? task.points : -task.points);
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  return (
    <div className="space-y-4">
      {/* Add Task Input */}
      <div className="surface p-4 flex gap-3">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Buy a toolbox, set up smart home, ..."
          className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-[var(--text)] placeholder-[var(--text-tertiary)]"
        />
        <div className="flex items-center gap-2 border-l divider pl-3">
          <Star className="w-4 h-4 text-yellow-500" />
          <select
            value={newTaskPoints}
            onChange={(e) => setNewTaskPoints(Number(e.target.value))}
            className="bg-transparent border-none text-sm font-medium text-[var(--text-secondary)] focus:ring-0 outline-none cursor-pointer"
          >
            <option value={10}>10 XP</option>
            <option value={20}>20 XP</option>
            <option value={50}>50 XP</option>
            <option value={100}>100 XP</option>
          </select>
        </div>
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
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                  {task.assignee && (
                    <span className="flex items-center gap-1 bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
                      <User className="w-3 h-3" /> {task.assignee}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500 font-medium">
                    <Star className="w-3 h-3" /> {task.points} XP
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => deleteTask(task.id)}
              className="press text-[var(--text-tertiary)] hover:text-[var(--danger)] p-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <Medal className="w-12 h-12 mx-auto mb-3 text-[var(--text-tertiary)]" />
            <p>No active quests. Add one to earn XP!</p>
          </div>
        )}
      </div>
    </div>
  );
}
