import { supabase } from '../supabaseClient'

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Platform-wide average sold price per album, from the market_price_averages
// database function (only albums with at least 3 sales in the last year).
// Returns an empty map if the function isn't there yet.
export async function loadPriceAverages() {
  const { data, error } = await supabase.rpc('market_price_averages')
  if (error) return new Map()
  return new Map((data || []).map((r) => [`${r.norm_title}|${r.norm_artist}`, { avg: Number(r.avg_price), count: r.sample_count }]))
}

// Percent below the average sold price, or null when there's no reliable
// comparison (auctions and trades have no fixed price; needs 10%+ to show).
export function dealPercent(listing, averages) {
  if (!averages || averages.size === 0) return null
  if (listing.listingType === 'auction' || listing.listingType === 'trade') return null
  const stat = averages.get(`${norm(listing.title)}|${norm(listing.artist)}`)
  const price = Number(listing.price)
  if (!stat || !price || !stat.avg) return null
  const pct = Math.round((1 - price / stat.avg) * 100)
  return pct >= 10 ? pct : null
}

export function gradeLabel(listing) {
  const sleeve = listing.sleeveCondition
  const media = listing.mediaCondition
  if (media && sleeve) return `${media}/${sleeve}`
  return media || sleeve || null
}
