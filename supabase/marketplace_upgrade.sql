-- Marketplace upgrade: watchlist, live ticker events, price averages.
-- Safe to run more than once. Run in the Supabase SQL editor.

-- 1) Watchlist: users save auctions/listings they want to track.
create table if not exists public.watchlist (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  listing_id bigint not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);
create index if not exists watchlist_user_idx on public.watchlist (user_id);
alter table public.watchlist enable row level security;
drop policy if exists "Users see their own watchlist" on public.watchlist;
create policy "Users see their own watchlist" on public.watchlist for select using (auth.uid() = user_id);
drop policy if exists "Users add to their own watchlist" on public.watchlist;
create policy "Users add to their own watchlist" on public.watchlist for insert with check (auth.uid() = user_id);
drop policy if exists "Users remove from their own watchlist" on public.watchlist;
create policy "Users remove from their own watchlist" on public.watchlist for delete using (auth.uid() = user_id);

-- 2) Live ticker: let the client hear about shelf additions (row-level
--    security still limits albums to the owner and their followers) and
--    rarity rank changes.
do $$ begin
  begin alter publication supabase_realtime add table public.albums; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.rarity_scores; exception when duplicate_object then null; end;
end $$;

-- 3) Per-user opt-out for the activity ticker.
alter table public.profiles add column if not exists show_in_ticker boolean not null default true;

-- 4) Platform-wide average sold price per album (at least 3 sales in the
--    last 12 months). Security definer because sold listings are private
--    to their seller; only aggregate numbers leave the function.
create or replace function public.market_price_averages()
returns table (norm_title text, norm_artist text, avg_price numeric, sample_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select lower(regexp_replace(title, '[^a-zA-Z0-9]', '', 'g')),
         lower(regexp_replace(artist, '[^a-zA-Z0-9]', '', 'g')),
         round(avg(sold_price)::numeric, 2),
         count(*)
  from listings
  where status = 'sold' and sold_price is not null
    and sold_at > now() - interval '12 months'
    and listing_type <> 'trade'
  group by 1, 2
  having count(*) >= 3;
$$;
revoke all on function public.market_price_averages() from public;
grant execute on function public.market_price_averages() to authenticated;
