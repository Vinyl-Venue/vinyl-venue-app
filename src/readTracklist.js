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
  try { image = await downscaleImage(file) } catch (e) { return { tracks: [], note: null, error: e.message } }
  const { data, error } = await supabase.functions.invoke('read-tracklist', {
    body: { imageBase64: image.base64, mediaType: image.mediaType }
  })
  if (error) return { tracks: [], note: null, error: 'Could not read the photo. Please try again.' }
  if (data?.error) return { tracks: [], note: null, error: data.error }
  return { tracks: data.tracks || [], note: data.note || null, error: '' }
}

// Clean what the person edited into the shape the app stores.
export function cleanTracks(rows) {
  return rows
    .map((r) => ({ position: String(r.position || '').trim(), title: String(r.title || '').trim(), duration: String(r.duration || '').trim() }))
    .filter((r) => r.title)
}
