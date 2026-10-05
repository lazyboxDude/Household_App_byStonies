"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { MascotLoader } from "@/components/Mascot";
import { ShoppingItem, SaleOffer } from "./types";
import ShoppingList from "./components/ShoppingList";
import DealsTab from "./components/DealsTab";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/LanguageContext";
import { supabase } from "../lib/supabase";
import FeatureOnboarding from "../components/FeatureOnboarding";

const DEFAULT_SHOPS = ["Migros", "Coop", "Denner", "Aldi", "Lidl"];

export default function ShoppingPage() {
  const { user, household } = useAuth();
  const { t } = useI18n();
  const householdId = household?.id;
  const userId = user?.id;
  const isEnabled = household?.enabledFeatures.includes("shopping") ?? false;

  const [activeTab, setActiveTab] = useState<"list" | "deals">("list");
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [newItem, setNewItem] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStore, setNewStore] = useState("");

  // Sales Data State
  const [currentStoreSales, setCurrentStoreSales] = useState<string>("");
  const [salesOffers, setSalesOffers] = useState<SaleOffer[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState<"" | "load" | "fetch">("");

  // Category State
  const [selectedCategory, setSelectedCategory] = useState("All");

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

  useEffect(() => {
    setIsLoading(true);
    loadData();
  }, [loadData]);

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

  // Fetch deals
  const loadDeals = async (storeName: string = "Migros") => {
    setIsLoadingSales(true);
    setSalesError("");
    setSalesOffers([]);
    setCurrentStoreSales(storeName);

    try {
      const res = await fetch(`/api/sales?store=${storeName}`);
      const data = await res.json();

      if (data.offers && data.offers.length > 0) {
        setSalesOffers(data.offers);
      } else {
        setSalesError("load");
      }
    } catch {
      setSalesError("fetch");
    } finally {
      setIsLoadingSales(false);
    }
  };

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

  const simulateFindShops = async () => {
    if (!householdId) return;
    // In a real app, this would use the Google Places API
    const nearby = ["Local Market", "Fresh Grocer", "City Supermarket"];
    const newShopNames = nearby.filter((s) => !shops.includes(s));
    if (newShopNames.length === 0) {
      alert(t("No new shops found nearby.", "Keine neuen Geschäfte in der Nähe gefunden."));
      return;
    }
    const { data, error } = await supabase
      .from("shops")
      .upsert(
        newShopNames.map((name) => ({ household_id: householdId, name })),
        { onConflict: "household_id,name", ignoreDuplicates: true }
      )
      .select();
    if (error) {
      console.error("Failed to add nearby shops:", error);
      return;
    }
    setShops((prev) => [...new Set([...prev, ...(data ?? []).map((s) => s.name)])].sort());
    alert(t(`Found ${data?.length ?? 0} nearby shops.`, `${data?.length ?? 0} Geschäfte in der Nähe gefunden.`));
  };

  const toggleItem = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const nextCompleted = !target.completed;

    const { data, error } = await supabase
      .from("shopping_items")
      .update({ completed: nextCompleted })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Failed to toggle item:", error);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === id ? (data as ShoppingItem) : i)));

    // If the item was just marked completed, log it as an expense — private
    // to whichever member actually checked it off.
    if (!target.completed && nextCompleted && householdId && userId) {
      let amount: number | null = target.price;
      if (amount === null) {
        const input = window.prompt(t(`Enter price for "${target.text}" (e.g. 2.50):`, `Preis für «${target.text}» eingeben (z. B. 2.50):`), '');
        if (input !== null) {
          const parsed = parseFloat(input.replace(/[^0-9.\\-]/g, ''));
          if (!isNaN(parsed)) {
            amount = parsed;
            await supabase.from("shopping_items").update({ price: parsed }).eq("id", id);
            setItems((prev) => prev.map((i) => (i.id === id ? { ...i, price: parsed } : i)));
          } else {
            amount = 0;
          }
        } else {
          amount = 0;
        }
      }

      const { mapStoreToCategory } = await import('../../lib/storeMapping');
      const category = mapStoreToCategory(target.store);

      try {
        const { data: expense, error: expenseError } = await supabase
          .from("expenses")
          .insert({
            household_id: householdId,
            user_id: userId,
            title: target.text,
            amount: amount || 0,
            date: new Date().toISOString(),
            category,
            note: t(`Added from Shopping list (${target.store || 'unknown store'})`, `Aus der Einkaufsliste hinzugefügt (${target.store || 'Geschäft unbekannt'})`),
          })
          .select()
          .single();
        if (expenseError) throw expenseError;

        window.dispatchEvent(new CustomEvent('expense:undoable', { detail: expense }));
        const { showToast } = await import('../../lib/toast');
        showToast(t(`Added expense ${expense.title} — $${expense.amount.toFixed(2)}`, `Ausgabe ${expense.title} hinzugefügt – $${expense.amount.toFixed(2)}`), 'success');
      } catch (err) {
        console.error('Failed to add expense from shopping item', err);
      }
    }
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const { error } = await supabase.from("shopping_items").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete item:", error);
      loadData();
    }
  };

  const searchItem = (item: ShoppingItem) => {
    if (item.store?.toLowerCase().includes('migros')) {
      window.open(`https://www.migros.ch/de/search?query=${encodeURIComponent(item.text)}`, '_blank');
    } else if (item.store?.toLowerCase().includes('coop')) {
      window.open(`https://www.coop.ch/de/search/?text=${encodeURIComponent(item.text)}`, '_blank');
    } else {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(item.text)}+price+near+me`, '_blank');
    }
  };

  // Called when clicking the % icon on a list item
  const viewSales = async (storeName: string) => {
    setActiveTab("deals");
    loadDeals(storeName);
  };

  const addDealToList = async (offer: SaleOffer) => {
    if (!householdId) return;
    const price = parseFloat(offer.price.split(' ')[0].replace(/[^0-9.]/g, '')) || null;
    const { data, error } = await supabase
      .from("shopping_items")
      .insert({ household_id: householdId, text: offer.title, price, store: currentStoreSales || null })
      .select()
      .single();
    if (error) {
      console.error("Failed to add deal to list:", error);
      return;
    }
    setItems((prev) => [data as ShoppingItem, ...prev]);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto relative">
      <div className="flex items-center justify-between mb-6 animate-rise">
        <h1 className="text-display flex items-center">
          <ShoppingCart className="mr-3 w-8 h-8 text-orange-500" />
          {t("Shopping", "Einkauf")}
        </h1>
        {householdId && isEnabled && (
          <div className="relative flex rounded-[var(--radius-md)] p-1 bg-[var(--surface-2)]">
            <span
              aria-hidden
              className="absolute inset-y-1 rounded-[calc(var(--radius-md)-2px)] bg-[var(--surface)] shadow-sm"
              style={{
                width: "calc(50% - 4px)",
                left: 4,
                transform: activeTab === "deals" ? "translateX(calc(100% + 0px))" : "translateX(0)",
                transitionProperty: "transform",
                transitionDuration: "var(--dur-base)",
                transitionTimingFunction: "var(--ease-spring)",
              }}
            />
            <button
              onClick={() => setActiveTab("list")}
              className="relative z-10 press px-4 py-1.5 rounded-md text-sm font-medium text-[var(--text)]"
            >
              {t("My List", "Meine Liste")}
            </button>
            <button
              onClick={() => {
                setActiveTab("deals");
                loadDeals("Migros");
              }}
              className="relative z-10 press px-4 py-1.5 rounded-md text-sm font-medium text-[var(--text)]"
            >
              {t("Deals", "Angebote")}
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
            t("Discover local deals and add them straight to your list", "Entdecke Angebote und setze sie direkt auf deine Liste"),
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
              simulateFindShops={simulateFindShops}
              toggleItem={toggleItem}
              deleteItem={deleteItem}
              searchItem={searchItem}
              viewSales={viewSales}
            />
          ) : (
            <DealsTab
              currentStoreSales={currentStoreSales}
              salesOffers={salesOffers}
              isLoadingSales={isLoadingSales}
              salesError={salesError}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              loadDeals={loadDeals}
              addDealToList={addDealToList}
            />
          )}
        </div>
      )}
    </div>
  );
}
