import { supabase } from '../supabaseClient'

// Discogs grade names for the condition codes the app uses.
const GRADE_KEYS = {
  M: 'Mint (M)',
  NM: 'Near Mint (NM or M-)',
  'VG+': 'Very Good Plus (VG+)',
  VG: 'Very Good (VG)',
  'G+': 'Good Plus (G+)',
  G: 'Good (G)',
  F: 'Fair (F)',
  P: 'Poor (P)'
}

// Loads the cached market snapshot for one pressing (refreshed daily by the
// discogs-market edge function). Returns null when there's nothing to show.
export async function loadMarket(discogsReleaseId) {
  if (!discogsReleaseId) return null
  const { data, error } = await supabase.functions.invoke(`discogs-market?id=${discogsReleaseId}`, { method: 'GET' })
  if (error || !data?.market) return null
  return data.market
}

// Discogs' suggested price for a media condition, or null when Discogs gave none.
export function suggestedPriceFor(market, mediaCondition) {
  const key = GRADE_KEYS[String(mediaCondition || '').trim()]
  const value = key && market?.suggested ? market.suggested[key] : null
  return Number.isFinite(Number(value)) ? Number(value) : null
}

export function money(value, currency = 'USD') {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString(undefined, { style: 'currency', currency, minimumFractionDigits: n % 1 === 0 ? 0 : 2 })
}
