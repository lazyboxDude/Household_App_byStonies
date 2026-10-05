-- Routinen, phase 3: who does it (rotation, swap, absence), fairness and bill splits.
-- Additive: new columns with defaults, three new tables. Existing routines keep working.

alter table public.routines
  -- open: whoever has time. fixed: assignee_id. rotation: round-robin through `rotation`.
  -- fair_share: the member who has carried the least effort lately.
  add column assignment text not null default 'open' check (assignment in ('open', 'fixed', 'rotation', 'fair_share')),
  add column rotation uuid[],
  -- How heavy a chore feels (1 light ... 5 heavy); the Fairness-Waage adds these up.
  add column effort smallint not null default 2 check (effort in (1, 2, 3, 5)),
  -- Bills: user id -> percent, sums to 100. Empty = nothing to settle between members.
  add column split jsonb;

-- Routines that already have a fixed person keep them.
update public.routines set assignment = 'fixed' where assignee_id is not null;

alter table public.routines
  add constraint routines_rotation_members check (
    assignment <> 'rotation' or (rotation is not null and cardinality(rotation) >= 2)
  ),
  add constraint routines_split_bills_only check (split is null or kind = 'bill');

alter table public.routine_occurrences
  -- A manual swap: rotation changes (absence, new member) leave this occurrence alone.
  add column locked boolean not null default false,
  -- Copy of the routine's split at the time it was paid, so later changes do not rewrite history.
  add column split jsonb;

create table public.routine_absences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  created_at timestamptz not null default now(),
  check (from_date <= to_date)
);
create index routine_absences_household_idx on public.routine_absences (household_id, to_date);

-- "Ausgleich": one person paid another back (fully or in part) what the splits added up to.
create table public.routine_settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (from_user <> to_user)
);
create index routine_settlements_household_idx on public.routine_settlements (household_id);

create table public.routine_settings (
  household_id uuid primary key references public.households(id) on delete cascade,
  -- null = decide by member count (2 = couple, 3+ = wg)
  living_mode text check (living_mode in ('couple', 'wg')),
  -- user id -> target share in percent for the Fairness-Waage; null = everyone equal
  fairness_weights jsonb,
  updated_at timestamptz not null default now()
);

alter table public.routine_absences enable row level security;
alter table public.routine_settlements enable row level security;
alter table public.routine_settings enable row level security;

create policy "household members manage routine_absences" on public.routine_absences
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "household members manage routine_settlements" on public.routine_settlements
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "household members manage routine_settings" on public.routine_settings
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

alter publication supabase_realtime add table
  public.routine_absences, public.routine_settlements, public.routine_settings;
