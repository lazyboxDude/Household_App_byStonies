-- Calendar feed (ICS subscription URL).
--
-- Each household gets a random, unguessable token. The route
-- /api/calendar/feed/<token>.ics calls get_calendar_feed(token) with the anon
-- key — no login, because Google/Apple/Outlook fetch the URL themselves.
-- The token is the only credential: anyone holding the URL can read the
-- household's events, so members can rotate it (rotate_calendar_feed_token)
-- to invalidate a leaked link.

alter table public.households
  add column if not exists calendar_feed_token uuid not null default gen_random_uuid();

create unique index if not exists households_calendar_feed_token_key
  on public.households (calendar_feed_token);

-- Public, token-gated read. Returns null for an unknown token. Only events from
-- the last 180 days onward are included to keep the feed small.
create or replace function public.get_calendar_feed(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', h.name,
    'events', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'title', e.title,
            'date', e.date,
            'time', e.time,
            'location', e.location,
            'type', e.type
          )
          order by e.date, e.time
        )
        from public.calendar_events e
        where e.household_id = h.id
          and e.date >= current_date - 180
      ),
      '[]'::jsonb
    )
  )
  from public.households h
  where h.calendar_feed_token = p_token;
$$;

-- Members can replace the token (e.g. after the link leaked).
create or replace function public.rotate_calendar_feed_token(p_household_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_token uuid := gen_random_uuid();
begin
  -- coalesce: a NULL result must deny, not skip the check.
  if not coalesce(public.is_household_member(p_household_id), false) then
    raise exception 'not a member of this household' using errcode = '42501';
  end if;

  update public.households
     set calendar_feed_token = new_token
   where id = p_household_id;

  return new_token;
end;
$$;

-- Supabase's default privileges grant EXECUTE on new functions to anon and
-- authenticated; spell out exactly who may call each one.
revoke all on function public.get_calendar_feed(uuid) from public, anon, authenticated;
grant execute on function public.get_calendar_feed(uuid) to anon, authenticated, service_role;

revoke all on function public.rotate_calendar_feed_token(uuid) from public, anon, authenticated;
grant execute on function public.rotate_calendar_feed_token(uuid) to authenticated, service_role;
