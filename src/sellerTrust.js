import { supabase } from './supabaseClient'

// One place for what "trusted seller" means, so the marketplace cards and
// the profile never disagree. Earned by reputation, not bought: at least
// three reviews and a 4.5 average or better.
export const TRUSTED_MIN_REVIEWS = 3
export const TRUSTED_MIN_RATING = 4.5

export function isTrustedSeller(rating, reviewCount) {
  return Number(reviewCount) >= TRUSTED_MIN_REVIEWS && Number(rating) >= TRUSTED_MIN_RATING
}

// Blind buyer grade checks rolled up per seller (see supabase/grade_accuracy.sql):
// { confirmations, as_described_pct, enough, label }. Null if it can't be loaded.
export async function loadGradingAccuracy(sellerId) {
  if (!sellerId) return null
  const { data, error } = await supabase.rpc('seller_grading_accuracy', { p_seller: sellerId })
  return error ? null : data
}
