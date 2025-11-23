"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { ShoppingItem, SaleOffer } from "./types";
import ShoppingList from "./components/ShoppingList";
import DealsTab from "./components/DealsTab";

export default function ShoppingPage() {
  const [activeTab, setActiveTab] = useState<"list" | "deals">("list");
  const [items, setItems] = useState<ShoppingItem[]>([
    { id: "1", text: "Milk", completed: false, price: 1.95, store: "Migros" },
    { id: "2", text: "Chocolate", completed: false, price: 3.50, store: "Migros" },
    { id: "3", text: "Bread", completed: true, store: "Bakery" },
  ]);
  const [shops, setShops] = useState<string[]>(["Migros", "Coop", "Denner", "Aldi", "Lidl"]);
  const [newItem, setNewItem] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStore, setNewStore] = useState("");
  
  // Sales Data State
  const [currentStoreSales, setCurrentStoreSales] = useState<string>("");
  const [salesOffers, setSalesOffers] = useState<SaleOffer[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState("");

  // Category State
  const [selectedCategory, setSelectedCategory] = useState("All");

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
        setSalesError("Could not load live offers.");
      }
    } catch (err) {
      setSalesError("Failed to fetch offers.");
    } finally {
      setIsLoadingSales(false);
    }
  };

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
    // Switch to the tab for a better experience
    setActiveTab("deals");
    loadDeals(storeName);
  };

  const addDealToList = (offer: SaleOffer) => {
    const item: ShoppingItem = {
      id: Date.now().toString(),
      text: offer.title,
      completed: false,
      // Simple parsing for price, removing text like "was 1.40"
      price: parseFloat(offer.price.split(' ')[0].replace(/[^0-9.]/g, '')) || undefined,
      store: currentStoreSales,
    };
    setItems(prev => [item, ...prev]);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto relative">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <ShoppingCart className="mr-3 w-8 h-8 text-orange-500" />
          Shopping
        </h1>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "list"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            My List
          </button>
          <button
            onClick={() => {
              setActiveTab("deals");
              loadDeals("Migros");
            }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "deals"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Deals
          </button>
        </div>
      </div>

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
  );
}