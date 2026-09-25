import { useState, useRef, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { discogsSearch, discogsFetchRelease, fuzzyMatchKey } from './utils'
import SidePanel from './SidePanel'
import ScanCrateReviewRow from './ScanCrateReviewRow'
import ScanCrateDetailRow from './ScanCrateDetailRow'

// Crate Scan — capture, identify, and review/confirm.
//
// Flow: photograph a shelf section -> upload -> AI vision identifies
// records on it (scan-crate Edge Function) -> each identified record gets
// searched against Discogs (reusing the same discogs-lookup function
// "Find on Discogs" already uses elsewhere) -> a single clean match
// auto-resolves, multiple matches show a picker, no match leaves the row
// editable with a retry-search option -> confirmed rows get bulk-inserted
// via the same onImport handler ImportCsvModal already uses.
//
// Progress persists to sessionStorage so backgrounding the tab (common
// right after using the camera) doesn't silently lose a completed scan —
// confirmed necessary in testing, not speculative.
const SESSION_KEY = 'vinylVenue.crateScan'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadSavedScan() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveScan(state) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state))
  } catch {
    // Non-critical if this fails (private browsing, quota) — convenience
    // feature, not core function.
  }
}

function clearSavedScan() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Same as above.
  }
}

function ScanCrateModal({ onClose, onImport, existingAlbums = [] }) {
  const { user } = useAuth()
  const [selectedFile, setSelectedFile] = useState(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState('')
  const [error, setError] = useState('')
  const [identifying, setIdentifying] = useState(false)
  const [identifyError, setIdentifyError] = useState('')
  const [reviewItems, setReviewItems] = useState(null)
  const [showDetailPrompt, setShowDetailPrompt] = useState(false)
  const [detailItems, setDetailItems] = useState(null)
  const [adding, setAdding] = useState(false)
  const [addedCount, setAddedCount] = useState(null)
  const [listingsCreatedCount, setListingsCreatedCount] = useState(0)
  const fileInputRef = useRef(null)

  // Same fuzzy title+artist matching already used elsewhere in the app
  // (Profile's own-collection comparisons) — not exact-string matching,
  // so minor punctuation/casing differences between the vision guess or
  // Discogs's listing and what's already on the shelf still register as
  // the same record. Duplicates are flagged, not blocked: some people
  // genuinely own multiple pressings of the same album, so this defaults
  // those rows to unchecked rather than silently skipping them — the
  // person decides, same principle as the ambiguous-match picker.
  const existingKeysSet = useMemo(
    () => new Set(existingAlbums.map(fuzzyMatchKey)),
    [existingAlbums]
  )

  function isDuplicateOfExisting(title, artist) {
    return existingKeysSet.has(fuzzyMatchKey({ title, artist }))
  }

  useEffect(() => {
    const saved = loadSavedScan()
    if (saved?.uploadedUrl) {
      setUploadedUrl(saved.uploadedUrl)
      if (saved.reviewItems) setReviewItems(saved.reviewItems)
    }
  }, [])

  const displayImageUrl = uploadedUrl || localPreviewUrl

  function handleFileChange(event) {
    const file = event.target.files[0]
    if (!file) return

    setError('')
    setUploadedUrl('')
    setReviewItems(null)
    setShowDetailPrompt(false)
    setDetailItems(null)
    setIdentifyError('')
    setAddedCount(null)
    clearSavedScan()
    setSelectedFile(file)
    setLocalPreviewUrl(URL.createObjectURL(file))
  }

  function handleChooseDifferentPhoto() {
    setSelectedFile(null)
    setLocalPreviewUrl('')
    setUploadedUrl('')
    setError('')
    setReviewItems(null)
    setShowDetailPrompt(false)
    setDetailItems(null)
    setIdentifyError('')
    setAddedCount(null)
    clearSavedScan()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload() {
    if (!selectedFile) return

    setUploading(true)
    setError('')

    const fileExt = selectedFile.name.split('.').pop()
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('crate-scans')
      .upload(fileName, selectedFile)

    if (uploadError) {
      console.error('Error uploading crate scan:', uploadError.message)
      setError('Could not upload that photo — try again.')
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('crate-scans').getPublicUrl(fileName)
    setUploadedUrl(data.publicUrl)
    saveScan({ uploadedUrl: data.publicUrl, reviewItems: null })
    setUploading(false)
  }

  async function handleIdentify() {
    if (!uploadedUrl) return

    setIdentifying(true)
    setIdentifyError('')

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token

    if (!accessToken) {
      setIdentifyError('Could not get your session token — try logging out and back in.')
      setIdentifying(false)
      return
    }

    try {
      const res = await fetch(
        'https://mjfnyqjahseojjbvnswp.supabase.co/functions/v1/scan-crate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({ imageUrl: uploadedUrl })
        }
      )

      const data = await res.json()

      if (data.error) {
        setIdentifyError(data.error)
        setIdentifying(false)
        return
      }

      setIdentifying(false)
      await enrichAllItems(data.items || [])
    } catch (err) {
      console.error('Error calling scan-crate:', err)
      setIdentifyError('Something went wrong calling the identification function — check the console.')
      setIdentifying(false)
    }
  }

  // Persists whatever the current reviewItems state is — called after
  // every enrichment step completes, not just at the end, so a
  // backgrounded tab during the (sometimes slow, many-item) enrichment
  // loop doesn't lose partial progress either.
  function persistReviewItems(items) {
    saveScan({ uploadedUrl, reviewItems: items })
  }

  function updateItem(key, patch) {
    setReviewItems((current) => {
      const next = current.map((it) => (it.key === key ? { ...it, ...patch } : it))
      persistReviewItems(next)
      return next
    })
  }

  async function enrichAllItems(rawItems) {
    const initial = rawItems.map((item, i) => ({
      key: `item-${i}`,
      title: item.title || '',
      artist: item.artist || '',
      confidence: item.confidence || 'low',
      note: item.note || null,
      discogsStatus: 'searching',
      candidates: [],
      enriched: null,
      included: false
    }))
    setReviewItems(initial)
    persistReviewItems(initial)

    for (const item of initial) {
      await searchDiscogsFor(item.key, item.title, item.artist)
      // A brief pause between each item — Discogs throttles bursts of
      // rapid requests, and a 25+ record scan can otherwise fire 40-50+
      // calls in a few seconds, causing later items to fail and get
      // wrongly marked "no match" even when a real one exists.
      await sleep(300)
    }
  }

  async function searchDiscogsFor(key, title, artist, isRetry = false) {
    updateItem(key, { discogsStatus: 'searching' })

    const { results, error: searchError } = await discogsSearch(title, artist)

    if (searchError || !results) {
      if (!isRetry) {
        // One retry after a short backoff — most failures at this point
        // are Discogs rate-limiting a burst, not a genuine absence of
        // results, so a brief pause and a second attempt recovers most
        // of them instead of silently mislabeling real albums as
        // unmatched.
        await sleep(1200)
        return searchDiscogsFor(key, title, artist, true)
      }
      updateItem(key, { discogsStatus: 'none', candidates: [] })
      return
    }

    if (results.length === 0) {
      updateItem(key, { discogsStatus: 'none', candidates: [] })
      return
    }

    if (results.length === 1) {
      await applyCandidate(key, results[0].id)
      return
    }

    updateItem(key, { discogsStatus: 'ambiguous', candidates: results })
  }

  async function applyCandidate(key, candidateId) {
    updateItem(key, { discogsStatus: 'fetching' })

    const { release, error: releaseError } = await discogsFetchRelease(candidateId)

    if (releaseError || !release) {
      updateItem(key, { discogsStatus: 'none' })
      return
    }

    // release.title/release.artist are always real strings from the
    // discogs-lookup Edge Function (possibly empty, never null/undefined)
    // — no need to fall back to the review item's prior value, which
    // previously required reading `reviewItems` directly here. That read
    // used a stale closure (this function's own closure, captured before
    // the scan's results existed) and crashed with "Cannot read
    // properties of null" whenever it ran — this avoids the whole
    // problem by not needing that lookup at all.
    const resolvedTitle = release.title || ''
    const resolvedArtist = release.artist || ''

    updateItem(key, {
      discogsStatus: 'matched',
      enriched: release,
      title: resolvedTitle,
      artist: resolvedArtist,
      included: !isDuplicateOfExisting(resolvedTitle, resolvedArtist)
    })
  }

  function handleFieldChange(key, field, value) {
    updateItem(key, { [field]: value })
  }

  function handleToggleInclude(key) {
    setReviewItems((current) => {
      const next = current.map((it) => (it.key === key ? { ...it, included: !it.included } : it))
      persistReviewItems(next)
      return next
    })
  }

  function handleRetrySearch(key) {
    const item = reviewItems.find((it) => it.key === key)
    if (item) searchDiscogsFor(key, item.title, item.artist)
  }

  function handleContinueFromReview() {
    const toAdd = reviewItems.filter((it) => it.included)
    if (toAdd.length === 0) return
    setShowDetailPrompt(true)
  }

  async function handleSkipDetails() {
    const toAdd = reviewItems.filter((it) => it.included)
    if (toAdd.length === 0) return

    setAdding(true)

    const albumsToImport = toAdd.map((item) => ({
      title: item.title,
      artist: item.artist,
      year: item.enriched?.year || null,
      genre: item.enriched?.genre || '',
      imageUrl: item.enriched?.coverImageUrl || '',
      label: item.enriched?.label || '',
      pressingCountry: item.enriched?.pressingCountry || '',
      matrixNumber: item.enriched?.matrixNumber || '',
      tracklist: item.enriched?.tracklist || null,
      credits: item.enriched?.credits || null
    }))

    await onImport(albumsToImport)

    setAddedCount(toAdd.length)
    setListingsCreatedCount(0)
    setAdding(false)
    setShowDetailPrompt(false)
    clearSavedScan()
  }

  function handleWantDetails() {
    const toAdd = reviewItems.filter((it) => it.included)
    setDetailItems(
      toAdd.map((item) => ({
        key: item.key,
        title: item.title,
        artist: item.artist,
        enriched: item.enriched,
        sleeveCondition: '',
        mediaCondition: '',
        listingType: 'none',
        price: '',
        tradePreference: ''
      }))
    )
    setShowDetailPrompt(false)
  }

  function handleDetailFieldChange(key, field, value) {
    setDetailItems((current) => current.map((it) => (it.key === key ? { ...it, [field]: value } : it)))
  }

  async function handleFinishWithDetails() {
    if (!detailItems || detailItems.length === 0) return

    setAdding(true)

    const albumsToImport = detailItems.map((item) => ({
      title: item.title,
      artist: item.artist,
      year: item.enriched?.year || null,
      genre: item.enriched?.genre || '',
      imageUrl: item.enriched?.coverImageUrl || '',
      label: item.enriched?.label || '',
      pressingCountry: item.enriched?.pressingCountry || '',
      matrixNumber: item.enriched?.matrixNumber || '',
      tracklist: item.enriched?.tracklist || null,
      credits: item.enriched?.credits || null,
      sleeveCondition: item.sleeveCondition || null,
      mediaCondition: item.mediaCondition || null
    }))

    const insertedAlbums = await onImport(albumsToImport)

    // Matched back to detailItems by array position — insertedAlbums
    // comes back in the same order as albumsToImport was sent, since
    // both derive from the same single pass over detailItems above.
    const listingsToInsert = []
    detailItems.forEach((item, i) => {
      const insertedAlbum = insertedAlbums?.[i]
      if (!insertedAlbum || item.listingType === 'none') return

      const wantsTradeInfo = item.listingType === 'trade' || item.listingType === 'fixed_or_trade'
      listingsToInsert.push({
        album_id: insertedAlbum.id,
        user_id: user.id,
        price: Number(item.price) || 0,
        listing_type: item.listingType,
        trade_preference: wantsTradeInfo ? (item.tradePreference || null) : null,
        status: 'active',
        title: insertedAlbum.title,
        artist: insertedAlbum.artist,
        year: insertedAlbum.year,
        genre: insertedAlbum.genre,
        image_url: insertedAlbum.imageUrl,
        sleeve_condition: insertedAlbum.sleeveCondition,
        media_condition: insertedAlbum.mediaCondition,
        label: insertedAlbum.label,
        pressing_country: insertedAlbum.pressingCountry
      })
    })

    if (listingsToInsert.length > 0) {
      const { error: listingsError } = await supabase.from('listings').insert(listingsToInsert)
      if (listingsError) {
        console.error('Error creating listings from scan:', listingsError.message)
      }
    }

    setAddedCount(detailItems.length)
    setListingsCreatedCount(listingsToInsert.length)
    setAdding(false)
    setDetailItems(null)
    clearSavedScan()
  }

  const resolvedCount = reviewItems
    ? reviewItems.filter((it) => it.discogsStatus !== 'searching' && it.discogsStatus !== 'fetching').length
    : 0
  const includedCount = reviewItems ? reviewItems.filter((it) => it.included).length : 0
  const stillResolving = reviewItems && resolvedCount < reviewItems.length

  return (
    <SidePanel onClose={onClose} width={520}>
      <div className="p-6">
        <h2 className="font-serif italic text-2xl text-text mb-1">Scan Crate</h2>
        <p className="font-sans text-sm text-text-muted mb-5">
          Photograph a section of your shelf — a few feet at a time works best.
        </p>

        {!displayImageUrl && (
          <label className="flex flex-col items-center justify-center gap-2.5 border-2 border-dashed border-border rounded-lg py-12 px-6 cursor-pointer hover:border-accent transition-colors font-sans">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="text-text-faint">
              <rect x="4" y="9" width="28" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="18" cy="19" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13 9l2-3h6l2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm text-text-muted">Tap to take or choose a photo</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}

        {displayImageUrl && !reviewItems && (
          <div>
            <img
              src={displayImageUrl}
              alt="Crate photo"
              className="w-full rounded-lg border border-border object-cover"
              style={{ maxHeight: 320 }}
            />

            {error && <p className="text-sm text-[#c1666b] mt-3 mb-0 font-sans">{error}</p>}

            {uploadedUrl ? (
              <div className="mt-4 font-sans">
                <button
                  onClick={handleIdentify}
                  disabled={identifying}
                  className="w-full bg-accent text-bg border-0 px-3 py-2 rounded text-sm font-bold cursor-pointer disabled:opacity-60 mb-2"
                >
                  {identifying ? 'Identifying records... (10-20s)' : 'Identify records'}
                </button>
                {identifyError && <p className="text-sm text-[#c1666b] mb-2">{identifyError}</p>}
                <button
                  onClick={handleChooseDifferentPhoto}
                  disabled={identifying}
                  className="text-xs text-text-muted bg-transparent border border-border rounded px-3 py-1.5 cursor-pointer hover:border-accent hover:text-accent"
                >
                  Choose different photo
                </button>
              </div>
            ) : (
              <div className="flex gap-2 mt-4 font-sans">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 bg-accent text-bg border-0 px-3 py-2 rounded text-sm font-bold cursor-pointer disabled:opacity-60"
                >
                  {uploading ? 'Uploading...' : 'Upload this photo'}
                </button>
                <button
                  onClick={handleChooseDifferentPhoto}
                  disabled={uploading}
                  className="bg-transparent border border-border text-text-muted px-3 py-2 rounded text-sm cursor-pointer hover:border-accent hover:text-accent"
                >
                  Choose different photo
                </button>
              </div>
            )}
          </div>
        )}

        {reviewItems && addedCount === null && !showDetailPrompt && !detailItems && (
          <div className="font-sans">
            <p className="text-xs text-text-muted mb-3">
              {reviewItems.length} record{reviewItems.length === 1 ? '' : 's'} found.{' '}
              {stillResolving
                ? `Matching with Discogs... (${resolvedCount} of ${reviewItems.length} resolved)`
                : 'Uncheck anything wrong, fix any that need it, then add the rest.'}
            </p>

            <div className="flex flex-col gap-2 mb-4 max-h-[26rem] overflow-y-auto">
              {reviewItems.map((item) => (
                <ScanCrateReviewRow
                  key={item.key}
                  item={item}
                  isDuplicate={isDuplicateOfExisting(item.title, item.artist)}
                  onFieldChange={handleFieldChange}
                  onToggleInclude={handleToggleInclude}
                  onSelectCandidate={applyCandidate}
                  onRetrySearch={handleRetrySearch}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleContinueFromReview}
                disabled={adding || includedCount === 0}
                className="flex-1 bg-accent text-bg border-0 px-3 py-2 rounded text-sm font-bold cursor-pointer disabled:opacity-60"
              >
                {`Continue with ${includedCount} album${includedCount === 1 ? '' : 's'}`}
              </button>
              <button
                onClick={handleChooseDifferentPhoto}
                disabled={adding}
                className="bg-transparent border border-border text-text-muted px-3 py-2 rounded text-sm cursor-pointer hover:border-accent hover:text-accent"
              >
                Start over
              </button>
            </div>
          </div>
        )}

        {showDetailPrompt && (
          <div className="bg-surface border border-border rounded p-4 font-sans">
            <p className="text-sm text-text font-bold mb-1">Add more details now?</p>
            <p className="text-xs text-text-muted mb-3">
              Set sleeve/media condition or list any of these for sale or trade — or
              skip this and just get them onto your shelf, you can always list them
              individually later.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleWantDetails}
                className="flex-1 bg-accent text-bg border-0 px-3 py-2 rounded text-sm font-bold cursor-pointer"
              >
                Add details
              </button>
              <button
                onClick={handleSkipDetails}
                disabled={adding}
                className="flex-1 bg-transparent border border-border text-text-muted px-3 py-2 rounded text-sm cursor-pointer hover:border-accent hover:text-accent disabled:opacity-60"
              >
                {adding ? 'Adding...' : 'Just save basics'}
              </button>
            </div>
          </div>
        )}

        {detailItems && addedCount === null && (
          <div className="font-sans">
            <p className="text-xs text-text-muted mb-3">
              Condition and listing info are optional per album — leave any of these
              as-is to skip them.
            </p>

            <div className="flex flex-col gap-2 mb-4 max-h-[26rem] overflow-y-auto">
              {detailItems.map((item) => (
                <ScanCrateDetailRow key={item.key} item={item} onFieldChange={handleDetailFieldChange} />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleFinishWithDetails}
                disabled={adding}
                className="flex-1 bg-accent text-bg border-0 px-3 py-2 rounded text-sm font-bold cursor-pointer disabled:opacity-60"
              >
                {adding ? 'Saving...' : `Add ${detailItems.length} album${detailItems.length === 1 ? '' : 's'}`}
              </button>
              <button
                onClick={() => setDetailItems(null)}
                disabled={adding}
                className="bg-transparent border border-border text-text-muted px-3 py-2 rounded text-sm cursor-pointer hover:border-accent hover:text-accent disabled:opacity-60"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {addedCount !== null && (
          <div className="bg-surface border border-border rounded p-4 font-sans text-center">
            <p className="text-accent font-bold text-sm mb-3">
              Added {addedCount} album{addedCount === 1 ? '' : 's'} to your shelf
              {listingsCreatedCount > 0
                ? `, ${listingsCreatedCount} listed for sale or trade.`
                : '.'}
            </p>
            <button
              onClick={handleChooseDifferentPhoto}
              className="bg-accent text-bg border-0 px-3 py-2 rounded text-sm font-bold cursor-pointer"
            >
              Scan another section
            </button>
          </div>
        )}
      </div>
    </SidePanel>
  )
}

export default ScanCrateModal