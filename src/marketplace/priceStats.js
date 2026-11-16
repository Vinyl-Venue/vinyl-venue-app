import { supabase } from '../supabaseClient'

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Platform-wide average sold price per album, from the market_price_averages
// database function (only albums with at least 3 sales in the last year).
// Returns an empty map if the function isn't there yet.
export async function loadPriceAverages() {
  const { data, error } = await supabase.rpc('market_price_averages')
  const map = new Map(error ? [] : (data || []).map((r) => [`${r.norm_title}|${r.norm_artist}`, { avg: Number(r.avg_price), count: r.sample_count }]))
  // Per-pressing averages (3+ sales of the exact pressing), keyed by Discogs release id.
  const { data: byPressing } = await supabase.rpc('pressing_price_averages')
  for (const r of byPressing || []) map.set(`rid:${r.discogs_release_id}`, { avg: Number(r.avg_price), count: r.sample_count })
  return map
}

// Percent below the average sold price, or null when there's no reliable
// comparison (auctions and trades have no fixed price; needs 10%+ to show).
export function dealPercent(listing, averages) {
  if (!averages || averages.size === 0) return null
  if (listing.listingType === 'auction' || listing.listingType === 'trade') return null
  // A listing that identifies its pressing is compared with that pressing only, never the album average.
  const stat = listing.discogsReleaseId
    ? averages.get(`rid:${listing.discogsReleaseId}`)
    : averages.get(`${norm(listing.title)}|${norm(listing.artist)}`)
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
