-- Routinen, phase 4: Putzplan takeover and push reminders.
-- Additive: new nullable columns, one new table.

-- Cleaning Plan tasks that were taken over keep their row (nothing is deleted) but point at the routine.
-- If that routine is deleted, the link clears and the task shows up in the Cleaning Plan again.
alter table public.routines
  add column room_id uuid references public.rooms(id) on delete set null,
  add column supplies text[] not null default '{}';

alter table public.cleaning_tasks
  add column migrated_routine_id uuid references public.routines(id) on delete set null;

-- Set by the push sender so an occurrence is announced once.
alter table public.routine_occurrences
  add column notified_at timestamptz;

-- One row per device that wants reminders. Each person manages only their own devices;
-- the sender (server side, service role) reads all of them.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "people manage their own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
