-- ALREADY APPLIED to the vinyl-venue project (migration: grade_accuracy). Record only.
--
-- Buyers confirm, after delivery, whether the disc and sleeve grades were accurate:
--    1 = better than described, 0 = as described, -1 = one grade worse, -2 = two or more worse.
-- Collected from day one so the history exists by the time it matters.
--
-- vv_seller_grade_offsets() turns those answers into a per-seller grading offset:
--   * shrunk toward 0 (k = 4 pseudo-confirmations), so one angry buyer can't sink a new seller
--   * tracked separately for top grades (M / NM), where overgrading usually happens
--   * buyers who mark almost everything worse (3+ answers, average <= -1) count half
-- Internal only: used by seller_grading_accuracy() (public summary) and pressing_grade_stats().

alter table public.reviews
  add column if not exists media_accuracy smallint check (media_accuracy between -2 and 1),
  add column if not exists sleeve_accuracy smallint check (sleeve_accuracy between -2 and 1);

create or replace function public.vv_seller_grade_offsets()
returns table (seller_id uuid, confirmations integer, top_confirmations integer,
               offset_all numeric, offset_top numeric, as_described_pct numeric)
language sql stable security definer set search_path = public as $$
  with answers as (
    select r.seller_id, r.reviewer_id, r.media_accuracy, r.sleeve_accuracy,
           vv_grade_rank(l.media_condition) as listed_grade
    from reviews r
    join listings l on l.id = r.listing_id
    where r.media_accuracy is not null or r.sleeve_accuracy is not null
  ),
  buyer as (
    select reviewer_id, count(*) as n, avg(media_accuracy) as avg_acc
    from answers where media_accuracy is not null group by reviewer_id
  ),
  weighted as (
    select a.*, case when b.n >= 3 and b.avg_acc <= -1 then 0.5 else 1.0 end as w
    from answers a left join buyer b on b.reviewer_id = a.reviewer_id
  ),
  per_seller as (
    select seller_id,
      count(*)::int as confirmations,
      count(*) filter (where media_accuracy is not null and listed_grade >= 7)::int as top_confirmations,
      sum(w * media_accuracy) filter (where media_accuracy is not null) as s_all,
      sum(w) filter (where media_accuracy is not null) as w_all,
      sum(w * media_accuracy) filter (where media_accuracy is not null and listed_grade >= 7) as s_top,
      sum(w) filter (where media_accuracy is not null and listed_grade >= 7) as w_top,
      -- share of individual grade answers (disc and sleeve) that were as described or better
      (count(*) filter (where media_accuracy >= 0) + count(*) filter (where sleeve_accuracy >= 0))::numeric
        / nullif(count(media_accuracy) + count(sleeve_accuracy), 0) as pct
    from weighted group by seller_id
  )
  select seller_id, confirmations, top_confirmations,
    round(coalesce(s_all, 0) / (coalesce(w_all, 0) + 4), 3) as offset_all,
    round((coalesce(s_top, 0) + 4 * (coalesce(s_all, 0) / (coalesce(w_all, 0) + 4))) / (coalesce(w_top, 0) + 4), 3) as offset_top,
    round(100 * pct, 0) as as_described_pct
  from per_seller
$$;

revoke execute on function public.vv_seller_grade_offsets() from public, anon, authenticated;

-- Public summary for a seller's profile and listing cards. Says nothing until there are 3 answers.
create or replace function public.seller_grading_accuracy(p_seller uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object(
        'confirmations', o.confirmations,
        'as_described_pct', o.as_described_pct,
        'enough', o.confirmations >= 3,
        'label', case
          when o.confirmations < 3 then null
          when o.offset_top <= -0.35 or o.offset_all <= -0.35 then 'Tends to overgrade'
          when o.offset_all >= 0.2 then 'Grades conservatively'
          when o.as_described_pct >= 90 then 'Grades accurately'
          else 'Mostly accurate'
        end)
     from vv_seller_grade_offsets() o where o.seller_id = p_seller),
    jsonb_build_object('confirmations', 0, 'as_described_pct', null, 'enough', false, 'label', null))
$$;

revoke execute on function public.seller_grading_accuracy(uuid) from public, anon;
grant execute on function public.seller_grading_accuracy(uuid) to authenticated;

-- (migration: reviews_blind_grade_answers) was applied and then REVERTED with
-- `grant select on public.reviews to authenticated;` because column-level grants break the
-- deployed select('*') on reviews. Grade answers are therefore readable through the API for now.
-- PENDING (needs your OK, it drops two columns): move answers into a write-only
-- review_grade_checks table and drop reviews.media_accuracy / sleeve_accuracy.
