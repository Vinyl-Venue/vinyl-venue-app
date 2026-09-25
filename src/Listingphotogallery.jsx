import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// Buyer-facing, read-only. Shows nothing at all if the seller hasn't
// added any photos yet — no placeholder clutter for the common case
// where a listing predates this feature or the seller skipped it.
function ListingPhotoGallery({ listingId }) {
  const [photos, setPhotos] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    fetchPhotos()
  }, [listingId])

  async function fetchPhotos() {
    const { data, error } = await supabase
      .from('listing_photos')
      .select('*')
      .eq('listing_id', listingId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching listing photos:', error.message)
      return
    }

    setPhotos(data || [])
    setActiveIndex(0)
  }

  if (photos.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-border font-sans">
      <p className="text-xs text-text-muted mb-2">
        <strong className="text-text">Photos of this copy</strong>
      </p>
      <img
        src={photos[activeIndex].image_url}
        alt=""
        className="w-full aspect-square object-cover rounded border border-border mb-2"
      />
      {photos.length > 1 && (
        <div className="flex gap-1.5">
          {photos.map((photo, i) => (
            <img
              key={photo.id}
              src={photo.image_url}
              alt=""
              onClick={() => setActiveIndex(i)}
              className={`w-12 h-12 object-cover rounded cursor-pointer border ${
                i === activeIndex ? 'border-accent' : 'border-border'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ListingPhotoGallery