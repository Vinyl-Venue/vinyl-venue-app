import { supabase } from './supabaseClient'

const MAX_SIDE = 1800

// Shrinks a phone photo before upload (they are often 4000px+) and returns { base64, mediaType }.
export function downscaleImage(file, maxSide = MAX_SIDE) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file could not be read as a photo.')) }
    img.src = url
  })
}

// Sends the photo to the read-tracklist function. Returns { tracks, note, error }.
export async function readTracklistFromPhoto(file) {
  let image
  try { image = await downscaleImage(file) } catch (e) { return { tracks: [], side: null, disc: null, note: null, error: e.message } }
  const { data, error } = await supabase.functions.invoke('read-tracklist', {
    body: { imageBase64: image.base64, mediaType: image.mediaType }
  })
  if (error) return { tracks: [], side: null, disc: null, note: null, error: 'Could not read the photo. Please try again.' }
  if (data?.error) return { tracks: [], side: null, disc: null, note: null, error: data.error }
  return { tracks: data.tracks || [], side: data.side || null, disc: data.disc || null, note: data.note || null, error: '' }
}

// Clean what the person edited into the shape the app stores.
export function cleanTracks(rows) {
  return rows
    .map((r) => ({ position: String(r.position || '').trim(), title: String(r.title || '').trim(), duration: String(r.duration || '').trim() }))
    .filter((r) => r.title)
}

// ---------- Several photos (multi-disc releases) ----------
// Each photo is one "group" of tracks for one side. Pure helpers, so they can be tested without a browser.

export const SIDES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

// The side letter for a photo. Labels that restart at A/B on each disc map onto C/D, E/F...
export function resolveSide(side, disc) {
  if (!side) return null
  if (disc && disc > 1 && (side === 'A' || side === 'B')) return String.fromCharCode(65 + (disc - 1) * 2 + (side === 'B' ? 1 : 0))
  return side
}

function trackNumber(position, index) {
  const m = /(\d+)\s*$/.exec(String(position || ''))
  return m ? Number(m[1]) : index + 1
}

// Rewrites positions so they carry the given side: "1" -> "B1", "A2" -> "B2".
export function withSide(tracks, side) {
  if (!side) return tracks
  return tracks.map((t, i) => ({ ...t, position: `${side}${trackNumber(t.position, i)}` }))
}

// The first side letter not already used by another photo.
export function nextFreeSide(groups) {
  const used = new Set(groups.map((g) => g.side).filter(Boolean))
  return SIDES.find((s) => !used.has(s)) || null
}

export function duplicateSides(groups) {
  const seen = new Set()
  const dup = new Set()
  for (const g of groups) { if (!g.side) continue; if (seen.has(g.side)) dup.add(g.side); seen.add(g.side) }
  return [...dup]
}

// All photos' tracks in record order: side A, then B, then C... and by track number within a side.
export function flattenGroups(groups) {
  const all = groups.flatMap((g, gi) => g.tracks.map((t, ti) => ({ ...t, _g: gi, _t: ti })))
  const key = (t) => {
    const m = /^([A-Z])\s*(\d+)/i.exec(t.position || '')
    return m ? [m[1].toUpperCase().charCodeAt(0), Number(m[2])] : [999, 0]
  }
  all.sort((a, b) => {
    const [la, na] = key(a); const [lb, nb] = key(b)
    return la - lb || na - nb || a._g - b._g || a._t - b._t
  })
  return all.map(({ _g, _t, ...t }) => t)
}
