import { useState } from "react";
import { Plus, Trash2, MapPin, Search, ExternalLink, Check, ChevronDown } from "lucide-react";
import { ShoppingItem } from "../types";
import Mascot from "@/components/Mascot";
import { useI18n } from "../../context/LanguageContext";
import { offersUrl } from "../constants";
import { formatPrice } from "../priceHistory";

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
  toggleItem: (id: string) => void;
  deleteItem: (id: string) => void;
  clearCompleted: () => void;
  searchItem: (item: ShoppingItem) => void;
  /** What the household usually pays for an item; null if never bought. */
  usualFor: (text: string, store: string | null) => number | null;
  /** Where the item was bought last, to suggest a store. */
  lastStoreFor: (text: string) => string | null;
  /** The item that was just checked off without a price and is waiting for one. */
  askPriceId: string | null;
  savePrice: (id: string, price: number) => void;
  skipPrice: () => void;
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
  toggleItem,
  deleteItem,
  clearCompleted,
  searchItem,
  usualFor,
  lastStoreFor,
  askPriceId,
  savePrice,
  skipPrice,
}: ShoppingListProps) {
  const { t } = useI18n();
  const [showDone, setShowDone] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");

  // The item just checked off without a price stays up top until its price is answered, so the question is seen.
  const open = items.filter((i) => !i.completed || i.id === askPriceId);
  const done = items.filter((i) => i.completed && i.id !== askPriceId);

  const suggestion = newItem.trim() && !newPrice ? usualFor(newItem, newStore.trim() || null) : null;
  const suggestedStore = suggestion !== null && !newStore.trim() ? lastStoreFor(newItem) : null;

  const renderItem = (item: ShoppingItem) => {
    const usual = !item.completed && item.price === null ? usualFor(item.text, item.store) : null;
    const offers = offersUrl(item.store);
    const asking = askPriceId === item.id;

    return (
      <li
        key={item.id}
        className={`group transition-colors duration-300 ${item.completed ? "bg-[var(--surface-2)]" : ""}`}
      >
        <div className="flex items-center">
          {/* The whole left side is one big target: it reacts on press, not on release. */}
          <button
            type="button"
            onClick={() => toggleItem(item.id)}
            aria-pressed={item.completed}
            aria-label={item.completed ? t(`Mark "${item.text}" as open`, `«${item.text}» wieder öffnen`) : t(`Check off "${item.text}"`, `«${item.text}» abhaken`)}
            className="press flex flex-1 min-w-0 items-center gap-3 p-4 text-left min-h-[3.5rem]"
          >
            <span
              className={`w-6 h-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-[background-color,border-color,transform] duration-300 ${
                item.completed ? "bg-orange-500 border-orange-500 scale-100" : "border-[var(--border-strong)]"
              }`}
              style={{ transitionTimingFunction: "var(--ease-spring)" }}
            >
              {item.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </span>

            <span className="min-w-0">
              <span
                className={`block text-lg font-medium truncate transition-colors ${
                  item.completed ? "text-[var(--text-tertiary)] line-through" : "text-[var(--text)]"
                }`}
              >
                {item.text}
              </span>
              <span className="flex flex-wrap gap-x-3 text-sm text-[var(--text-secondary)] tabular-nums">
                {item.price !== null && <span>CHF {formatPrice(item.price)}</span>}
                {usual !== null && (
                  <span className="text-[var(--text-tertiary)]">{t(`Usually CHF ${formatPrice(usual)}`, `Meist CHF ${formatPrice(usual)}`)}</span>
                )}
                {item.store && (
                  <span className="inline-flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {item.store}
                  </span>
                )}
              </span>
            </span>
          </button>

          {offers && !item.completed && (
            <a
              href={offers}
              target="_blank"
              rel="noopener noreferrer"
              className="press row-action p-2 rounded-full text-[var(--text-tertiary)] hover:text-orange-500 transition-colors"
              title={t(`Offers at ${item.store}`, `Angebote bei ${item.store}`)}
              aria-label={t(`Offers at ${item.store} (opens the store's website)`, `Angebote bei ${item.store} (öffnet die Website des Ladens)`)}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {!item.completed && (
            <button
              type="button"
              onClick={() => searchItem(item)}
              className="press row-action p-2 rounded-full text-[var(--text-tertiary)] hover:text-blue-500 transition-colors"
              title={t("Look up prices", "Preise nachschlagen")}
              aria-label={t(`Look up prices for "${item.text}"`, `Preise für «${item.text}» nachschlagen`)}
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => deleteItem(item.id)}
            className="press row-action text-[var(--text-tertiary)] hover:text-[var(--danger)] p-3 rounded-full hover:bg-[var(--danger-soft)] transition-colors mr-1"
            aria-label={t(`Remove "${item.text}"`, `«${item.text}» entfernen`)}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {asking && (
          <form
            className="flex items-center gap-2 px-4 pb-4 animate-rise"
            onSubmit={(e) => {
              e.preventDefault();
              const value = parseFloat(priceDraft.replace(",", "."));
              if (Number.isFinite(value) && value >= 0) {
                savePrice(item.id, value);
                setPriceDraft("");
              }
            }}
          >
            <label className="sr-only" htmlFor={`price-${item.id}`}>
              {t("Price in CHF", "Preis in CHF")}
            </label>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">CHF</span>
              <input
                id={`price-${item.id}`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                autoFocus
                value={priceDraft}
                onChange={(e) => setPriceDraft(e.target.value)}
                placeholder={t("What did it cost?", "Was hat's gekostet?")}
                className="field pl-12"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={priceDraft === ""}>
              {t("Save", "Speichern")}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setPriceDraft("");
                skipPrice();
              }}
            >
              {t("Skip", "Überspringen")}
            </button>
          </form>
        )}
      </li>
    );
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <span className="text-caption">
          {t(`${open.filter((i) => !i.completed).length} items left`, `${open.filter((i) => !i.completed).length} Artikel offen`)}
        </span>
      </div>

      {/* Add Item Form */}
      <form onSubmit={addItem} className="mb-6 surface p-4">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={t("What do we need? (e.g. Milk)", "Was brauchen wir? (z. B. Milch)")}
            className="field"
            aria-label={t("Item", "Artikel")}
          />

          {suggestion !== null && (
            <button
              type="button"
              className="chip self-start press"
              onClick={() => {
                setNewPrice(suggestion.toFixed(2));
                if (suggestedStore) setNewStore(suggestedStore);
              }}
            >
              {t(`Usually CHF ${formatPrice(suggestion)}`, `Meist CHF ${formatPrice(suggestion)}`)}
              {suggestedStore ? ` · ${suggestedStore}` : ""}
            </button>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">CHF</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder={t("Price", "Preis")}
                className="field pl-12"
                aria-label={t("Price in CHF", "Preis in CHF")}
              />
            </div>

            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={newStore}
                onChange={(e) => setNewStore(e.target.value)}
                placeholder={t("Store (optional)", "Geschäft (optional)")}
                list="shops-list"
                className="field pl-9"
                aria-label={t("Store", "Geschäft")}
              />
              <datalist id="shops-list">
                {shops.map((shop) => (
                  <option key={shop} value={shop} />
                ))}
              </datalist>
            </div>

            <button
              type="submit"
              disabled={!newItem.trim()}
              className="btn btn-primary px-6"
              aria-label={t("Add item", "Artikel hinzufügen")}
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </form>

      {/* Shops Quick View */}
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex items-center gap-2">
          {shops.map((shop) => (
            <button
              key={shop}
              type="button"
              onClick={() => setNewStore(shop)}
              className="chip flex-shrink-0"
              data-active={newStore === shop}
            >
              {shop}
            </button>
          ))}
        </div>
      </div>

      {/* Open items */}
      <div className="surface overflow-hidden">
        {open.length === 0 ? (
          <div className="flex flex-col items-center p-8 text-center text-[var(--text-secondary)]">
            <Mascot mood="sleepy" size={80} />
            <p className="font-hand text-2xl font-semibold mt-2">
              {done.length > 0 ? t("All done.", "Alles erledigt.") : t("The list is empty.", "Die Liste ist leer.")}
            </p>
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {open.map(renderItem)}
          </ul>
        )}
      </div>

      {/* Done items live below, out of the way */}
      {done.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between px-1 mb-2">
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              aria-expanded={showDone}
              className="press text-micro inline-flex items-center gap-1"
            >
              <ChevronDown
                className="w-4 h-4 transition-transform duration-300"
                style={{ transform: showDone ? "rotate(0deg)" : "rotate(-90deg)", transitionTimingFunction: "var(--ease-spring)" }}
              />
              {t(`Done (${done.length})`, `Erledigt (${done.length})`)}
            </button>
            {showDone && (
              <button type="button" onClick={clearCompleted} className="press text-caption hover:text-[var(--text)]">
                {t("Clear", "Aufräumen")}
              </button>
            )}
          </div>
          {showDone && (
            <div className="surface overflow-hidden animate-rise">
              <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                {done.map(renderItem)}
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  );
}
