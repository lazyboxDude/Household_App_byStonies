-- Einkauf: Preisgedächtnis. One row per purchase of a shopping item that had a price,
-- so the app can say "Pasta kostet sonst 1.20" and notice when something got dearer.
-- Additive only: one new table. Kept apart from shopping_items so deleting a done item
-- from the list does not erase its price history.
-- RLS follows the existing convention: household members manage their own household's rows.

create table public.shopping_price_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  -- Normalised name (see itemKey in app/shopping/priceHistory.ts): "Pasta" and " pasta" are one item.
  item_key text not null,
  -- The name as typed, for display.
  item_name text not null,
  store text,
  price numeric(10, 2) not null check (price >= 0),
  bought_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null default auth.uid()
);

create index shopping_price_log_household_item_idx
  on public.shopping_price_log (household_id, item_key, bought_at desc);

alter table public.shopping_price_log enable row level security;

create policy "household members manage shopping_price_log" on public.shopping_price_log
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

alter publication supabase_realtime add table public.shopping_price_log;
