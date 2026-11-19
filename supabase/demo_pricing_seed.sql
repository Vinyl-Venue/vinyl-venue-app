-- ALREADY RUN against the vinyl-venue project. Demo data for want requests, grade accuracy
-- and condition-split pricing. Every demo listing carries notes = 'demo:pricing' so it can be
-- removed with the cleanup block at the bottom.
--
-- Cast (existing demo profiles):
--   Grace Whitfield  accurate grader            Omar Haddad   overgrades his NM copies
--   Dev Raman        mostly accurate            Lena Voss     grades conservatively
--   Walt Hendricks   harsh buyer (marks nearly everything worse, so his answers count half)
-- Showcase pressing: OK Computer, Discogs release 8664384.

do $$
declare
  grace uuid := '62035b0a-c194-4a1d-99f9-659bae143093';
  omar  uuid := '366976e6-b366-4944-8469-d6d8c2debbb8';
  dev   uuid := '8503a6b8-5eb7-43ed-9cb3-65f32071a93e';
  lena  uuid := '20d33303-19e9-414a-9bb8-80b50e75bb50';
  mei   uuid := '2beeba0d-f0e0-44f3-bbcd-8cd0816af74c';
  jamal uuid := '17d34a7a-0c18-4df6-9924-10c6d60db3c6';
  sofia uuid := '4d09fe7c-a999-41d8-860f-8f5be2bb00f9';
  nora  uuid := '5510a19a-d386-4f36-9b38-60b16c3d048d';
  felix uuid := 'e9182010-c1c2-4334-b595-b0bc8a9de465';
  walt  uuid := '041969f8-90ba-4253-bd09-6f877e473c15';
  rosa  uuid := 'ecabe706-3d95-48cf-b74d-6a6dc4737f31';
  henry uuid := '065336ec-3201-4ed1-80b2-d1f283336a3e';
  r record;
  v_id bigint;
