import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function TradeOfferModal({ listing, currentUserId, onClose, onSubmitted }) {
  const [myAlbums, setMyAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMyAlbums()
  }, [])

  async function fetchMyAlbums() {
    setLoading(true)
    const { data, error } = await supabase
      .from('albums')
      .select('id, title, artist, image_url')
      .eq('user_id', currentUserId)
      .order('title', { ascending: true })

    if (error) {
      console.error('Error fetching albums for trade offer:', error.message)
    } else {
      setMyAlbums(data || [])
    }
    setLoading(false)
  }

  function toggleSelect(albumId) {
    setSelectedIds((current) =>
      current.includes(albumId) ? current.filter((id) => id !== albumId) : [...current, albumId]
    )
  }

  async function handleSubmit() {
    if (selectedIds.length === 0) {
      setError('Pick at least one album to offer.')
      return
    }

    setSubmitting(true)
    setError('')

    const { data: offerRow, error: offerError } = await supabase
      .from('trade_offers')
      .insert({ listing_id: listing.id, offerer_id: currentUserId, message: message.trim() || null })
      .select()
      .maybeSingle()

    if (offerError) {
      console.error('Error creating trade offer:', offerError.message)
      setError(offerError.message.replace(/^.*?: /, ''))
      setSubmitting(false)
      return
    }

    const itemRows = selectedIds.map((albumId) => ({ trade_offer_id: offerRow.id, album_id: albumId }))
    const { error: itemsError } = await supabase.from('trade_offer_items').insert(itemRows)

    setSubmitting(false)

    if (itemsError) {
      console.error('Error attaching trade offer items:', itemsError.message)
      setError('Offer created, but there was a problem attaching your items.')
      return
    }

    onSubmitted()
  }

  const filteredAlbums = myAlbums.filter((a) => {
    const q = search.toLowerCase()
    return !q || a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
  })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-lg p-5 max-w-md w-11/12 max-h-[85vh] overflow-y-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="font-serif italic text-lg text-text m-0">Propose a trade</p>
          <button onClick={onClose} className="bg-transparent border-0 text-text-muted text-xl cursor-pointer">×</button>
        </div>
        <p className="text-xs text-text-muted mb-3">
          For <strong className="text-text">{listing.title}</strong> — {listing.artist}
          {listing.tradePreference && <> · They're looking for: {listing.tradePreference}</>}
        </p>

        <input
          type="text"
          placeholder="Search your shelf..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
        />

        {loading ? (
          <p className="text-sm text-text-muted">Loading your shelf...</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto mb-3">
            {filteredAlbums.length === 0 && <p className="text-sm text-text-muted">No albums found.</p>}
            {filteredAlbums.map((album) => {
              const isSelected = selectedIds.includes(album.id)
              return (
                <button
                  key={album.id}
                  onClick={() => toggleSelect(album.id)}
                  className={`flex items-center gap-2.5 rounded px-2 py-1.5 text-left cursor-pointer border ${
                    isSelected ? 'border-accent bg-accent/10' : 'border-border bg-bg'
                  }`}
                >
                  <img src={album.image_url || "https://placehold.co/32x32/1c1a15/a8a29a?text=%20"} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                  <span className="text-sm text-text flex-1 min-w-0 truncate">
                    <strong>{album.title}</strong> — {album.artist}
                  </span>
                  {isSelected && <span className="text-accent text-xs flex-shrink-0">✓</span>}
                </button>
              )
            })}
          </div>
        )}

        <textarea
          placeholder="Add a message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm resize-none mb-2"
        />

        {error && <p className="text-xs text-[#c1666b] mb-2">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || selectedIds.length === 0}
          className="w-full bg-accent text-bg font-bold text-sm py-2 rounded cursor-pointer disabled:opacity-60"
        >
          {submitting ? 'Sending offer...' : `Send trade offer (${selectedIds.length} item${selectedIds.length === 1 ? '' : 's'})`}
        </button>
      </div>
    </div>
  )
}

export default TradeOfferModal