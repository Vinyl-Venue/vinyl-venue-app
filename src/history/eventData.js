import { supabase } from '../supabaseClient'

export const SOURCES = [
  { value: 'record_store', label: 'Record store' },
  { value: 'online_shop', label: 'Online shop' },
  { value: 'marketplace', label: 'Vinyl Venue marketplace' },
  { value: 'trade', label: 'Trade' },
  { value: 'gift', label: 'Gift' },
  { value: 'found', label: 'Found / inherited' },
  { value: 'other', label: 'Other' }
]

export const EMPTY_ACQUISITION = { date: '', source: '', place: '', price: '', priceInStats: true, notes: '' }

const sourceLabel = (v) => SOURCES.find((s) => s.value === v)?.label || v || ''

// True when the person filled in anything worth saving.
export function hasAcquisition(a) {
  return !!a && !!(a.date || a.source || (a.place || '').trim() || String(a.price ?? '').trim() || (a.notes || '').trim())
}

// Form values -> album_events row (without copy_id / album_id / user_id).
export function acquisitionToEvent(a, eventType = 'acquired') {
  const price = String(a.price ?? '').trim()
  const n = price === '' ? null : Number(price)
  return {
    event_type: eventType,
    occurred_on: a.date || null,
    source: a.source || null,
    place: (a.place || '').trim() || null,
    price: n != null && Number.isFinite(n) && n >= 0 ? n : null,
    price_in_stats: a.priceInStats !== false,
    notes: (a.notes || '').trim() || null
  }
}

export function eventTitle(e) {
  const verb = { acquired: 'Acquired', sold: 'Sold', traded: 'Traded', gift: 'Given as a gift', note: 'Note', other: 'Event' }[e.event_type] || 'Event'
  const src = sourceLabel(e.source)
  const where = e.place ? (src && e.source !== 'other' ? `${src} — ${e.place}` : e.place) : src
  return where ? `${verb}: ${where}` : verb
}

export function formatEventDate(d) {
  if (!d) return 'Date not recorded'
  const [y, m, day] = String(d).split('-').map(Number)
  if (!y) return 'Date not recorded'
  return new Date(y, (m || 1) - 1, day || 1).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Oldest first; undated entries last, in the order they were added.
export function sortEvents(list) {
  return [...list].sort((a, b) => {
    if (a.occurred_on && b.occurred_on) return a.occurred_on.localeCompare(b.occurred_on) || a.id - b.id
    if (a.occurred_on) return -1
    if (b.occurred_on) return 1
    return a.id - b.id
  })
}

export async function fetchEvents(copyId) {
  if (!copyId) return { events: [], error: '' }
  const { data, error } = await supabase.from('album_events').select('*').eq('copy_id', copyId)
  if (error) return { events: [], error: error.message }
  return { events: sortEvents(data || []), error: '' }
}

export async function addEvent({ copyId, albumId, userId, event }) {
  const { data, error } = await supabase
    .from('album_events')
    .insert({ ...event, copy_id: copyId, album_id: albumId ?? null, user_id: userId })
    .select()
    .single()
  return error ? { event: null, error: error.message } : { event: data, error: '' }
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('album_events').delete().eq('id', id)
  return { error: error ? error.message : '' }
}
