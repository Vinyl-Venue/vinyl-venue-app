-- Pressing details (Discogs-style) for albums and listings.
-- Safe to run more than once.
alter table public.albums
  add column if not exists catalog_number text,
  add column if not exists format text,
  add column if not exists vinyl_color text,
  add column if not exists edition text,
  add column if not exists pressing_year integer,
  add column if not exists barcode text,
  add column if not exists notes text;

alter table public.listings
  add column if not exists catalog_number text,
  add column if not exists format text,
  add column if not exists vinyl_color text,
  add column if not exists edition text,
  add column if not exists pressing_year integer,
  add column if not exists barcode text,
  add column if not exists matrix_number text,
  add column if not exists deadwax text,
  add column if not exists notes text;

-- Makes "other pressings of this album" lookups fast.
create index if not exists listings_title_artist_active_idx
  on public.listings (lower(title), lower(artist)) where status = 'active';
