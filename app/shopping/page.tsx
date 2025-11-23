"use client";

import { useState } from "react";
import { Plus, Trash2, ShoppingCart } from "lucide-react";

interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([
    { id: "1", text: "Milk", completed: false },
    { id: "2", text: "Eggs", completed: false },
    { id: "3", text: "Bread", completed: true },
  ]);
  const [newItem, setNewItem] = useState("");

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    const item: ShoppingItem = {
      id: Date.now().toString(),
      text: newItem.trim(),
      completed: false,
    };

    setItems([item, ...items]);
    setNewItem("");
  };

  const toggleItem = (id: string) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <ShoppingCart className="mr-3 w-8 h-8 text-orange-500" />
          Shopping List
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {items.filter((i) => !i.completed).length} items left
        </span>
      </div>

      {/* Add Item Form */}
      <form onSubmit={addItem} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add something to buy..."
            className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!newItem.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </form>

      {/* Shopping List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p>Your shopping list is empty!</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  item.completed ? "bg-gray-50 dark:bg-gray-800/50" : ""
                }`}
              >
                <div className="flex items-center flex-1 gap-3 cursor-pointer" onClick={() => toggleItem(item.id)}>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      item.completed
                        ? "bg-orange-500 border-orange-500"
                        : "border-gray-300 dark:border-gray-600 hover:border-orange-500"
                    }`}
                  >
                    {item.completed && (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-lg transition-all ${
                      item.completed
                        ? "text-gray-400 line-through"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {item.text}
                  </span>
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  aria-label="Delete item"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
