-- Cached Discogs market snapshot for each pressing (one row per Discogs release).
-- Filled by the discogs-market edge function; read by signed-in users.
-- Safe to run more than once. Run in the Supabase SQL editor (project vinyl-venue).

create table if not exists public.pressing_market (
  discogs_release_id bigint primary key,
  lowest_price numeric,
  currency text not null default 'USD',
  num_for_sale integer,
  have integer,
  want integer,
  suggested jsonb,
  fetched_at timestamptz not null default now()
);

alter table public.pressing_market enable row level security;

drop policy if exists "Signed-in users read market data" on public.pressing_market;
create policy "Signed-in users read market data"
  on public.pressing_market for select
  to authenticated
  using (true);
-- No insert/update policy on purpose: only the edge function (service role) writes.
