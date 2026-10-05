-- Routinen, phase 2: bills (Strom, Miete, Serafe, ...).
-- Additive: new nullable columns plus a wider `kind` check. Existing routines are unaffected.

alter table public.routines drop constraint routines_kind_check;
alter table public.routines
  add constraint routines_kind_check check (kind in ('chore', 'reminder', 'bill'));

alter table public.routines
  -- Amount per due date in CHF. For amount_kind 'variable' it may stay empty.
  add column amount numeric(12, 2) check (amount is null or amount >= 0),
  -- fixed: Miete. estimate: Strom-Abschlag, corrected when the real amount is known. variable: entered when paid.
  add column amount_kind text check (amount_kind in ('fixed', 'estimate', 'variable')),
  add column payer_id uuid references public.profiles(id) on delete set null,
  add column expense_category text;

-- Money fields belong to bills only, and a bill needs a kind of amount.
alter table public.routines
  add constraint routines_bill_fields check (
    (kind = 'bill' and amount_kind is not null and (amount_kind = 'variable' or amount is not null))
    or (kind <> 'bill' and amount is null and amount_kind is null and payer_id is null)
  );

-- What was actually paid, and the bookings it created (so "Rückgängig" can remove them).
alter table public.routine_occurrences
  add column amount numeric(12, 2) check (amount is null or amount >= 0),
  add column expense_id uuid references public.expenses(id) on delete set null,
  add column vt_tx_id uuid references public.verteilertopf_tx(id) on delete set null;
