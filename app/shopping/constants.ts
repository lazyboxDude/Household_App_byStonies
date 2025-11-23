import { Apple, Milk, Drumstick, Croissant, Cookie, Package } from "lucide-react";

export const STORE_LINKS: Record<string, string> = {
  "Migros": "https://www.migros.ch/de/angebote",
  "Coop": "https://www.coop.ch/de/aktionen.html",
  "Denner": "https://www.denner.ch/de/aktionen/",
  "Aldi": "https://www.aldi-suisse.ch/de/angebote/",
  "Lidl": "https://www.lidl.ch/c/de-CH/angebote/a10006068"
};

export const CATEGORIES = [
  { name: "All", icon: Package },
  { name: "Fruits & Vegetables", icon: Apple },
  { name: "Dairy", icon: Milk },
  { name: "Meat", icon: Drumstick },
  { name: "Bakery", icon: Croissant },
  { name: "Sweets", icon: Cookie },
];
