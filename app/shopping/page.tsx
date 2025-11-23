"use client";

import { useState } from "react";
import { Plus, Trash2, ShoppingCart, MapPin, Search, DollarSign } from "lucide-react";

interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  price?: number;
  store?: string;
}

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([
    { id: "1", text: "Milk", completed: false, price: 2.50, store: "Walmart" },
    { id: "2", text: "Eggs", completed: false, price: 4.00 },
    { id: "3", text: "Bread", completed: true, store: "Bakery" },
  ]);
  const [shops, setShops] = useState<string[]>(["Walmart", "Target", "Costco", "Whole Foods", "Trader Joe's"]);
  const [newItem, setNewItem] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStore, setNewStore] = useState("");

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    const storeName = newStore.trim();
    if (storeName && !shops.includes(storeName)) {
      setShops(prev => [...prev, storeName].sort());
    }

    const item: ShoppingItem = {
      id: Date.now().toString(),
      text: newItem.trim(),
      completed: false,
      price: newPrice ? parseFloat(newPrice) : undefined,
      store: storeName || undefined,
    };

    setItems([item, ...items]);
    setNewItem("");
    setNewPrice("");
    setNewStore("");
  };

  const simulateFindShops = () => {
    // In a real app, this would use the Google Places API
    const nearby = ["Local Market", "Fresh Grocer", "City Supermarket"];
    const newShops = nearby.filter(s => !shops.includes(s));
    if (newShops.length > 0) {
      setShops(prev => [...prev, ...newShops].sort());
      alert(`Found ${newShops.length} nearby shops!`);
    } else {
      alert("No new shops found nearby.");
    }
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

  const searchNearby = (text: string) => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}+price+near+me`, '_blank');
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
      <form onSubmit={addItem} className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="What do we need? (e.g. Milk)"
            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
          />
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Price"
                className="w-full p-3 pl-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={newStore}
                onChange={(e) => setNewStore(e.target.value)}
                placeholder="Store (optional)"
                list="shops-list"
                className="w-full p-3 pl-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <datalist id="shops-list">
                {shops.map(shop => (
                  <option key={shop} value={shop} />
                ))}
              </datalist>
            </div>

            <button
              type="submit"
              disabled={!newItem.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </form>

      {/* Shops Quick View */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex items-center gap-2">
          <button 
            onClick={simulateFindShops}
            className="flex-shrink-0 px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center"
          >
            <MapPin className="w-3 h-3 mr-1" />
            Find Nearby
          </button>
          {shops.map(shop => (
            <button
              key={shop}
              onClick={() => setNewStore(shop)}
              className="flex-shrink-0 px-3 py-1.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {shop}
            </button>
          ))}
        </div>
      </div>

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
                <div className="flex items-center flex-1 gap-3">
                  <div 
                    className="cursor-pointer"
                    onClick={() => toggleItem(item.id)}
                  >
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
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-lg font-medium transition-all ${
                          item.completed
                            ? "text-gray-400 line-through"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {item.text}
                      </span>
                      <button 
                        onClick={() => searchNearby(item.text)}
                        className="text-blue-500 hover:text-blue-600 p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="Find prices nearby"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                      {item.price && (
                        <span className="flex items-center text-green-600 dark:text-green-400">
                          <DollarSign className="w-3 h-3 mr-0.5" />
                          {item.price.toFixed(2)}
                        </span>
                      )}
                      {item.store && (
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {item.store}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-2"
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
