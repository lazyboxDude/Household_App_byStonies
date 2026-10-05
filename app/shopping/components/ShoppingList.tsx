import { Plus, Trash2, MapPin, Search, DollarSign, ExternalLink, Percent } from "lucide-react";
import { ShoppingItem } from "../types";
import Mascot from "../../../components/Mascot";

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
        <span className="text-caption">
          {items.filter((i) => !i.completed).length} items left
        </span>
      </div>

      {/* Add Item Form */}
      <form onSubmit={addItem} className="mb-8 surface p-4">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="What do we need? (e.g. Milk)"
            className="field"
          />

          <div className="flex gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Price"
                className="field pl-9"
              />
            </div>

            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={newStore}
                onChange={(e) => setNewStore(e.target.value)}
                placeholder="Store (optional)"
                list="shops-list"
                className="field pl-9"
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
                  className="press absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full transition-colors"
                  title="View current sales"
                >
                  <Percent className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!newItem.trim()}
              className="btn btn-primary px-6"
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
            className="chip flex-shrink-0"
            style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", borderColor: "transparent" }}
          >
            <MapPin className="w-3 h-3" />
            Find Nearby
          </button>
          {shops.map(shop => (
            <button
              key={shop}
              onClick={() => setNewStore(shop)}
              className="chip flex-shrink-0"
            >
              {shop}
            </button>
          ))}
        </div>
      </div>

      {/* Shopping List */}
      <div className="surface overflow-hidden">
        {items.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            <Mascot pose="shopping" className="h-36 mb-3" />
            <p>Your shopping list is empty!</p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {items.map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between p-4 hover:bg-[var(--surface-2)] transition-colors duration-300 ${
                  item.completed ? "bg-[var(--surface-2)]" : ""
                }`}
              >
                <div className="flex items-center flex-1 gap-3">
                  <div
                    className="press cursor-pointer"
                    onClick={() => toggleItem(item.id)}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${
                        item.completed
                          ? "bg-orange-500 border-orange-500"
                          : "border-[var(--border-strong)] hover:border-orange-500"
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
                            ? "text-[var(--text-tertiary)] line-through"
                            : "text-[var(--text)]"
                        }`}
                      >
                        {item.text}
                      </span>
                      <button
                        onClick={() => searchItem(item)}
                        className={`press p-1 rounded-full transition-colors ${
                          item.store?.toLowerCase().includes('migros')
                            ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                            : "text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        }`}
                        title={item.store?.toLowerCase().includes('migros') ? "Search on Migros.ch" : "Find prices nearby"}
                      >
                        {item.store?.toLowerCase().includes('migros') ? <ExternalLink className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex gap-4 text-sm text-[var(--text-secondary)]">
                      {item.price && (
                        <span className="flex items-center text-green-600 dark:text-green-400">
                          <DollarSign className="w-3 h-3 mr-0.5" />
                          {item.price.toFixed(2)}
                        </span>
                      )}
                      {item.store && (
                        <button
                          onClick={() => viewSales(item.store!)}
                          className="press flex items-center hover:text-orange-500 transition-colors group/store"
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
                  className="press text-[var(--text-tertiary)] hover:text-[var(--danger)] p-2 rounded-full hover:bg-[var(--danger-soft)] transition-colors ml-2"
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
