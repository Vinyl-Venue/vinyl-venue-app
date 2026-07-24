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

  const fieldClass = "bg-bg border border-border text-text px-2.5 py-2 rounded font-sans text-sm"

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-lg p-6 max-w-sm w-11/12 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 bg-transparent border-0 text-text-muted text-2xl cursor-pointer">×</button>
        <img
          src={album.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
          alt={album.title}
          className="w-full aspect-square object-cover rounded mb-4"
        />
        <h2 className="text-2xl m-0">{album.title}</h2>
        <p className="font-sans text-text-muted -mt-1">{album.artist}</p>
        <p className="font-sans text-sm text-text-muted">
          {album.year || 'Year unknown'} · {album.genre || 'Genre unknown'}
          {album.subgenre ? ` (${album.subgenre})` : ''}
        </p>

        {hasPressingDetails && (
          <div className="mt-4 pt-4 border-t border-border font-sans text-sm text-text-muted">
            {album.sleeveCondition && <p className="my-1"><strong className="text-text">Sleeve condition:</strong> {album.sleeveCondition}</p>}
            {album.mediaCondition && <p className="my-1"><strong className="text-text">Media condition:</strong> {album.mediaCondition}</p>}
            {album.label && <p className="my-1"><strong className="text-text">Label:</strong> {album.label}</p>}
            {album.pressingCountry && <p className="my-1"><strong className="text-text">Pressing country:</strong> {album.pressingCountry}</p>}
            {album.matrixNumber && <p className="my-1"><strong className="text-text">Matrix number:</strong> {album.matrixNumber}</p>}
            {album.deadwax && <p className="my-1"><strong className="text-text">Deadwax / runout:</strong> {album.deadwax}</p>}
            {album.specialTags && album.specialTags.length > 0 && (
              <p className="my-1"><strong className="text-text">Special:</strong> {album.specialTags.join(', ')}</p>
            )}
          </div>
        )}

        {checkingListing ? null : existingListing ? (
          <div className="mt-4 font-sans text-sm text-text-muted">
            <p>
              Already listed — <strong className="text-text">${Number(existingListing.price).toFixed(2)}</strong>
              {' '}({existingListing.listing_type.replace(/_/g, ' ')})
            </p>
            <button
              onClick={handleCancelListing}
              className="w-full mt-2.5 bg-transparent border border-border text-text-muted px-2 py-2 rounded font-sans text-sm cursor-pointer hover:border-accent hover:text-accent"
            >
              Cancel this listing
            </button>
          </div>
        ) : listed ? (
          <p className="mt-4 text-accent font-sans text-sm text-center">Listed for sale in your marketplace!</p>
        ) : isListing ? (
          <form className="mt-4" onSubmit={handleCreateListing}>
            <div className="flex gap-2.5 items-center mb-2.5">
              <input
                type="number"
                step="0.01"
                placeholder="Price ($)"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className={fieldClass}
              />
              <select
                value={listingType}
                onChange={(event) => setListingType(event.target.value)}
                className={fieldClass}
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
                className={`${fieldClass} w-full mt-2 mb-2`}
              />
            )}
            {isAuction && (
              <select
                value={auctionDuration}
                onChange={(event) => setAuctionDuration(event.target.value)}
                className={`${fieldClass} w-full mt-2 mb-2`}
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="5">5 days</option>
                <option value="7">7 days</option>
                <option value="10">10 days</option>
              </select>
            )}
            {formError && <p className="text-[#d97757] text-sm m-0">{formError}</p>}
            <button
              type="submit"
              className="w-full bg-accent text-bg border-0 px-2 py-2 rounded font-sans text-sm cursor-pointer"
            >
              Confirm listing
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsListing(true)}
            className="w-full mt-4 bg-accent text-bg border-0 px-2 py-2 rounded font-sans text-sm cursor-pointer"
          >
            List for sale
          </button>
        )}
      </div>
    </div>
  )
}

export default AlbumModal