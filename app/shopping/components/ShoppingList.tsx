import { Plus, Trash2, MapPin, Search, DollarSign, ExternalLink, Percent } from "lucide-react";
import { ShoppingItem } from "../types";

interface ShoppingListProps {
  items: ShoppingItem[];
  shops: string[];
  newItem: string;
  setNewItem: (val: string) => void;
  newPrice: string;
  setNewPrice: (val: string) => void;
  newStore: string;
  setNewStore: (val: string) => void;
  addItem: (e: React.FormEvent) => void;
  simulateFindShops: () => void;
  toggleItem: (id: string) => void;
  deleteItem: (id: string) => void;
  searchItem: (item: ShoppingItem) => void;
  viewSales: (storeName: string) => void;
}

export default function ShoppingList({
  items,
  shops,
  newItem,
  setNewItem,
  newPrice,
  setNewPrice,
  newStore,
  setNewStore,
  addItem,
  simulateFindShops,
  toggleItem,
  deleteItem,
  searchItem,
  viewSales
}: ShoppingListProps) {
  return (
    <>
      <div className="flex justify-end mb-4">
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
              {newStore && (
                <button
                  type="button"
                  onClick={() => viewSales(newStore)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full transition-colors"
                  title="View current sales"
                >
                  <Percent className="w-4 h-4" />
                </button>
              )}
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
                        onClick={() => searchItem(item)}
                        className={`p-1 rounded-full transition-colors ${
                          item.store?.toLowerCase().includes('migros') 
                            ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                            : "text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        }`}
                        title={item.store?.toLowerCase().includes('migros') ? "Search on Migros.ch" : "Find prices nearby"}
                      >
                        {item.store?.toLowerCase().includes('migros') ? <ExternalLink className="w-4 h-4" /> : <Search className="w-4 h-4" />}
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
                        <button 
                          onClick={() => viewSales(item.store!)}
                          className="flex items-center hover:text-orange-500 transition-colors group/store"
                          title="View store sales"
                        >
                          <MapPin className="w-3 h-3 mr-1 group-hover/store:text-orange-500" />
                          <span className="border-b border-transparent group-hover/store:border-orange-500">
                            {item.store}
                          </span>
                          <Percent className="w-3 h-3 ml-1 opacity-0 group-hover/store:opacity-100 transition-opacity text-orange-500" />
                        </button>
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
    </>
  );
}
