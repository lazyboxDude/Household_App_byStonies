export function mapStoreToCategory(store?: string | null | undefined) {
  if (!store) return 'Uncategorized';
  const name = store.trim().toLowerCase();
  const storeCategoryMap: Record<string, string> = {
    migros: 'Groceries',
    coop: 'Groceries',
    denner: 'Groceries',
    aldi: 'Groceries',
    lidl: 'Groceries',
    bakery: 'Food',
    'local market': 'Groceries',
    "baker": 'Food',
    "supermarket": 'Groceries',
    "farmers market": 'Groceries',
    "coffee shop": 'Food',
    "restaurant": 'Eating Out',
    "online": 'Online',
    "amazon": 'Online'
  };
  // try exact map
  if (storeCategoryMap[name]) return storeCategoryMap[name];
  // try contains
  for (const k of Object.keys(storeCategoryMap)) {
    if (name.includes(k)) return storeCategoryMap[k];
  }
  // default fallback to store name capitalized
  return store.split(' ').map(s => s[0]?.toUpperCase() + s.slice(1)).join(' ');
}
