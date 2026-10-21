-- Links albums and listings to their exact Discogs release, and keeps the
-- styles and community numbers Discogs publishes. Safe to run more than once.
alter table public.albums
  add column if not exists discogs_release_id bigint,
  add column if not exists discogs_master_id bigint,
  add column if not exists styles text,
  add column if not exists discogs_have integer,
  add column if not exists discogs_want integer;

alter table public.listings
  add column if not exists discogs_release_id bigint,
  add column if not exists discogs_master_id bigint,
  add column if not exists styles text,
  add column if not exists discogs_have integer,
  add column if not exists discogs_want integer;

create index if not exists listings_discogs_master_idx
  on public.listings (discogs_master_id) where status = 'active';
