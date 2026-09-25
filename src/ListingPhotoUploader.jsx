import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const PLACEHOLDER = "https://placehold.co/80x80/1c1a15/1c1a15"

// Owner-facing photo management for a single listing — the actual copy
// being sold/traded/auctioned, distinct from the canonical Discogs cover
// art already shown elsewhere. Multiple photos per listing (front, back,
// vinyl surface, specific wear) since condition claims are much more
// trustworthy to a buyer when backed by real photos of that exact copy.
function ListingPhotoUploader({ listingId }) {
  const { user } = useAuth()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPhotos()
  }, [listingId])

  async function fetchPhotos() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('listing_photos')
      .select('*')
      .eq('listing_id', listingId)
      .order('sort_order', { ascending: true })

    if (fetchError) {
      console.error('Error fetching listing photos:', fetchError.message)
      setLoading(false)
      return
    }

    setPhotos(data || [])
    setLoading(false)
  }

  async function handleFilesSelected(event) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setError('')

    // Sequential, not parallel — keeps sort_order predictable (photos
    // land in the order picked) and avoids hammering Storage with a
    // burst of concurrent uploads for what's usually just 2-4 photos.
    let nextSortOrder = photos.length
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${listingId}/${crypto.randomUUID()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('listing-photos')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Error uploading listing photo:', uploadError.message)
        setError('Could not upload one of those photos — try again.')
        continue
      }

      const { data: urlData } = supabase.storage.from('listing-photos').getPublicUrl(fileName)

      const { error: insertError } = await supabase.from('listing_photos').insert({
        listing_id: listingId,
        image_url: urlData.publicUrl,
        sort_order: nextSortOrder
      })

      if (insertError) {
        console.error('Error saving listing photo:', insertError.message)
        setError('Uploaded but could not save one of those photos — try again.')
        continue
      }

      nextSortOrder += 1
    }

    setUploading(false)
    fetchPhotos()
    event.target.value = ''
  }

  async function handleDeletePhoto(photoId) {
    const { error: deleteError } = await supabase.from('listing_photos').delete().eq('id', photoId)

    if (deleteError) {
      console.error('Error deleting listing photo:', deleteError.message)
      return
    }

    setPhotos((current) => current.filter((p) => p.id !== photoId))
  }

  return (
    <div className="mt-3 pt-3 border-t border-border font-sans">
      <p className="text-xs text-text-muted mb-2">
        <strong className="text-text">Photos of your copy</strong> — front, back, or the vinyl
        itself help buyers trust your condition grade.
      </p>

      {!loading && photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative">
              <img
                src={photo.image_url || PLACEHOLDER}
                alt=""
                className="w-16 h-16 object-cover rounded border border-border"
              />
              <button
                onClick={() => handleDeletePhoto(photo.id)}
                className="absolute -top-1.5 -right-1.5 bg-bg border border-border rounded-full w-5 h-5 flex items-center justify-center text-text-muted text-xs cursor-pointer hover:border-accent hover:text-accent"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-[#c1666b] mb-2">{error}</p>}

      <label className="inline-block text-xs text-accent bg-transparent border border-border rounded px-2.5 py-1.5 cursor-pointer hover:border-accent">
        {uploading ? 'Uploading...' : '+ Add photos'}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesSelected}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  )
}

export default ListingPhotoUploader