begin
  -- 1) Shipping on demo listings that never had any, so delivered prices mean something.
  --    Only demo profiles; Moe's and the info account's listings are untouched.
  update listings
  set shipping_price = 4.50 + (id % 7) * 0.5
  where shipping_price is null
    and listing_type in ('fixed', 'fixed_or_trade', 'auction')
    and user_id not in ('1619c33c-1bfc-4c05-8013-0a61fbc2a034', '5788b851-3ad5-4d2a-8c3f-765923d05802');

  -- 2) Sold copies with buyer grade confirmations.
  --    (seller, buyer, title, artist, media, sleeve, price, ship, days_ago, okc?, rating, media_acc, sleeve_acc)
  for r in
    select * from (values
      (grace, jamal, 'OK Computer', 'Radiohead', 'NM',  'NM',  34, 6, 20,  true,  5,  0,  0),
      (grace, sofia, 'OK Computer', 'Radiohead', 'VG+', 'VG+', 27, 6, 45,  true,  5,  0,  0),
      (grace, nora,  'OK Computer', 'Radiohead', 'VG',  'VG+', 19, 6, 60,  true,  5,  0,  1),
      (grace, henry, 'OK Computer', 'Radiohead', 'NM',  'NM',  36, 6, 120, true,  5,  0,  0),
      (omar,  rosa,  'OK Computer', 'Radiohead', 'NM',  'NM',  31, 5, 15,  true,  3, -1,  0),
      (omar,  felix, 'OK Computer', 'Radiohead', 'NM',  'NM',  30, 5, 35,  true,  3, -1, -1),
      (omar,  henry, 'OK Computer', 'Radiohead', 'NM',  'NM',  32, 5, 70,  true,  4, -1,  0),
      (dev,   mei,   'OK Computer', 'Radiohead', 'VG+', 'VG+', 26, 7, 25,  true,  5,  0,  0),
      (dev,   walt,  'OK Computer', 'Radiohead', 'NM',  'NM',  35, 7, 10,  true,  4, -1,  0),
      (lena,  jamal, 'OK Computer', 'Radiohead', 'VG+', 'NM',  28, 6, 40,  true,  5,  1,  0),
      (lena,  sofia, 'OK Computer', 'Radiohead', 'VG',  'VG',  18, 6, 90,  true,  5,  0,  0),
      -- history on other records, so each seller's grading pattern has enough answers
      (omar,  mei,   'Rumours', 'Fleetwood Mac',        'NM', 'NM',  28, 5, 50,  false, 3, -1,  0),
      (omar,  nora,  'Blue', 'Joni Mitchell',           'NM', 'NM',  40, 5, 80,  false, 2, -2, -1),
      (omar,  jamal, 'Aja', 'Steely Dan',               'NM', 'VG+', 33, 5, 100, false, 4, -1,  0),
      (omar,  sofia, 'Abbey Road', 'The Beatles',       'VG+','VG+', 30, 5, 110, false, 5,  0,  0),
      (grace, felix, 'Purple Rain', 'Prince',           'NM', 'NM',  29, 6, 30,  false, 5,  0,  0),
      (grace, rosa,  'Back to Black', 'Amy Winehouse',  'VG+','VG+', 24, 6, 55,  false, 5,  0,  0),
      (grace, mei,   'Born to Run', 'Bruce Springsteen','NM', 'VG+', 26, 6, 75,  false, 5,  0,  0),
      (dev,   walt,  'Thriller', 'Michael Jackson',     'VG+','VG+', 22, 7, 65,  false, 3, -1, -1),
      (lena,  walt,  'Hotel California', 'Eagles',      'VG+','VG+', 20, 6, 85,  false, 3, -2, -1),
      (lena,  henry, 'Illmatic', 'Nas',                 'VG', 'VG+', 25, 6, 95,  false, 5,  1,  1)
    ) as t(seller, buyer, title, artist, media, sleeve, price, ship, days_ago, okc, rating, macc, sacc)
  loop
    if r.okc then
      insert into listings (user_id, title, artist, year, genre, label, pressing_country, catalog_number, format,
        pressing_year, discogs_release_id, pressing_status, media_condition, sleeve_condition, price, shipping_price,
        listing_type, status, sold_price, sold_at, buyer_id, created_at, notes)
      values (r.seller, r.title, r.artist, 1997, 'Rock', 'XL Recordings', 'US', 'XLLP781', '2 × Vinyl, LP, Album, Reissue',
        2016, 8664384, 'confirmed', r.media, r.sleeve, r.price, r.ship,
        'fixed', 'sold', r.price, now() - make_interval(days => r.days_ago), r.buyer,
        now() - make_interval(days => r.days_ago + 7), 'demo:pricing')
      returning id into v_id;
    else
      insert into listings (user_id, title, artist, media_condition, sleeve_condition, price, shipping_price,
        listing_type, status, sold_price, sold_at, buyer_id, created_at, notes)
      values (r.seller, r.title, r.artist, r.media, r.sleeve, r.price, r.ship,
        'fixed', 'sold', r.price, now() - make_interval(days => r.days_ago), r.buyer,
        now() - make_interval(days => r.days_ago + 7), 'demo:pricing')
      returning id into v_id;
    end if;

    insert into reviews (listing_id, seller_id, reviewer_id, rating, body, media_accuracy, sleeve_accuracy, created_at)
    values (v_id, r.seller, r.buyer, r.rating,
      case when r.macc < 0 then 'Arrived fine but the vinyl was not really the grade listed.'
           when r.macc > 0 then 'Better than described. Great seller.'
           else 'Exactly as described, well packed.' end,
      r.macc, r.sacc, now() - make_interval(days => greatest(r.days_ago - 4, 0)));
  end loop;
end $$;

-- 3) Requests. Moe's account gets a few so you can see the flow signed in:
--    * OK Computer   max $38 delivered, VG+/VG+ min -> matches the two VG+ copies, not the NM at $39.50
--    * Kind of Blue  max $45 delivered, NM disc min -> near miss: the NM copy is $46 delivered
--    * Nevermind     pressing scope from the saved label / country / matrix, max $120, VG+ min
insert into want_requests (wishlist_item_id, user_id, max_price, min_media, min_sleeve, scope)
values
  (39, '1619c33c-1bfc-4c05-8013-0a61fbc2a034', 38,  'VG+', 'VG+', 'any'),
  (35, '1619c33c-1bfc-4c05-8013-0a61fbc2a034', 45,  'NM',  null,  'any'),
  (16, '1619c33c-1bfc-4c05-8013-0a61fbc2a034', 120, 'VG+', 'VG',  'pressing')
