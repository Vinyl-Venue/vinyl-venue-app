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

// Groups listings by album, keeping the order albums first appear in. Two
// copies are the same album when they share a Discogs master release, or,
// failing that, when their title and artist match closely.
function buildGroups(items) {
  const groups = []
  const byMaster = new Map()
  const byFuzzy = new Map()
  for (const item of items) {
    const master = item.discogsMasterId ? String(item.discogsMasterId) : null
    const fuzzy = albumKey(item)
    let group = (master && byMaster.get(master)) || byFuzzy.get(fuzzy)
    if (!group) {
      group = { key: master ? `m${master}` : fuzzy, items: [] }
      groups.push(group)
    }
    group.items.push(item)
    if (master) byMaster.set(master, group)
    byFuzzy.set(fuzzy, group)
  }
  return groups
}

export function groupByAlbum(listings) {
  return buildGroups(listings)
}

// Returns a function that maps any item in `items` to its album group key.
export function albumKeyer(items) {
  const map = new Map()
  for (const g of buildGroups(items)) for (const it of g.items) map.set(it, g.key)
  return (item) => map.get(item) ?? albumKey(item)
}
