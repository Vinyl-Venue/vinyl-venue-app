-- ALREADY APPLIED to the vinyl-venue project (migration: pressing_grade_stats). Record only.
--
-- pressing_grade_stats(rid) -> condition-split price picture for one pressing (Discogs release id).
--
-- For each media grade:
--   * Vinyl Venue sales in the last 24 months (fixed price and auctions, never trades)
--   * each sale is re-bucketed to its EFFECTIVE grade: if the seller's confirmed grading offset
--     rounds to a full grade (e.g. -0.6 -> one grade lower), their "NM" sale counts as VG+
--   * median item price, median delivered price (item + that sale's shipping), range, last sale
--   * Discogs' suggested price for the grade when the cache has one
--   * an estimate that blends the two: weight on our own sales = n / (n + 3), so thin data leans
--     on Discogs and our own sales take over as they build up
--   * confidence: none (Discogs only) / low (1-2) / medium (3-9) / high (10+),
--     one step lower when nothing sold in the last 6 months
-- Typical shipping = median shipping on this pressing's sales, else the platform-wide median.

create or replace function public.vv_discogs_grade_key(g integer)
returns text language sql immutable as $$
  select case g
    when 8 then 'Mint (M)' when 7 then 'Near Mint (NM or M-)' when 6 then 'Very Good Plus (VG+)'
    when 5 then 'Very Good (VG)' when 4 then 'Good Plus (G+)' when 3 then 'Good (G)'
    when 2 then 'Fair (F)' when 1 then 'Poor (P)' end
$$;

create or replace function public.pressing_grade_stats(rid bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_pm pressing_market;
  v_ship numeric;
  v_ship_source text;
  v_total integer;
  v_grades jsonb;
begin
  select * into v_pm from pressing_market where discogs_release_id = rid;

  select percentile_cont(0.5) within group (order by shipping_price) into v_ship
  from listings
  where discogs_release_id = rid and status = 'sold' and shipping_price is not null
    and sold_at > now() - interval '24 months';
  v_ship_source := case when v_ship is not null then 'pressing' end;
  if v_ship is null then
    select percentile_cont(0.5) within group (order by shipping_price) into v_ship
    from listings
    where status = 'sold' and shipping_price is not null and sold_at > now() - interval '12 months';
    v_ship_source := case when v_ship is not null then 'platform' end;
  end if;

  with offs as (select * from vv_seller_grade_offsets()),
  sales as (
    select l.sold_price as item,
           coalesce(l.shipping_price, v_ship, 0) as ship,
           l.sold_at,
           vv_grade_rank(l.media_condition) as listed_g,
           greatest(1, least(8,
             vv_grade_rank(l.media_condition)
             + round(coalesce(case when vv_grade_rank(l.media_condition) >= 7 then o.offset_top else o.offset_all end, 0))
           ))::int as eff_g
    from listings l
    left join offs o on o.seller_id = l.user_id
    where l.discogs_release_id = rid and l.status = 'sold' and l.sold_price is not null
      and l.listing_type <> 'trade' and l.sold_at > now() - interval '24 months'
      and vv_grade_rank(l.media_condition) is not null
  ),
  by_grade as (
    select eff_g as g, count(*)::int as n,
      percentile_cont(0.5) within group (order by item) as med_item,
      percentile_cont(0.5) within group (order by item + ship) as med_delivered,
      min(item + ship) as lo, max(item + ship) as hi, max(sold_at) as last_sold,
      count(*) filter (where eff_g <> listed_g)::int as adjusted,
      count(*) filter (where sold_at > now() - interval '6 months')::int as recent
    from sales group by eff_g
  ),
  all_grades as (
    select g.g, b.n, b.med_item, b.med_delivered, b.lo, b.hi, b.last_sold, b.adjusted, b.recent,
      nullif((v_pm.suggested ->> vv_discogs_grade_key(g.g))::numeric, 0) as disc
    from generate_series(8, 1, -1) as g(g)
    left join by_grade b on b.g = g.g
  ),
  scored as (
    select *,
      case
        when coalesce(n, 0) > 0 and disc is not null then (n::numeric / (n + 3)) * med_item + (3::numeric / (n + 3)) * disc
        when coalesce(n, 0) > 0 then med_item
        else disc
      end as est_item,
      case
        when coalesce(n, 0) = 0 then 0
        when n < 3 then 1
        when n < 10 then 2
        else 3
      end - case when coalesce(n, 0) > 0 and coalesce(recent, 0) = 0 then 1 else 0 end as conf_level
    from all_grades
    where coalesce(n, 0) > 0 or disc is not null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'grade', vv_grade_name(g),
      'sales', coalesce(n, 0),
      'adjusted', coalesce(adjusted, 0),
      'median_item', round(med_item::numeric, 2),
      'median_delivered', round(med_delivered::numeric, 2),
      'low_delivered', round(lo::numeric, 2),
      'high_delivered', round(hi::numeric, 2),
      'last_sold_at', last_sold,
      'discogs_suggested', round(disc, 2),
      'estimate_item', round(est_item::numeric, 2),
      'estimate_delivered', case when v_ship is not null then round((est_item + v_ship)::numeric, 2) end,
      'source', case when coalesce(n, 0) = 0 then 'discogs' when disc is null then 'venue' else 'blended' end,
      'confidence', case when coalesce(n, 0) = 0 then 'none' else case greatest(conf_level, 1) when 1 then 'low' when 2 then 'medium' else 'high' end end
    ) order by g desc), '[]'::jsonb),
    coalesce(sum(n), 0)::int
  into v_grades, v_total
  from scored;

  return jsonb_build_object(
    'rid', rid,
    'total_sales', v_total,
    'typical_shipping', round(v_ship::numeric, 2),
    'shipping_source', v_ship_source,
    'discogs', case when v_pm.discogs_release_id is null then null else jsonb_build_object(
      'lowest', nullif(v_pm.lowest_price, 0), 'for_sale', v_pm.num_for_sale,
      'currency', v_pm.currency, 'fetched_at', v_pm.fetched_at) end,
    'grades', v_grades
  );
end;
$$;

revoke execute on function public.pressing_grade_stats(bigint) from public, anon;
grant execute on function public.pressing_grade_stats(bigint) to authenticated;

-- (migration: grade_helpers_search_path)
alter function public.vv_grade_rank(text) set search_path = public;
alter function public.vv_grade_name(integer) set search_path = public;
alter function public.vv_label_norm(text) set search_path = public;
alter function public.vv_discogs_grade_key(integer) set search_path = public;