on conflict (wishlist_item_id) do nothing;

-- Demo members: a request on every Most Wanted item that has an active fixed-price copy listed,
-- with a max somewhere between 15% under and 20% over that copy's delivered price, so some
-- match and some don't.
insert into want_requests (wishlist_item_id, user_id, max_price, min_media, scope)
select distinct on (w.id) w.id, w.user_id,
  round((l.price + coalesce(l.shipping_price, 0)) * (0.85 + ((w.id % 8) * 0.05)), 0),
  case when w.id % 3 = 0 then 'NM' when w.id % 3 = 1 then 'VG+' else null end,
  'any'
from wishlist_items w
join listings l on vv_norm(l.title) = vv_norm(w.title) and vv_norm(l.artist) = vv_norm(w.artist)
where l.status = 'active' and l.listing_type in ('fixed', 'fixed_or_trade') and l.user_id <> w.user_id
  and w.user_id not in ('1619c33c-1bfc-4c05-8013-0a61fbc2a034', '5788b851-3ad5-4d2a-8c3f-765923d05802')
order by w.id, l.price
on conflict (wishlist_item_id) do nothing;

-- 4) New copies listed AFTER the requests exist, so the listing-side trigger fires and sends
--    notifications. Two match Moe's requests, two deliberately don't.
insert into listings (user_id, title, artist, year, genre, label, pressing_country, catalog_number, format,
  pressing_year, discogs_release_id, pressing_status, media_condition, sleeve_condition, price, shipping_price,
  listing_type, status, notes)
values
  -- match: VG+/VG+ at $30 + $6 = $36 <= $38
  ('366976e6-b366-4944-8469-d6d8c2debbb8', 'OK Computer', 'Radiohead', 1997, 'Rock', 'XL Recordings', 'US', 'XLLP781',
   '2 × Vinyl, LP, Album, Reissue', 2016, 8664384, 'confirmed', 'VG+', 'VG+', 30, 6, 'fixed', 'active', 'demo:pricing'),
  -- no match: VG disc is below the VG+ minimum even though it's cheap
  ('8503a6b8-5eb7-43ed-9cb3-65f32071a93e', 'OK Computer', 'Radiohead', 1997, 'Rock', 'XL Recordings', 'US', 'XLLP781',
   '2 × Vinyl, LP, Album, Reissue', 2016, 8664384, 'confirmed', 'VG', 'VG+', 17, 6, 'fixed', 'active', 'demo:pricing');

insert into listings (user_id, title, artist, year, genre, label, pressing_country, catalog_number, matrix_number,
  media_condition, sleeve_condition, price, shipping_price, listing_type, status, notes)
values
  -- match: pressing scope, label "DGC" equals "DGC (2)", US, matrix 04-1; $95 + $7 = $102
  ('62035b0a-c194-4a1d-99f9-659bae143093', 'Nevermind', 'Nirvana', 1991, 'Rock', 'DGC', 'US', 'DGC-24425', '04-1',
   'VG+', 'VG+', 95, 7, 'fixed', 'active', 'demo:pricing'),
  -- no match: right album and price, but no matrix stated, so the pressing can't be confirmed
  ('20d33303-19e9-414a-9bb8-80b50e75bb50', 'Nevermind', 'Nirvana', 1991, 'Rock', 'DGC', 'US', 'DGC-24425', null,
   'NM', 'NM', 90, 6, 'fixed', 'active', 'demo:pricing');

-- ---------------------------------------------------------------------------------------------
-- CLEANUP (run manually before launch):
--   delete from want_requests;                     -- or limit to demo user ids
--   delete from notifications where type = 'want_match';
--   delete from reviews where listing_id in (select id from listings where notes = 'demo:pricing');
--   delete from listings where notes = 'demo:pricing';
--   -- shipping added in step 1 can stay; it only touched demo profiles' listings.
