import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

function AlbumModal({ album, onClose }) {
  const { user } = useAuth()
  const [existingListing, setExistingListing] = useState(null)
  const [checkingListing, setCheckingListing] = useState(true)
  const [isListing, setIsListing] = useState(false)
  const [price, setPrice] = useState('')
  const [listingType, setListingType] = useState('fixed')
  const [tradePreference, setTradePreference] = useState('')
  const [auctionDuration, setAuctionDuration] = useState('3')
  const [listed, setListed] = useState(false)
  const [formError, setFormError] = useState('')

  const hasPressingDetails =
    album.label || album.pressingCountry || album.matrixNumber || album.deadwax ||
    album.sleeveCondition || album.mediaCondition ||
    (album.specialTags && album.specialTags.length > 0)

  const wantsTradeInfo = listingType === 'trade' || listingType === 'fixed_or_trade'
  const isAuction = listingType === 'auction'

  useEffect(() => {
    checkExistingListing()
  }, [album.id])

  async function checkExistingListing() {
    setCheckingListing(true)
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('album_id', album.id)
      .eq('status', 'active')
      .maybeSingle()

    if (error) {
      console.error('Error checking listing:', error.message)
    }

    setExistingListing(data)
    setCheckingListing(false)
  }

  async function handleCreateListing(event) {
    event.preventDefault()
    setFormError('')

    if (price.trim() === '' || Number(price) < 0) {
      setFormError('Please enter a valid price of $0 or more.')
      return
    }

    if (wantsTradeInfo && tradePreference.trim() === '') {
      setFormError('Please describe what you\'d accept in trade.')
      return
    }

    let endsAt = null
    if (isAuction) {
      const durationDays = Number(auctionDuration)
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + durationDays)
      endsAt = endDate.toISOString()
    }

    const { error } = await supabase.from('listings').insert({
      album_id: album.id,
      user_id: user.id,
      price: Number(price),
      listing_type: listingType,
      trade_preference: wantsTradeInfo ? tradePreference : null,
      ends_at: endsAt,
      status: 'active',
      title: album.title,
      artist: album.artist,
      year: album.year,
      genre: album.genre,
      image_url: album.imageUrl,
      sleeve_condition: album.sleeveCondition,
      media_condition: album.mediaCondition,
      label: album.label,
      pressing_country: album.pressingCountry
    })

    if (error) {
      console.error('Error creating listing:', error.message)
      setFormError('This album may already have an active listing.')
      return
    }

    setListed(true)
    checkExistingListing()
  }

  async function handleCancelListing() {
    const { error } = await supabase
      .from('listings')
      .update({ status: 'cancelled' })
      .eq('id', existingListing.id)

    if (error) {
      console.error('Error cancelling listing:', error.message)
      return
    }

    setExistingListing(null)
    setListed(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <img
          src={album.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
          alt={album.title}
          className="modal-cover"
        />
        <h2>{album.title}</h2>
        <p className="modal-artist">{album.artist}</p>
        <p className="modal-meta">
          {album.year || 'Year unknown'} · {album.genre || 'Genre unknown'}
          {album.subgenre ? ` (${album.subgenre})` : ''}
        </p>

        {hasPressingDetails && (
          <div className="modal-pressing-details">
            {album.sleeveCondition && <p><strong>Sleeve condition:</strong> {album.sleeveCondition}</p>}
            {album.mediaCondition && <p><strong>Media condition:</strong> {album.mediaCondition}</p>}
            {album.label && <p><strong>Label:</strong> {album.label}</p>}
            {album.pressingCountry && <p><strong>Pressing country:</strong> {album.pressingCountry}</p>}
            {album.matrixNumber && <p><strong>Matrix number:</strong> {album.matrixNumber}</p>}
            {album.deadwax && <p><strong>Deadwax / runout:</strong> {album.deadwax}</p>}
            {album.specialTags && album.specialTags.length > 0 && (
              <p><strong>Special:</strong> {album.specialTags.join(', ')}</p>
            )}
          </div>
        )}

        {checkingListing ? null : existingListing ? (
          <div className="existing-listing">
            <p>
              Already listed — <strong>${Number(existingListing.price).toFixed(2)}</strong>
              {' '}({existingListing.listing_type.replace(/_/g, ' ')})
            </p>
            <button className="cancel-listing-button" onClick={handleCancelListing}>
              Cancel this listing
            </button>
          </div>
        ) : listed ? (
          <p className="listing-success">Listed for sale in your marketplace!</p>
        ) : isListing ? (
          <form className="listing-form" onSubmit={handleCreateListing}>
            <div className="form-row">
              <input
                type="number"
                step="0.01"
                placeholder="Price ($)"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
              <select
                value={listingType}
                onChange={(event) => setListingType(event.target.value)}
              >
                <option value="fixed">Fixed price</option>
                <option value="fixed_or_trade">Fixed price or trade</option>
                <option value="trade">Open to trade only</option>
                <option value="auction">Auction</option>
              </select>
            </div>
            {wantsTradeInfo && (
              <input
                type="text"
                placeholder="What would you accept in trade? (e.g. any Coltrane VG+ or better)"
                value={tradePreference}
                onChange={(event) => setTradePreference(event.target.value)}
                className="trade-preference-input"
              />
            )}
            {isAuction && (
              <select
                value={auctionDuration}
                onChange={(event) => setAuctionDuration(event.target.value)}
                className="trade-preference-input"
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="5">5 days</option>
                <option value="7">7 days</option>
                <option value="10">10 days</option>
              </select>
            )}
            {formError && <p className="auth-error">{formError}</p>}
            <button type="submit">Confirm listing</button>
          </form>
        ) : (
          <button className="list-for-sale-button" onClick={() => setIsListing(true)}>
            List for sale
          </button>
        )}
      </div>
    </div>
  )
}

export default AlbumModal