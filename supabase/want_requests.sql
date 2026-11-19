-- ALREADY APPLIED to the vinyl-venue project (migration: want_requests). Record only.
--
-- Standing requests on Most Wanted items: "I want this album, at or under this
-- delivered price, in at least this condition." Alert-only (no payments yet).
--
-- Privacy rules this file enforces:
--   * Requests live in their own table, readable ONLY by their owner. Wishlist
--     rows are visible to followers, so the max price must never sit on them.
--   * Sellers never see a buyer's max price. A match notification goes to the
--     buyer only, and the buyer pays the seller's asking price, never their max.
--
-- Matching runs in the database, both ways:
--   * a listing is created or changed  -> match against every live request (notifies)
--   * a request is created or changed  -> match against every active listing (no notification;
--     the owner is looking at the form and sees the matches straight away)

-- Grade scale shared by matching and pricing. Higher is better.
create or replace function public.vv_grade_rank(g text)
returns integer language sql immutable as $$
  select case upper(trim(coalesce(g, '')))
    when 'M' then 8 when 'NM' then 7 when 'M-' then 7 when 'VG+' then 6 when 'VG' then 5
    when 'G+' then 4 when 'G' then 3 when 'F' then 2 when 'P' then 1
  end
$$;

create or replace function public.vv_grade_name(r integer)
returns text language sql immutable as $$
  select case r when 8 then 'M' when 7 then 'NM' when 6 then 'VG+' when 5 then 'VG'
    when 4 then 'G+' when 3 then 'G' when 2 then 'F' when 1 then 'P' end
$$;

-- Discogs labels carry a disambiguation suffix ("DGC (2)"); listings usually don't.
create or replace function public.vv_label_norm(x text)
returns text language sql immutable as $$
  select public.vv_norm(regexp_replace(coalesce(x, ''), '\s*\(\d+\)\s*$', ''))
$$;

create table if not exists public.want_requests (
  id bigint generated always as identity primary key,
  wishlist_item_id bigint not null unique references public.wishlist_items(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  max_price numeric(10,2) not null check (max_price > 0 and max_price <= 100000),
  min_media text check (min_media is null or public.vv_grade_rank(min_media) is not null),
  min_sleeve text check (min_sleeve is null or public.vv_grade_rank(min_sleeve) is not null),
  -- 'any' = any copy of the album; 'pressing' = the Discogs release below, or failing that
  -- the label / country / matrix saved on the Most Wanted item.
  scope text not null default 'any' check (scope in ('any', 'pressing')),
  discogs_release_id bigint,
  active boolean not null default true,
  expires_at timestamptz not null default now() + interval '90 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists want_requests_user_idx on public.want_requests(user_id);

create table if not exists public.want_request_matches (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.want_requests(id) on delete cascade,
  listing_id bigint not null references public.listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  delivered_price numeric(10,2) not null,
  dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (request_id, listing_id)
);
create index if not exists want_request_matches_user_idx on public.want_request_matches(user_id);
create index if not exists want_request_matches_listing_idx on public.want_request_matches(listing_id);

alter table public.want_requests enable row level security;
alter table public.want_request_matches enable row level security;

-- Owner only, and only on their own Most Wanted items.
drop policy if exists "Owners manage their requests" on public.want_requests;
create policy "Owners manage their requests" on public.want_requests
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.wishlist_items w where w.id = wishlist_item_id and w.user_id = (select auth.uid()))
  );

drop policy if exists "Owners read their matches" on public.want_request_matches;
create policy "Owners read their matches" on public.want_request_matches
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Owners dismiss their matches" on public.want_request_matches;
create policy "Owners dismiss their matches" on public.want_request_matches
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Matches are only ever written by the database; owners may flip `dismissed` and nothing else.
revoke insert, update, delete on public.want_request_matches from anon, authenticated;
grant update (dismissed) on public.want_request_matches to authenticated;
revoke all on public.want_requests from anon;

