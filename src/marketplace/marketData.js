import { supabase } from '../supabaseClient'
import { sleeveFactor } from './conditionFactors'

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
  const m = data.market
  // Discogs reports 0 when nothing is for sale; that's "no ask", not a free record.
  return { ...m, lowest_price: Number(m.lowest_price) > 0 ? m.lowest_price : null }
}

// Identifies one pressing for the Venue Index: Discogs release id when the copy has one,
// otherwise title + artist + catalogue number. Null when nothing identifies the pressing.
export function venueArgs(item) {
  if (!item) return null
  const rid = Number(item.discogsReleaseId) || null
  const cat = (item.catalogNumber || '').trim() || null
  if (!rid && !cat) return null
  return { rid, t: item.title || null, a: item.artist || null, cat }
}

// Platform-only score from member activity. Public: tier and score, never the inputs.
export async function loadVenueIndex(item) {
  const args = venueArgs(item)
  if (!args) return null
  const { data, error } = await supabase.rpc('venue_index_v3', args)
  return error ? null : data
}

// Full breakdown. The database only answers admins; anyone else gets an error and we return null.
export async function loadVenueBreakdown(item) {
  const args = venueArgs(item)
  if (!args) return null
  const { data, error } = await supabase.rpc('venue_breakdown_v3', args)
  return error ? null : data
}

// What collectors say they paid for this pressing. The database returns nothing unless at least
// 3 different people contributed, and never anything that identifies a person or a copy.
export async function loadReportedPrices(discogsReleaseId) {
  const rid = Number(discogsReleaseId) || null
  if (!rid) return null
  const { data, error } = await supabase.rpc('reported_price_stats', { p_release_id: rid })
  return error || !data || !data.enough ? null : data
}

export async function checkIsAdmin(userId) {
  if (!userId) return false
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle()
  return !!data
}

// Discogs' suggested price for a media condition, or null when Discogs gave none.
// Discogs' grade suggestions are for the disc; a sleeve below VG+ lowers the price (see conditionFactors.js).
export function suggestedPriceFor(market, mediaCondition, sleeveCondition = null) {
  const key = GRADE_KEYS[String(mediaCondition || '').trim()]
  const value = key && market?.suggested ? market.suggested[key] : null
  return Number.isFinite(Number(value)) ? Number(value) * sleeveFactor(sleeveCondition) : null
}

export function money(value, currency = 'USD') {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString(undefined, { style: 'currency', currency, minimumFractionDigits: n % 1 === 0 ? 0 : 2 })
}

// What this exact pressing has sold for on Vinyl Venue: { avg_sold, sales }. avg_sold is null under 3 sales.
export async function loadPressingPrice(discogsReleaseId) {
  if (!discogsReleaseId) return null
  const { data, error } = await supabase.rpc('pressing_price', { rid: Number(discogsReleaseId) })
  return error ? null : data
}

// Condition-split price picture for one pressing: per grade, Vinyl Venue sales (re-graded by
// each seller's confirmed grading accuracy), delivered prices, Discogs' suggestion, a blended
// estimate and a confidence level. See supabase/pressing_grade_stats.sql.
export async function loadGradeStats(discogsReleaseId) {
  if (!discogsReleaseId) return null
  const { data, error } = await supabase.rpc('pressing_grade_stats', { rid: Number(discogsReleaseId) })
  return error ? null : data
}

// The stats row for one media grade, or null.
export function gradeRow(stats, mediaCondition) {
  const g = String(mediaCondition || '').trim().toUpperCase()
  return (stats?.grades || []).find((r) => r.grade === g) || null
}
