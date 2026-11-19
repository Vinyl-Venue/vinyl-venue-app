// How much a worn disc or sleeve changes what a record sells for, relative to a VG+ disc in a sleeve at
// VG+ or better. Mirrors vv_disc_factor / vv_sleeve_factor in the database (supabase/condition_factors.sql).
// Disc factors follow the spread of Discogs' own grade suggestions; sleeve factors are our assumption
// until enough Vinyl Venue sales exist to measure them.

const RANK = { M: 8, NM: 7, 'M-': 7, 'VG+': 6, VG: 5, 'G+': 4, G: 3, F: 2, P: 1 }
const DISC = { 8: 1.45, 7: 1.25, 6: 1, 5: 0.72, 4: 0.5, 3: 0.35, 2: 0.25, 1: 0.15 }
const SLEEVE = { 8: 1, 7: 1, 6: 1, 5: 0.9, 4: 0.78, 3: 0.65, 2: 0.5, 1: 0.4 }

const rankOf = (g) => RANK[String(g || '').trim().toUpperCase()] || null

// 1 when the grade is unknown, so a missing grade never changes a price.
export const discFactor = (g) => DISC[rankOf(g)] ?? 1
export const sleeveFactor = (g) => SLEEVE[rankOf(g)] ?? 1
export const conditionFactor = (media, sleeve) => discFactor(media) * sleeveFactor(sleeve)

// "−10%" style text for a sleeve below VG+, or null when it costs nothing.
export function sleevePenaltyText(g) {
  const f = sleeveFactor(g)
  return f < 1 ? `−${Math.round((1 - f) * 100)}%` : null
}
