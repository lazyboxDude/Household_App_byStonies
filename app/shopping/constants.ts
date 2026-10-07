// Where each store publishes its current offers. We link out instead of
// copying them: the stores' own pages and apps are always more current.
export const STORE_LINKS: Record<string, string> = {
  "Migros": "https://www.migros.ch/de/offers/home",
  "Coop": "https://www.coop.ch/de/aktionen.html",
  "Denner": "https://www.denner.ch/de/aktionen/",
  "Aldi": "https://www.aldi-suisse.ch/de/angebote/",
  "Lidl": "https://www.lidl.ch/c/de-CH/angebote/a10006068"
};

/** The offers page for a store name as people type it ("Migros Zürich" finds Migros); null if unknown. */
export function offersUrl(store: string | null | undefined): string | null {
  if (!store) return null;
  const name = store.toLowerCase();
  const key = Object.keys(STORE_LINKS).find((k) => name.includes(k.toLowerCase()));
  return key ? STORE_LINKS[key] : null;
}
