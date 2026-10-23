-- Records whether a seller confirmed the exact pressing or couldn't tell.
-- Safe to run more than once.
alter table public.albums add column if not exists pressing_status text;
alter table public.listings add column if not exists pressing_status text;
