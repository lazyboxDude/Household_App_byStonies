-- Routinen, phase 1: recurring chores and reminders (Abfuhr, Bad putzen, ...).
-- Additive only: two new tables plus one nullable column on calendar_events.
-- RLS follows the existing convention: household members manage their own household's rows.

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  kind text not null check (kind in ('chore', 'reminder')),
  title text not null,
  icon text not null default '🔁',
  -- See app/tasks/routines/types.ts (Schedule) for the shape.
  schedule jsonb not null,
  mode text not null default 'fixed' check (mode in ('fixed', 'after_done')),
  -- 1-12; null = all year (e.g. Grünabfuhr only March to November)
  active_months integer[],
  lead_days integer not null default 0 check (lead_days between 0 and 14),
  assignee_id uuid references public.profiles(id) on delete set null,
  show_in_calendar boolean not null default true,
  created_at timestamptz not null default now(),
  -- "after done" only makes sense for repeating intervals
  constraint routines_after_done_interval check (mode = 'fixed' or schedule->>'type' = 'interval')
);

create index routines_household_idx on public.routines (household_id);

create table public.routine_occurrences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'done', 'skipped')),
  assigned_to uuid references public.profiles(id) on delete set null,
  done_by uuid references public.profiles(id) on delete set null,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  -- Two household members opening the app at once must not create the same date twice.
  unique (routine_id, due_date)
);

create index routine_occurrences_household_due_idx on public.routine_occurrences (household_id, due_date);

alter table public.routines enable row level security;
alter table public.routine_occurrences enable row level security;

create policy "household members manage routines" on public.routines
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "household members manage routine_occurrences" on public.routine_occurrences
  for all to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- One calendar entry per occurrence; deleting the occurrence (or its routine) removes it.
-- UNIQUE (nullable, so older events are unaffected) keeps two simultaneous syncs from duplicating it.
alter table public.calendar_events
  add column source_occurrence_id uuid unique references public.routine_occurrences(id) on delete cascade;

alter publication supabase_realtime add table public.routines, public.routine_occurrences;
