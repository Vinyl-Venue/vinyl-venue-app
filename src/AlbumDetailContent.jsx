import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { discogsSearch, discogsFetchRelease } from './utils'
import ListingPhotoUploader from './ListingPhotoUploader'

const PLACEHOLDER_COVER = "https://placehold.co/500x500/E4E2DC/E4E2DC"
const PLACEHOLDER_SMALL = "https://placehold.co/32x32/E4E2DC/E4E2DC"
const PLACEHOLDER_AVATAR = "https://placehold.co/24x24/E4E2DC/E4E2DC"

// Same Goldmine-style grading scale used in ScanCrateDetailRow, so
// condition means the same thing wherever it's set in the app.
const CONDITION_OPTIONS = ['', 'M', 'NM', 'VG+', 'VG', 'G+', 'G', 'P']

function AlbumDetailContent({ album, onClose, isOwnAlbum = false }) {
  const { user } = useAuth()
  const [existingListing, setExistingListing] = useState(null)
  const [checkingListing, setCheckingListing] = useState(true)
  const [isListing, setIsListing] = useState(false)
  const [price, setPrice] = useState('')
  const [listingType, setListingType] = useState('fixed')
  const [tradePreference, setTradePreference] = useState('')
  const [auctionDuration, setAuctionDuration] = useState('3')
  const [scheduledStart, setScheduledStart] = useState('')
  const [shippingPrice, setShippingPrice] = useState('')
  const [listed, setListed] = useState(false)
  const [formError, setFormError] = useState('')

  const [pricingCheck, setPricingCheck] = useState(null)
  const [pendingListing, setPendingListing] = useState(null)
  const [checkingPricing, setCheckingPricing] = useState(false)

  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentInput, setCommentInput] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const [localTracklist, setLocalTracklist] = useState(album.tracklist || null)
  const [localCredits, setLocalCredits] = useState(album.credits || null)
  const [localImageUrl, setLocalImageUrl] = useState(album.imageUrl || null)
  const [showTrackFinder, setShowTrackFinder] = useState(false)
  const [trackSearchResults, setTrackSearchResults] = useState([])
  const [trackSearching, setTrackSearching] = useState(false)
  const [trackFinderError, setTrackFinderError] = useState('')
  const [savingTracklist, setSavingTracklist] = useState(null)

  const [localSleeveCondition, setLocalSleeveCondition] = useState(album.sleeveCondition || '')
  const [localMediaCondition, setLocalMediaCondition] = useState(album.mediaCondition || '')
  const [editingCondition, setEditingCondition] = useState(false)
  const [sleeveConditionInput, setSleeveConditionInput] = useState('')
  const [mediaConditionInput, setMediaConditionInput] = useState('')
  const [savingCondition, setSavingCondition] = useState(false)

  const hasPressingDetails =
    album.label || album.pressingCountry || album.matrixNumber || album.deadwax ||
    album.sleeveCondition || album.mediaCondition ||
    (album.specialTags && album.specialTags.length > 0)

  const wantsTradeInfo = listingType === 'trade' || listingType === 'fixed_or_trade'
  const isAuction = listingType === 'auction'

  useEffect(() => {
    // This component can be reused across different albums without
    // unmounting (e.g. clicking straight from one Wall tile to another
    // in the sticky Shelf panel) — so every piece of state that was
    // seeded from the *previous* album's props has to be explicitly
    // reset here, keyed on album.id. Relying on the caller to remount
    // via `key` alone isn't enough to guarantee this resets correctly
    // in every environment (e.g. across a hot-reload), so this makes
    // the component self-contained regardless of how it's rendered.
    setLocalTracklist(album.tracklist || null)
    setLocalCredits(album.credits || null)
    setLocalImageUrl(album.imageUrl || null)
    setShowTrackFinder(false)
    setTrackSearchResults([])
    setTrackSearching(false)
    setTrackFinderError('')
    setSavingTracklist(null)

    setLocalSleeveCondition(album.sleeveCondition || '')
    setLocalMediaCondition(album.mediaCondition || '')
    setEditingCondition(false)
    setSavingCondition(false)

    setIsListing(false)
    setPrice('')
    setListingType('fixed')
    setTradePreference('')
    setAuctionDuration('3')
    setScheduledStart('')
    setShippingPrice('')
    setListed(false)
    setFormError('')
    setPricingCheck(null)
    setPendingListing(null)
    setCheckingPricing(false)

    setCommentInput('')
    setPostingComment(false)

    checkExistingListing()
    fetchComments()
  }, [album.id])

  function handleStartEditCondition() {
    setSleeveConditionInput(localSleeveCondition)
    setMediaConditionInput(localMediaCondition)
    setEditingCondition(true)
  }

  async function handleSaveCondition() {
    setSavingCondition(true)

    const { error: updateError } = await supabase
      .from('albums')
      .update({
        sleeve_condition: sleeveConditionInput || null,
        media_condition: mediaConditionInput || null
      })
      .eq('id', album.id)

    setSavingCondition(false)

    if (updateError) {
      console.error('Error saving condition:', updateError.message)
      return
    }

    setLocalSleeveCondition(sleeveConditionInput)
    setLocalMediaCondition(mediaConditionInput)
    setEditingCondition(false)
  }

  async function handleFindTracklist() {
    setTrackSearching(true)
    setTrackFinderError('')
    setTrackSearchResults([])

    const { results, error } = await discogsSearch(album.title, album.artist, {
      label: album.label,
      year: album.year,
      country: album.pressingCountry
    })

    setTrackSearching(false)

    if (error) {
      console.error('Discogs search error:', error)
      setTrackFinderError(error)
      return
    }

    setTrackSearchResults(results)
    if (results.length === 0) {
      setTrackFinderError('No matches found on Discogs.')
    }
  }

  async function handleSelectTrackRelease(result) {
    setSavingTracklist(result.id)
    setTrackFinderError('')

    const { release, error } = await discogsFetchRelease(result.id)

    if (error) {
      console.error('Error fetching release:', error)
      setTrackFinderError('Could not load that release — try another result.')
      setSavingTracklist(null)
      return
    }

    // If this album has no cover yet, backfill it from the same Discogs
    // release — no reason to make someone do a second lookup just for art
    // when we already have it from fetching the tracklist.
    const shouldBackfillCover = !localImageUrl && release.coverImageUrl

    const updatePayload = { tracklist: release.tracklist, credits: release.credits }
    if (shouldBackfillCover) {
      updatePayload.image_url = release.coverImageUrl
    }

    const { error: updateError } = await supabase
      .from('albums')
      .update(updatePayload)
      .eq('id', album.id)

    setSavingTracklist(null)

    if (updateError) {
      console.error('Error saving tracklist:', updateError.message)
      setTrackFinderError('Could not save — you may not have permission to edit this album.')
      return
    }

    setLocalTracklist(release.tracklist)
    setLocalCredits(release.credits)
    if (shouldBackfillCover) {
      setLocalImageUrl(release.coverImageUrl)
    }
    setShowTrackFinder(false)
    setTrackSearchResults([])
  }

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

  async function fetchComments() {
    setCommentsLoading(true)
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles!comments_user_id_fkey(email, display_name, avatar_url)')
      .eq('album_id', album.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error.message)
      setCommentsLoading(false)
      return
    }

    setComments(data)
    setCommentsLoading(false)
  }

  async function handlePostComment() {
    const trimmed = commentInput.trim()
    if (!trimmed) return

    setPostingComment(true)

    const { data, error } = await supabase
      .from('comments')
      .insert({ album_id: album.id, user_id: user.id, body: trimmed })
      .select('*, profiles!comments_user_id_fkey(email, display_name, avatar_url)')

    if (error) {
      console.error('Error posting comment:', error.message)
      setPostingComment(false)
      return
    }

    setComments((current) => [...current, data[0]])
    setCommentInput('')
    setPostingComment(false)
  }

  async function handleDeleteComment(commentId) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('Error deleting comment:', error.message)
      return
    }

    setComments((current) => current.filter((c) => c.id !== commentId))
  }

  function handleCommentKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handlePostComment()
    }
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

    let startsAt = null
    let endsAt = null

    if (isAuction) {
      // Duration always counts from whenever the auction actually starts
      // — immediately by default, or the scheduled time if one is set —
      // not from the moment the listing is created.
      let startDate = new Date()

      if (scheduledStart) {
        startDate = new Date(scheduledStart)
        if (startDate.getTime() <= Date.now()) {
          setFormError('Start time must be in the future.')
          return
        }
        startsAt = startDate.toISOString()
      }

      const durationDays = Number(auctionDuration)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + durationDays)
      endsAt = endDate.toISOString()
    }

    const listingData = {
      album_id: album.id,
      user_id: user.id,
      price: Number(price),
      listing_type: listingType,
      trade_preference: wantsTradeInfo ? tradePreference : null,
      starts_at: startsAt,
      ends_at: endsAt,
      shipping_price: shippingPrice.trim() === '' ? null : Number(shippingPrice),
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
    }

    if (isAuction) {
      await submitListing(listingData)
      return
    }

    setCheckingPricing(true)

    const { data: comparablePrices, error: compError } = await supabase
      .from('listings')
      .select('price')
      .eq('status', 'active')
      .ilike('title', album.title.trim())
      .ilike('artist', album.artist.trim())

    setCheckingPricing(false)

    if (compError) {
      console.error('Error checking comparable prices:', compError.message)
      await submitListing(listingData)
      return
    }

    if (!comparablePrices || comparablePrices.length === 0) {
      await submitListing(listingData)
      return
    }

    const prices = comparablePrices.map((r) => Number(r.price))
    const userPrice = Number(price)
    const belowCount = prices.filter((p) => p < userPrice).length
    const percentBelow = Math.round((belowCount / prices.length) * 100)
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length

    let comparisonText
    if (percentBelow >= 60) {
      comparisonText = `priced higher than ${percentBelow}% of similar listings`
    } else if (percentBelow <= 40) {
      comparisonText = `priced lower than ${100 - percentBelow}% of similar listings`
    } else {
      comparisonText = `in line with the market average of $${avgPrice.toFixed(2)}`
    }

    setPricingCheck({
      comparisonText,
      avgPrice,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      count: prices.length
    })
    setPendingListing(listingData)
  }

  async function submitListing(listingData) {
    const { error } = await supabase.from('listings').insert(listingData)

    if (error) {
      console.error('Error creating listing:', error.message)
      setFormError('This album may already have an active listing.')
      return
    }

    setListed(true)
    checkExistingListing()
  }

  async function handleConfirmListing() {
    if (!pendingListing) return
    await submitListing(pendingListing)
    setPricingCheck(null)
    setPendingListing(null)
  }

  function handleAdjustPrice() {
    setPricingCheck(null)
    setPendingListing(null)
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
    <>
      <div className="grid grid-cols-1 gap-6 p-6">
        <div>
          <img
            src={localImageUrl || PLACEHOLDER_COVER}
            alt={album.title}
            className="w-full aspect-square object-cover rounded"
          />
          <h2 className="font-serif italic text-2xl text-text mt-4 mb-0.5">{album.title}</h2>
          <p className="font-sans text-text-muted text-base">{album.artist}</p>
          <p className="font-sans text-sm text-text-faint">
            {album.year || 'Year unknown'} · {album.genre || 'Genre unknown'}
            {album.subgenre ? ` (${album.subgenre})` : ''}
          </p>

          <div className="mt-4 pt-4 border-t border-border font-sans text-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-text-muted m-0"><strong className="text-text">Condition</strong></p>
              {isOwnAlbum && !editingCondition && (
                <button
                  onClick={handleStartEditCondition}
                  className="text-[11px] text-accent bg-transparent border-0 cursor-pointer underline p-0"
                >
                  {localSleeveCondition || localMediaCondition ? 'Edit' : '+ Add condition'}
                </button>
              )}
            </div>

            {editingCondition ? (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-wide text-text-faint block mb-0.5">Sleeve</label>
                  <select
                    value={sleeveConditionInput}
                    onChange={(e) => setSleeveConditionInput(e.target.value)}
                    className="w-full bg-bg border border-border text-text px-2 py-1.5 rounded text-sm"
                  >
                    {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c || '—'}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-wide text-text-faint block mb-0.5">Media</label>
                  <select
                    value={mediaConditionInput}
                    onChange={(e) => setMediaConditionInput(e.target.value)}
                    className="w-full bg-bg border border-border text-text px-2 py-1.5 rounded text-sm"
                  >
                    {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c || '—'}</option>)}
                  </select>
                </div>
                <button
                  onClick={handleSaveCondition}
                  disabled={savingCondition}
                  className="bg-accent text-bg border-0 px-2.5 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {savingCondition ? '...' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingCondition(false)}
                  disabled={savingCondition}
                  className="bg-transparent border border-border text-text-muted px-2.5 py-1.5 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {localSleeveCondition && <p className="my-1 text-text-muted"><strong className="text-text">Sleeve:</strong> {localSleeveCondition}</p>}
                {localMediaCondition && <p className="my-1 text-text-muted"><strong className="text-text">Media:</strong> {localMediaCondition}</p>}
                {!localSleeveCondition && !localMediaCondition && (
                  <p className="my-1 text-text-faint">
                    {isOwnAlbum ? 'Not set yet.' : 'Not specified.'}
                  </p>
                )}
              </>
            )}
          </div>

          {hasPressingDetails && (
            <div className="mt-4 pt-4 border-t border-border font-sans text-sm text-text-muted">
              {album.label && <p className="my-1"><strong className="text-text">Label:</strong> {album.label}</p>}
              {album.pressingCountry && <p className="my-1"><strong className="text-text">Pressing country:</strong> {album.pressingCountry}</p>}
              {album.matrixNumber && <p className="my-1"><strong className="text-text">Matrix number:</strong> {album.matrixNumber}</p>}
              {album.deadwax && <p className="my-1"><strong className="text-text">Deadwax / runout:</strong> {album.deadwax}</p>}
              {album.specialTags && album.specialTags.length > 0 && (
                <p className="my-1"><strong className="text-text">Special:</strong> {album.specialTags.join(', ')}</p>
              )}
            </div>
          )}
        </div>

        <div>
          {(localTracklist && localTracklist.length > 0) ? (
            <div className="mb-4">
              <p className="font-serif italic text-base text-text mb-2">Tracklist</p>
              <ol className="text-sm list-none p-0 m-0">
                {localTracklist.map((t, i) => (
                  <li key={i} className="flex justify-between gap-2 py-1 border-b border-border last:border-0">
                    <span className="text-text">{t.position ? `${t.position}. ` : ''}{t.title}</span>
                    {t.duration && <span className="font-mono text-xs text-text-muted flex-shrink-0">{t.duration}</span>}
                  </li>
                ))}
              </ol>
              {localCredits && localCredits.length > 0 && (
                <p className="text-text-faint text-xs mt-2">
                  {localCredits.map((c) => `${c.name} — ${c.role}`).join(' · ')}
                </p>
              )}
            </div>
          ) : isOwnAlbum ? (
            <div className="mb-4">
              {!showTrackFinder ? (
                <button
                  onClick={() => { setShowTrackFinder(true); handleFindTracklist() }}
                  className="w-full bg-transparent border border-border text-text-muted px-2 py-2 rounded font-sans text-sm cursor-pointer hover:border-accent hover:text-accent"
                >
                  Find on Discogs ({localImageUrl ? 'tracklist & credits' : 'tracklist, credits & cover art'})
                </button>
              ) : (
                <div className="font-sans">
                  {trackSearching && <p className="text-sm text-text-muted">Searching...</p>}
                  {trackFinderError && <p className="text-xs text-text-muted mb-2">{trackFinderError}</p>}
                  {trackSearchResults.length > 0 && (
                    <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
                      {trackSearchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSelectTrackRelease(result)}
                          disabled={savingTracklist === result.id}
                          className="flex items-center gap-3 bg-bg border border-border rounded px-3 py-2 text-left cursor-pointer hover:border-accent disabled:opacity-60"
                        >
                          <img src={result.thumb || PLACEHOLDER_SMALL} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                          <span className="text-sm text-text flex-1">
                            {result.title}
                            <span className="text-text-muted text-xs block">
                              {[result.year, result.format, result.country].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          {savingTracklist === result.id && <span className="text-xs text-text-muted">Saving...</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-faint font-sans mb-4">No tracklist on file yet.</p>
          )}

          {isOwnAlbum && (
            <div className={localTracklist ? 'pt-4 border-t border-border font-sans' : 'font-sans'}>
              {checkingListing ? null : existingListing ? (
                <div className="text-sm text-text-muted">
                  <p>
                    Already listed — <strong className="text-text">${Number(existingListing.price).toFixed(2)}</strong>
                    {' '}({existingListing.listing_type.replace(/_/g, ' ')})
                  </p>
                  <p>
                    <strong className="text-text">Shipping:</strong>{' '}
                    {existingListing.shipping_price != null ? `$${Number(existingListing.shipping_price).toFixed(2)}` : 'Contact seller'}
                  </p>
                  {existingListing.trade_preference && (
                    <p><strong className="text-text">Wants in trade:</strong> {existingListing.trade_preference}</p>
                  )}
                  {existingListing.starts_at && new Date(existingListing.starts_at) > new Date() && (
                    <p><strong className="text-text">Starts:</strong> {new Date(existingListing.starts_at).toLocaleString()}</p>
                  )}
                  {existingListing.ends_at && (
                    <p><strong className="text-text">Ends:</strong> {new Date(existingListing.ends_at).toLocaleString()}</p>
                  )}
                  <button
                    onClick={handleCancelListing}
                    className="w-full mt-2.5 bg-transparent border border-border text-text-muted px-2 py-2 rounded text-sm cursor-pointer hover:border-accent hover:text-accent"
                  >
                    Cancel this listing
                  </button>
                  <ListingPhotoUploader listingId={existingListing.id} />
                </div>
              ) : listed ? (
                <p className="text-accent text-sm text-center">Listed for sale in your marketplace!</p>
              ) : pricingCheck ? (
                <div className="text-sm">
                  <p className="text-text-muted mb-3">
                    You are about to {listingType === 'trade' ? 'value' : 'list'} <strong className="text-text">{album.title}</strong> by {album.artist}
                    {album.genre && `, ${album.genre}`}
                    {album.sleeveCondition && `, sleeve ${album.sleeveCondition}`}
                    {album.mediaCondition && `, media ${album.mediaCondition}`}
                    {' '}for <strong className="text-accent">${Number(price).toFixed(2)}</strong>.
                  </p>
                  <p className="text-text-muted mb-3">
                    This is {pricingCheck.comparisonText} ({pricingCheck.count} comparable listing{pricingCheck.count === 1 ? '' : 's'}, ${pricingCheck.minPrice.toFixed(2)}–${pricingCheck.maxPrice.toFixed(2)}).
                  </p>
                  <div className="flex gap-2">
                    <button onClick={handleConfirmListing} className="flex-1 bg-accent text-bg border-0 px-2 py-2 rounded text-sm cursor-pointer">
                      Confirm this price
                    </button>
                    <button onClick={handleAdjustPrice} className="flex-1 bg-transparent border border-border text-text-muted px-2 py-2 rounded text-sm cursor-pointer">
                      Adjust price
                    </button>
                  </div>
                </div>
              ) : isListing ? (
                <form onSubmit={handleCreateListing}>
                  <div className="flex gap-2.5 items-center mb-2.5">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Price ($)"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      className={fieldClass}
                    />
                    <select value={listingType} onChange={(event) => setListingType(event.target.value)} className={fieldClass}>
                      <option value="fixed">Fixed price</option>
                      <option value="fixed_or_trade">Fixed price or trade</option>
                      <option value="trade">Open to trade only</option>
                      <option value="auction">Auction</option>
                    </select>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder='Shipping ($) — leave blank to say "contact seller"'
                    value={shippingPrice}
                    onChange={(event) => setShippingPrice(event.target.value)}
                    className={`${fieldClass} w-full mb-2`}
                  />
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
                    <>
                      <select value={auctionDuration} onChange={(event) => setAuctionDuration(event.target.value)} className={`${fieldClass} w-full mt-2 mb-2`}>
                        <option value="1">1 day</option>
                        <option value="3">3 days</option>
                        <option value="5">5 days</option>
                        <option value="7">7 days</option>
                        <option value="10">10 days</option>
                      </select>
                      <label className="text-xs text-text-muted block mb-1">
                        Start time (optional — leave blank to start immediately)
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledStart}
                        onChange={(event) => setScheduledStart(event.target.value)}
                        className={`${fieldClass} w-full mb-2`}
                      />
                    </>
                  )}
                  {formError && <p className="text-[#c1666b] text-sm m-0">{formError}</p>}
                  <button
                    type="submit"
                    disabled={checkingPricing}
                    className="w-full bg-accent text-bg border-0 px-2 py-2 rounded text-sm cursor-pointer disabled:opacity-60"
                  >
                    {checkingPricing ? 'Checking market prices...' : 'Confirm listing'}
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsListing(true)}
                  className="w-full bg-accent text-bg border-0 px-2 py-2 rounded text-sm cursor-pointer"
                >
                  List for sale
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-6 pt-2 border-t border-border font-sans">
        <p className="font-serif italic text-base text-text mb-3">Comments</p>

        {commentsLoading ? (
          <p className="text-sm text-text-muted">Loading comments...</p>
        ) : (
          <div className="flex flex-col gap-2 mb-3 max-h-48 overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-sm text-text-muted">No comments yet — be the first.</p>
            )}
            {comments.map((comment) => (
              <div key={comment.id} className="bg-bg border border-border rounded px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <img src={comment.profiles?.avatar_url || PLACEHOLDER_AVATAR} alt="" className="w-5 h-5 object-cover rounded-full" />
                    <strong className="text-text">{comment.profiles?.display_name || comment.profiles?.email || 'Someone'}</strong>
                  </span>
                  {comment.user_id === user.id && (
                    <button onClick={() => handleDeleteComment(comment.id)} className="bg-transparent border-0 text-text-muted text-xs cursor-pointer hover:text-accent">
                      Delete
                    </button>
                  )}
                </div>
                <p className="text-text-muted m-0 mt-1">{comment.body}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            value={commentInput}
            onChange={(event) => setCommentInput(event.target.value)}
            onKeyDown={handleCommentKeyDown}
            placeholder="Add a comment..."
            rows={2}
            disabled={postingComment}
            className="flex-1 bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm resize-none"
          />
          <button
            onClick={handlePostComment}
            disabled={postingComment || !commentInput.trim()}
            className="bg-accent text-bg font-bold text-sm px-3 rounded cursor-pointer disabled:opacity-60"
          >
            Post
          </button>
        </div>
      </div>
    </>
  )
}

export default AlbumDetailContent