-- Does this listing satisfy this request? Conservative on purpose: when a request asks for a
-- grade or pressing detail the listing doesn't state, it is not a match.
create or replace function public.vv_request_matches_listing(r public.want_requests, w public.wishlist_items, l public.listings)
returns boolean language sql stable set search_path = public as $$
  select r.active
    and r.expires_at > now()
    and l.status = 'active'
    and l.listing_type in ('fixed', 'fixed_or_trade')
    and l.user_id <> r.user_id
    and vv_norm(l.title) = vv_norm(w.title)
    and vv_norm(l.artist) = vv_norm(w.artist)
    and (l.price + coalesce(l.shipping_price, 0)) <= r.max_price
    and (r.min_media is null or coalesce(vv_grade_rank(l.media_condition), 0) >= vv_grade_rank(r.min_media))
    and (r.min_sleeve is null or coalesce(vv_grade_rank(l.sleeve_condition), 0) >= vv_grade_rank(r.min_sleeve))
    and (
      r.scope = 'any'
      or (r.discogs_release_id is not null and l.discogs_release_id = r.discogs_release_id)
      or (
        r.discogs_release_id is null
        and (vv_label_norm(w.label) = '' or vv_label_norm(w.label) = vv_label_norm(l.label))
        and (vv_norm(w.pressing_country) = '' or vv_norm(w.pressing_country) = vv_norm(l.pressing_country))
        and (vv_norm(w.matrix_number) = '' or vv_norm(w.matrix_number) = vv_norm(l.matrix_number))
      )
    )
$$;

-- Listing side: new or changed listing -> record matches and notify each buyer once per listing.
create or replace function public.match_listing_to_requests()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'active' then
    return new;
  end if;

  with ins as (
    insert into want_request_matches (request_id, listing_id, user_id, delivered_price)
    select r.id, new.id, r.user_id, new.price + coalesce(new.shipping_price, 0)
    from want_requests r
    join wishlist_items w on w.id = r.wishlist_item_id
    where vv_request_matches_listing(r, w, new)
    on conflict (request_id, listing_id) do nothing
    returning user_id, delivered_price
  )
  insert into notifications (user_id, from_user_id, type, message, listing_id, album_title, album_artist)
  select ins.user_id, new.user_id, 'want_match',
    format('Request match: %s by %s, %s/%s, %s delivered',
      new.title, new.artist,
      coalesce(nullif(new.media_condition, ''), '?'), coalesce(nullif(new.sleeve_condition, ''), '?'),
      to_char(ins.delivered_price, 'FM$999,990.00')),
    new.id, new.title, new.artist
  from ins;

  return new;
end;
$$;

drop trigger if exists trg_match_listing_to_requests on public.listings;
create trigger trg_match_listing_to_requests
  after insert or update of status, price, shipping_price, media_condition, sleeve_condition,
    title, artist, discogs_release_id, listing_type, label, pressing_country, matrix_number
  on public.listings
  for each row execute function public.match_listing_to_requests();

-- Request side: keep matches in step with the request's current terms. Matches the owner has
-- dismissed are left alone so a dismissed copy doesn't come back.
create or replace function public.touch_want_request()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.refresh_request_matches()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  w wishlist_items;
begin
  select * into w from wishlist_items where id = new.wishlist_item_id;

  delete from want_request_matches m
  using listings l
  where m.request_id = new.id and m.dismissed = false and l.id = m.listing_id
    and l.status = 'active' and not vv_request_matches_listing(new, w, l);

  insert into want_request_matches (request_id, listing_id, user_id, delivered_price)
  select new.id, l.id, new.user_id, l.price + coalesce(l.shipping_price, 0)
  from listings l
  where l.status = 'active' and vv_request_matches_listing(new, w, l)
  on conflict (request_id, listing_id)
    do update set delivered_price = excluded.delivered_price;

  return new;
end;
$$;

drop trigger if exists trg_want_requests_touch on public.want_requests;
create trigger trg_want_requests_touch
  before update on public.want_requests
  for each row execute function public.touch_want_request();

drop trigger if exists trg_refresh_request_matches on public.want_requests;
create trigger trg_refresh_request_matches
  after insert or update on public.want_requests
  for each row execute function public.refresh_request_matches();

revoke execute on function public.match_listing_to_requests() from public, anon, authenticated;
revoke execute on function public.refresh_request_matches() from public, anon, authenticated;
