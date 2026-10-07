"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { MascotLoader } from "@/components/Mascot";
import { ShoppingItem } from "./types";
import ShoppingList from "./components/ShoppingList";
import PricesTab from "./components/PricesTab";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { supabase } from "../lib/supabase";
import FeatureOnboarding from "../components/FeatureOnboarding";
import { classify, formatPrice, itemKey, lastPurchase, summarize, usualPrice, type PriceLogEntry } from "./priceHistory";

const DEFAULT_SHOPS = ["Migros", "Coop", "Denner", "Aldi", "Lidl"];
/** How many past purchases we load to judge prices. */
const PRICE_LOG_LIMIT = 500;
/** How long "Removed — Undo" stays on screen. */
const UNDO_MS = 6000;

export default function ShoppingPage() {
  const { user, household } = useAuth();
  const { t } = useI18n();
  const householdId = household?.id;
  const userId = user?.id;
  const isEnabled = household?.enabledFeatures.includes("shopping") ?? false;

  const [activeTab, setActiveTab] = useState<"list" | "prices">("list");
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [priceLog, setPriceLog] = useState<PriceLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [newItem, setNewItem] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStore, setNewStore] = useState("");

  // The item that was just checked off without a price and is waiting for one.
  const [askPriceId, setAskPriceId] = useState<string | null>(null);
  // The last removed item(s), so a slip can be undone.
  const [removed, setRemoved] = useState<ShoppingItem[] | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Which price-log row belongs to which checked-off item, so un-checking can take it back.
  const logIdByItem = useRef(new Map<string, string>());

  const loadData = useCallback(async () => {
    if (!householdId) return;
    setLoadError(false);

    const [itemsRes, shopsRes] = await Promise.all([
      supabase
        .from("shopping_items")
        .select("*")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false }),
      supabase.from("shops").select("*").eq("household_id", householdId).order("name"),
    ]);

    if (itemsRes.error || shopsRes.error) {
      console.error(itemsRes.error || shopsRes.error);
      setLoadError(true);
      setIsLoading(false);
      return;
    }

    setItems(itemsRes.data as ShoppingItem[]);

    let shopNames = (shopsRes.data ?? []).map((s) => s.name);
    if (shopNames.length === 0) {
      // First time this household opens Shopping — seed the starter shops.
      // ignoreDuplicates guards against two members racing to seed at once.
      const { data: seeded, error: seedError } = await supabase
        .from("shops")
        .upsert(
          DEFAULT_SHOPS.map((name) => ({ household_id: householdId, name })),
          { onConflict: "household_id,name", ignoreDuplicates: true }
        )
        .select();
      shopNames = seedError ? DEFAULT_SHOPS : (seeded ?? []).map((s) => s.name);
    }
    setShops(shopNames.sort());
    setIsLoading(false);
  }, [householdId]);

  // The price memory is an extra: if it cannot load, the list still works.
  const loadPriceLog = useCallback(async () => {
    if (!householdId) return;
    const { data, error } = await supabase
      .from("shopping_price_log")
      .select("id, item_key, item_name, store, price, bought_at")
      .eq("household_id", householdId)
      .order("bought_at", { ascending: false })
      .limit(PRICE_LOG_LIMIT);
    if (error) {
      console.warn("Could not load the price log:", error);
      return;
    }
    setPriceLog((data ?? []).map((row) => ({ ...row, price: Number(row.price) })));
  }, [householdId]);

  useEffect(() => {
    setIsLoading(true);
    loadData();
    loadPriceLog();
  }, [loadData, loadPriceLog]);

  // Live sync: reload whenever any household member adds/edits/removes an
  // item or shop (including our own writes, which is harmless).
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`shopping-${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_items", filter: `household_id=eq.${householdId}` },
        loadData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shops", filter: `household_id=eq.${householdId}` },
        loadData
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, loadData]);

  // Its own channel: if the price log is unavailable, live sync of the list must not suffer.
  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`shopping-prices-${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_price_log", filter: `household_id=eq.${householdId}` },
        loadPriceLog
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, loadPriceLog]);

  useEffect(() => {
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  const trends = useMemo(() => summarize([...priceLog]), [priceLog]);
  const usualFor = useCallback(
    (text: string, store: string | null) => usualPrice(priceLog, itemKey(text), store),
    [priceLog]
  );
  const lastStoreFor = useCallback((text: string) => lastPurchase(priceLog, itemKey(text))?.store ?? null, [priceLog]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim() || !householdId) return;

    const storeName = newStore.trim() || null;
    const price = newPrice ? parseFloat(newPrice) : null;

    const { data, error } = await supabase
      .from("shopping_items")
      .insert({ household_id: householdId, text: newItem.trim(), price, store: storeName })
      .select()
      .single();

    if (error) {
      console.error("Failed to add item:", error);
      return;
    }

    setItems((prev) => [data as ShoppingItem, ...prev]);

    if (storeName && !shops.includes(storeName)) {
      const { data: shop } = await supabase
        .from("shops")
        .upsert({ household_id: householdId, name: storeName }, { onConflict: "household_id,name", ignoreDuplicates: true })
        .select()
        .maybeSingle();
      if (shop) setShops((prev) => [...prev, shop.name].sort());
    }

    setNewItem("");
    setNewPrice("");
    setNewStore("");
  };

  // A purchase: remember the price, tell if it changed, and log the expense —
  // private to whichever member actually checked it off.
  const recordPurchase = async (item: ShoppingItem, price: number) => {
    if (!householdId || !userId) return;
    const key = itemKey(item.text);
    const usualBefore = usualPrice(priceLog, key, item.store);

    const { data: logRow, error: logError } = await supabase
      .from("shopping_price_log")
      .insert({
        household_id: householdId,
        item_key: key,
        item_name: item.text,
        store: item.store,
        price,
      })
      .select("id, item_key, item_name, store, price, bought_at")
      .single();
    if (logError) {
      console.warn("Could not save the price:", logError);
    } else if (logRow) {
      logIdByItem.current.set(item.id, logRow.id);
      setPriceLog((prev) => [{ ...logRow, price: Number(logRow.price) }, ...prev]);
    }

    try {
      const { mapStoreToCategory } = await import("../../lib/storeMapping");
      const { showToast } = await import("../../lib/toast");

      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          household_id: householdId,
          user_id: userId,
          title: item.text,
          amount: price,
          date: new Date().toISOString(),
          category: mapStoreToCategory(item.store),
          note: t(
            `Added from Shopping list (${item.store || "unknown store"})`,
            `Aus der Einkaufsliste hinzugefügt (${item.store || "Geschäft unbekannt"})`
          ),
        })
        .select()
        .single();
      if (expenseError) throw expenseError;

      window.dispatchEvent(new CustomEvent("expense:undoable", { detail: expense }));
      showToast(
        t(
          `Added expense ${expense.title} — CHF ${formatPrice(expense.amount)}`,
          `Ausgabe ${expense.title} hinzugefügt – CHF ${formatPrice(expense.amount)}`
        ),
        "success"
      );

      // News, not an alarm: just say what it was before.
      const direction = classify(price, usualBefore);
      if (usualBefore !== null && (direction === "up" || direction === "down")) {
        showToast(
          t(
            `${item.text}: CHF ${formatPrice(price)}, usually ${formatPrice(usualBefore)}`,
            `${item.text}: CHF ${formatPrice(price)}, sonst ${formatPrice(usualBefore)}`
          ),
          "info",
          6000
        );
      }
    } catch (err) {
      console.error("Failed to add expense from shopping item", err);
    }
  };

  const toggleItem = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const nextCompleted = !target.completed;

    // Respond first, sync after: the checkmark must not wait for the network.
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completed: nextCompleted } : i)));
    if (askPriceId === id) setAskPriceId(null);

    const { error } = await supabase.from("shopping_items").update({ completed: nextCompleted }).eq("id", id);
    if (error) {
      console.error("Failed to toggle item:", error);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completed: target.completed } : i)));
      return;
    }

    if (nextCompleted) {
      if (target.price !== null) await recordPurchase(target, target.price);
      else setAskPriceId(id);
    } else {
      // Un-checking takes back the price we just remembered for it.
      const logId = logIdByItem.current.get(id);
      if (logId) {
        logIdByItem.current.delete(id);
        setPriceLog((prev) => prev.filter((e) => e.id !== logId));
        const { error: undoError } = await supabase.from("shopping_price_log").delete().eq("id", logId);
        if (undoError) console.warn("Could not take back the price:", undoError);
      }
    }
  };

  const savePrice = async (id: string, price: number) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    setAskPriceId(null);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, price } : i)));
    const { error } = await supabase.from("shopping_items").update({ price }).eq("id", id);
    if (error) console.error("Failed to save price:", error);
    await recordPurchase({ ...target, price }, price);
  };

  const offerUndo = (gone: ShoppingItem[]) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setRemoved(gone);
    undoTimer.current = setTimeout(() => setRemoved(null), UNDO_MS);
  };

  const deleteItem = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (askPriceId === id) setAskPriceId(null);
    offerUndo([target]);
    const { error } = await supabase.from("shopping_items").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete item:", error);
      setRemoved(null);
      loadData();
    }
  };

  const clearCompleted = async () => {
    const gone = items.filter((i) => i.completed);
    if (gone.length === 0) return;
    setItems((prev) => prev.filter((i) => !i.completed));
    offerUndo(gone);
    const { error } = await supabase
      .from("shopping_items")
      .delete()
      .in("id", gone.map((i) => i.id));
    if (error) {
      console.error("Failed to clear completed items:", error);
      setRemoved(null);
      loadData();
    }
  };

  const undoRemove = async () => {
    if (!removed || !householdId) return;
    const restore = removed;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setRemoved(null);
    setItems((prev) => [...restore, ...prev]);
    const { error } = await supabase
      .from("shopping_items")
      .insert(restore.map((i) => ({ ...i, household_id: householdId })));
    if (error) {
      console.error("Failed to restore items:", error);
      loadData();
    }
  };

  const searchItem = (item: ShoppingItem) => {
    if (item.store?.toLowerCase().includes("migros")) {
      window.open(`https://www.migros.ch/de/search?query=${encodeURIComponent(item.text)}`, "_blank", "noopener,noreferrer");
    } else if (item.store?.toLowerCase().includes("coop")) {
      window.open(`https://www.coop.ch/de/search/?text=${encodeURIComponent(item.text)}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(item.text)}+price+near+me`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto relative">
      <div className="flex items-center justify-between mb-6 animate-rise">
        <h1 className="text-display flex items-center">
          <ShoppingCart className="mr-3 w-8 h-8 text-orange-500" />
          {t("Shopping", "Einkauf")}
        </h1>
        {householdId && isEnabled && (
          <div className="relative flex rounded-[var(--radius-md)] p-1 bg-[var(--surface-2)]" role="tablist">
            <span
              aria-hidden
              className="absolute inset-y-1 rounded-[calc(var(--radius-md)-2px)] bg-[var(--surface)] shadow-sm"
              style={{
                width: "calc(50% - 4px)",
                left: 4,
                transform: activeTab === "prices" ? "translateX(calc(100% + 0px))" : "translateX(0)",
                transitionProperty: "transform",
                transitionDuration: "var(--dur-base)",
                transitionTimingFunction: "var(--ease-spring)",
              }}
            />
            <button
              role="tab"
              aria-selected={activeTab === "list"}
              onClick={() => setActiveTab("list")}
              className="relative z-10 press px-4 py-1.5 rounded-md text-sm font-medium text-[var(--text)]"
            >
              {t("My List", "Meine Liste")}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "prices"}
              onClick={() => setActiveTab("prices")}
              className="relative z-10 press px-4 py-1.5 rounded-md text-sm font-medium text-[var(--text)]"
            >
              {t("Prices", "Preise")}
            </button>
          </div>
        )}
      </div>

      {!householdId ? (
        <div className="surface p-8 text-center animate-rise">
          <p className="text-body text-[var(--text-secondary)] mb-4">
            {t("Join or create a household to start a shared shopping list.", "Tritt einem Haushalt bei oder erstelle einen, um eine gemeinsame Einkaufsliste zu starten.")}
          </p>
          <Link href="/login" className="btn btn-primary inline-flex">
            {t("Go to Login", "Zur Anmeldung")}
          </Link>
        </div>
      ) : !isEnabled ? (
        <FeatureOnboarding
          feature="shopping"
          icon={ShoppingCart}
          title={t("Shopping List", "Einkaufsliste")}
          description={t(
            "A shared shopping list your whole household can add to and check off together.",
            "Eine gemeinsame Einkaufsliste, die alle im Haushalt ergänzen und abhaken können."
          )}
          bullets={[
            t("Everyone in the household sees the same list, live", "Alle im Haushalt sehen dieselbe Liste, live"),
            t("Tag items with a store and price to track spending", "Gib Geschäft und Preis an, um Ausgaben im Blick zu behalten"),
            t("See what things usually cost and when they get pricier", "Sieh, was etwas sonst kostet und wann es teurer wird"),
          ]}
        />
      ) : isLoading ? (
        <MascotLoader className="py-16" label={t("Loading", "Lädt")} />
      ) : loadError ? (
        <div className="surface p-8 text-center animate-rise">
          <p className="text-body mb-4" style={{ color: "var(--danger)" }}>
            {t("Could not load the shopping list.", "Die Einkaufsliste konnte nicht geladen werden.")}
          </p>
          <button onClick={loadData} className="btn btn-secondary">
            {t("Try again", "Nochmal versuchen")}
          </button>
        </div>
      ) : (
        <div className="animate-rise">
          {activeTab === "list" ? (
            <ShoppingList
              items={items}
              shops={shops}
              newItem={newItem}
              setNewItem={setNewItem}
              newPrice={newPrice}
              setNewPrice={setNewPrice}
              newStore={newStore}
              setNewStore={setNewStore}
              addItem={addItem}
              toggleItem={toggleItem}
              deleteItem={deleteItem}
              clearCompleted={clearCompleted}
              searchItem={searchItem}
              usualFor={usualFor}
              lastStoreFor={lastStoreFor}
              askPriceId={askPriceId}
              savePrice={savePrice}
              skipPrice={() => setAskPriceId(null)}
            />
          ) : (
            <PricesTab trends={trends} />
          )}
        </div>
      )}

      {removed && (
        <div
          role="status"
          className="material-sheet animate-sheet fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-2.5 rounded-[var(--radius-md)]"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)", boxShadow: "var(--shadow-lg)" }}
        >
          <span className="text-sm font-medium">
            {removed.length === 1
              ? t(`"${removed[0].text}" removed`, `«${removed[0].text}» entfernt`)
              : t(`${removed.length} items removed`, `${removed.length} Artikel entfernt`)}
          </span>
          <button onClick={undoRemove} className="press text-sm font-semibold" style={{ color: "var(--accent)" }}>
            {t("Undo", "Rückgängig")}
          </button>
        </div>
      )}
    </div>
  );
}
