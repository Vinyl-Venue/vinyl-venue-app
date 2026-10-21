import { fuzzyMatchKey } from '../utils'

// Everything that identifies one pressing of an album, in the order a
// collector reads it: year, country, label, catalog number, colour, edition.
export function pressingParts(item) {
  return [
    item.pressingYear || null,
    item.pressingCountry,
    item.label,
    item.catalogNumber,
    item.vinylColor ? `${item.vinylColor} vinyl` : null,
    item.edition
  ].filter(Boolean)
}

export function pressingSummary(item) {
  const parts = pressingParts(item)
  return parts.length ? parts.join(' · ') : 'Pressing details not listed'
}

// Two listings are the same pressing when these fields all agree.
export function pressingSignature(item) {
  return [item.pressingYear, item.pressingCountry, item.label, item.catalogNumber, item.vinylColor, item.edition, item.format]
    .map((v) => String(v || '').toLowerCase().trim())
    .join('|')
}

export const albumKey = fuzzyMatchKey

// Groups listings by album, keeping the order albums first appear in.
export function groupByAlbum(listings) {
  const groups = new Map()
  for (const listing of listings) {
    const key = albumKey(listing)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(listing)
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items }))
}
