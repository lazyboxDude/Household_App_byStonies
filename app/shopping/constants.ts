import { Apple, Milk, Drumstick, Croissant, Cookie, Package } from "lucide-react";

export const STORE_LINKS: Record<string, string> = {
  "Migros": "https://www.migros.ch/de/offers/home",
  "Coop": "https://www.coop.ch/de/aktionen.html",
  "Denner": "https://www.denner.ch/de/aktionen/",
  "Aldi": "https://www.aldi-suisse.ch/de/angebote/",
  "Lidl": "https://www.lidl.ch/c/de-CH/angebote/a10006068"
};

// `name` is the key the offers API uses; `label` is what people read.
export const CATEGORIES = [
  { name: "All", label: { en: "All", de: "Alle" }, icon: Package },
  { name: "Fruits & Vegetables", label: { en: "Fruits & Vegetables", de: "Obst & Gemüse" }, icon: Apple },
  { name: "Dairy", label: { en: "Dairy", de: "Milchprodukte" }, icon: Milk },
  { name: "Meat", label: { en: "Meat", de: "Fleisch" }, icon: Drumstick },
  { name: "Bakery", label: { en: "Bakery", de: "Backwaren" }, icon: Croissant },
  { name: "Sweets", label: { en: "Sweets", de: "Süsses" }, icon: Cookie },
];

export function categoryLabel(name: string, lang: "en" | "de"): string {
  return CATEGORIES.find((c) => c.name === name)?.label[lang] ?? name;
}
