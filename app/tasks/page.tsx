"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trophy, 
  Star, 
  Trash2, 
  Calendar,
  User,
  Medal
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  points: number;
  completed: boolean;
  assignee?: string;
  dueDate?: string;
}

interface UserStats {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  totalTasksCompleted: number;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Clean the kitchen", points: 50, completed: false, assignee: "Dad" },
    { id: "2", title: "Take out trash", points: 20, completed: false, assignee: "Mom" },
    { id: "3", title: "Water plants", points: 15, completed: true, assignee: "Kid" },
  ]);

  const [stats, setStats] = useState<UserStats>({
    level: 1,
    currentXP: 15,
    xpToNextLevel: 100,
    totalTasksCompleted: 1
  });

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPoints, setNewTaskPoints] = useState(10);

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      points: newTaskPoints,
      completed: false
    };

    setTasks([...tasks, newTask]);
    setNewTaskTitle("");
  };

  const toggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isCompleting = !task.completed;
    
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, completed: isCompleting } : t
    ));

    if (isCompleting) {
      // Add XP
      const newXP = stats.currentXP + task.points;
      let newLevel = stats.level;
      let newXPToNext = stats.xpToNextLevel;
      let currentXP = newXP;

      // Level up logic
      if (currentXP >= newXPToNext) {
        newLevel++;
        currentXP = currentXP - newXPToNext;
        newXPToNext = Math.floor(newXPToNext * 1.5); // Harder to level up
        // Could trigger confetti here
      }

      setStats({
        level: newLevel,
        currentXP: currentXP,
        xpToNextLevel: newXPToNext,
        totalTasksCompleted: stats.totalTasksCompleted + 1
      });
    } else {
      // Remove XP (undo)
      // Simplified undo logic (doesn't handle de-leveling perfectly for simplicity)
      setStats(prev => ({
        ...prev,
        currentXP: Math.max(0, prev.currentXP - task.points),
        totalTasksCompleted: Math.max(0, prev.totalTasksCompleted - 1)
      }));
    }
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
  };

  const progressPercentage = (stats.currentXP / stats.xpToNextLevel) * 100;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          Household Tasks
        </h1>
        
        {/* Gamification Stats Card */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-xl shadow-lg flex items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="bg-white/20 p-2 rounded-full mb-1">
              <Trophy className="w-6 h-6 text-yellow-300" />
            </div>
            <span className="font-bold text-xl">Lvl {stats.level}</span>
          </div>
          
          <div className="flex-1 min-w-[150px]">
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span>{stats.currentXP} XP</span>
              <span>{stats.xpToNextLevel} XP</span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-yellow-400 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs mt-1 text-indigo-100 text-center">
              {Math.round(stats.xpToNextLevel - stats.currentXP)} XP to next level
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add Task Input */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex gap-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Add a new quest..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white placeholder-gray-400"
            />
            <div className="flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-3">
              <Star className="w-4 h-4 text-yellow-500" />
              <select 
                value={newTaskPoints}
                onChange={(e) => setNewTaskPoints(Number(e.target.value))}
                className="bg-transparent border-none text-sm font-medium text-gray-600 dark:text-gray-300 focus:ring-0 cursor-pointer"
              >
                <option value={10}>10 XP</option>
                <option value={20}>20 XP</option>
                <option value={50}>50 XP</option>
                <option value={100}>100 XP</option>
              </select>
            </div>
            <button 
              onClick={addTask}
              className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Tasks */}
          <div className="space-y-3">
            {tasks.map((task) => (
              <div 
                key={task.id}
                className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                  task.completed 
                    ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-75" 
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900"
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      task.completed
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 dark:border-gray-600 hover:border-indigo-500 text-transparent"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      task.completed 
                        ? "text-gray-500 line-through" 
                        : "text-gray-900 dark:text-white"
                    }`}>
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {task.assignee && (
                        <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
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
                  className="text-gray-400 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {tasks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Medal className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No active quests. Add one to earn XP!</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Leaderboard */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Medal className="w-5 h-5 text-orange-500" />
              Top Contributors
            </h2>
            <div className="space-y-4">
              {/* Mock Leaderboard */}
              {[
                { name: "Dad", xp: 1250, rank: 1 },
                { name: "Mom", xp: 980, rank: 2 },
                { name: "Kid", xp: 450, rank: 3 },
              ].map((user) => (
                <div key={user.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      user.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                      user.rank === 2 ? "bg-gray-100 text-gray-700" :
                      "bg-orange-50 text-orange-700"
                    }`}>
                      {user.rank}
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{user.name}</span>
                  </div>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{user.xp} XP</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-5 border border-indigo-100 dark:border-indigo-800">
            <h3 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2">Daily Challenge</h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3">
              Complete 3 tasks before 8 PM to earn a bonus 50 XP!
            </p>
            <div className="w-full bg-white dark:bg-gray-700 rounded-full h-2 mb-1">
              <div className="bg-indigo-500 h-full rounded-full w-1/3"></div>
            </div>
            <p className="text-xs text-right text-indigo-600 dark:text-indigo-400">1/3 Completed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
