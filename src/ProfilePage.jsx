import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from './Header'
import AlbumModal from './AlbumModal'
import ReviewsSection from './ReviewsSection'
import AddAlbumForm from './AddAlbumForm'
import ImportCsvModal from './ImportCsvModal'
import ShelfWallView from './ShelfWallView'
import ShelfCrateGridView from './ShelfCrateGridView'
import ShelfDetailPanel from './ShelfDetailPanel'
import FavoritesSection from './FavoritesSection'
import CrateSection from './CrateSection'
import RecommendedListenSection from './RecommendedListenSection'
import GearSection from './GearSection'
import AlbumDetailContent from './AlbumDetailContent'
import SidePanel from './SidePanel'
import ScanCrateModal from './ScanCrateModal'
import WelcomeChecklist from './WelcomeChecklist'
import ActivityStrip from './ActivityStrip'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { attachRarity, displayNameFor, fuzzyMatchKey, matchKey } from './utils'
import {
  rowToAlbum, albumToRow, attachListingStatus, countByField, uploadAlbumCover, wishlistItemToRow
} from './profile/profileData'
import { loadShelfComparison } from './profile/compareShelves'
import { downloadShelfCsv, applyShelfCsvUpdates } from './profile/shelfCsv'
import { useWishlist } from './profile/useWishlist'
import { useProfileEditor } from './profile/useProfileEditor'
import ProfileBanner from './profile/ProfileBanner'
import ProfileTabs from './profile/ProfileTabs'
import ProfileEditForm from './profile/ProfileEditForm'
import SellerDashboard from './profile/SellerDashboard'
import ComparisonPanel from './profile/ComparisonPanel'
import ShelfStats from './profile/ShelfStats'
import NowSpinningStrip from './profile/NowSpinningStrip'
import MostWantedBoard from './profile/MostWantedBoard'
import MiniCratesPreview from './profile/MiniCratesPreview'
import ShelfToolbar from './profile/ShelfToolbar'
import ShelfAlbumGrid from './profile/ShelfAlbumGrid'
import ShelfEmptyState from './profile/ShelfEmptyState'

const MAX_WISHLIST_RANK = 25

function ProfilePage() {
  const { userId } = useParams()
  const { user } = useAuth()
  const isOwnProfile = user.id === userId

  const [profile, setProfile] = useState(null)
  const [albums, setAlbums] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const [editingAlbum, setEditingAlbum] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showScanCrateModal, setShowScanCrateModal] = useState(false)
  const [showAddAlbum, setShowAddAlbum] = useState(false)
  const [shelfView, setShelfView] = useState('grid')
  const [collectionSearch, setCollectionSearch] = useState('')
  const [shelfSort, setShelfSort] = useState('recent')
  const [genreFilter, setGenreFilter] = useState('')
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [ratingInfo, setRatingInfo] = useState({ average: 0, count: 0 })

  // Which body the page shows under the tab row: null is the profile home
  // (Most wanted, Mini-crates, the shelf); the rest replace it in place.
  const [tab, setTab] = useState(null)
  const [managingWishlist, setManagingWishlist] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [cratesReloadKey, setCratesReloadKey] = useState(0)
  const [addedToMostWanted, setAddedToMostWanted] = useState([])

  const [comparison, setComparison] = useState(null)
  const [comparisonLoading, setComparisonLoading] = useState(true)

  const [sellerStats, setSellerStats] = useState(null)
  const [sellerStatsLoading, setSellerStatsLoading] = useState(true)

  const editor = useProfileEditor({ viewerId: user.id, profile, setProfile })
  const wishlist = useWishlist({ viewerId: user.id, profileUserId: userId, isOwnProfile })

  useEffect(() => {
    setTab(null)
    setSelectedAlbum(null)
    setManagingWishlist(false)
    setShowComparison(false)
    loadProfile()
  }, [userId])

  async function loadProfile() {
    setLoading(true)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    setProfile(profileData)
    editor.hydrate(profileData)

    const { data: followData } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .maybeSingle()

    const allowed = !!followData || isOwnProfile
    setIsFollowing(allowed)

    await Promise.all([loadNetworkCounts(), loadRating()])

    if (allowed) {
      await fetchAlbums()
    } else {
      const { count } = await supabase
        .from('albums')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      setAlbums(new Array(count || 0).fill(null))
    }

    if (isOwnProfile) {
      await wishlist.loadOwnWishlist()
      await loadSellerStats()
    } else if (allowed) {
      await loadComparison()
      await wishlist.loadTheirWishlist()
    }

    setLoading(false)
  }

  // Own-profile "My marketplace" tab leads with this: active listings,
  // pending trade offers and recent sales are what's useful to see at a
  // glance on your own account.
  async function loadSellerStats() {
    setSellerStatsLoading(true)

    const { count: activeListingsCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active')

    const { count: pendingOffersCount } = await supabase
      .from('trade_offers')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('status', 'pending')

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: salesThisMonthCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'sold')
      .gte('sold_at', startOfMonth.toISOString())

    setSellerStats({
      activeListings: activeListingsCount || 0,
      pendingOffers: pendingOffersCount || 0,
      salesThisMonth: salesThisMonthCount || 0
    })
    setSellerStatsLoading(false)
  }

  // Following / Followers counts are public identity info shown on whichever
  // profile is being viewed — not gated behind follow-approval like the
  // album collection is. The full lists live on their own pages.
  async function loadNetworkCounts() {
    const [{ count: following }, { count: followers }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId)
    ])
    setFollowingCount(following || 0)
    setFollowersCount(followers || 0)
  }

  async function loadRating() {
    const { data, error } = await supabase.from('reviews').select('rating').eq('seller_id', userId)
    if (error) {
      console.error('Error loading rating:', error.message)
      return
    }
    const ratings = data || []
    const average = ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0
    setRatingInfo({ average, count: ratings.length })
  }

  async function fetchAlbums() {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading albums:', error.message)
      return
    }

    const albumsWithRarity = await attachRarity(data.map(rowToAlbum))
    setAlbums(await attachListingStatus(albumsWithRarity, userId))
  }

  async function loadComparison() {
    setComparisonLoading(true)
    setComparison(await loadShelfComparison(user.id, userId))
    setComparisonLoading(false)
  }

  async function handleAddAlbum(newAlbum) {
    const uploadedUrl = await uploadAlbumCover(newAlbum.imageFile, user.id)

    const albumForDb = { ...newAlbum, imageUrl: uploadedUrl || newAlbum.discogsImageUrl || '' }
    delete albumForDb.imageFile
    delete albumForDb.existingImageUrl
    delete albumForDb.discogsImageUrl

    const { data, error } = await supabase
      .from('albums')
      .insert({ ...albumToRow(albumForDb), user_id: user.id })
      .select()

    if (error) {
      console.error('Error adding album:', error.message)
      return
    }

    setAlbums([rowToAlbum(data[0]), ...albums])
  }

  async function handleUpdateAlbum(updatedAlbum) {
    const uploadedUrl = await uploadAlbumCover(updatedAlbum.imageFile, user.id)

    const albumForDb = {
      ...updatedAlbum,
      imageUrl: uploadedUrl || updatedAlbum.discogsImageUrl || updatedAlbum.existingImageUrl
    }
    delete albumForDb.imageFile
    delete albumForDb.existingImageUrl
    delete albumForDb.discogsImageUrl

    const { data, error } = await supabase
      .from('albums')
      .update(albumToRow(albumForDb))
      .eq('id', updatedAlbum.id)
      .select()

    if (error) {
      console.error('Error updating album:', error.message)
      return
    }

    const updatedRow = rowToAlbum(data[0])
    setAlbums(albums.map((album) => (album.id === updatedRow.id ? updatedRow : album)))
    setEditingAlbum(null)
  }

  async function handleDeleteAlbum(idToDelete) {
    const { error } = await supabase.from('albums').delete().eq('id', idToDelete)

    if (error) {
      console.error('Error deleting album:', error.message)
      return
    }

    setAlbums(albums.filter((album) => album.id !== idToDelete))
  }

  async function handleImportAlbums(albumsToImport) {
    // imageUrl falls back to '' only when absent — CSV import never
    // supplies one, so this preserves that exact behavior, while Scan
    // Crate's Discogs-enriched cover art now survives the import instead
    // of being silently stripped.
    const rowsToInsert = albumsToImport.map((album) => ({
      ...albumToRow({ ...album, isInCollection: true, imageUrl: album.imageUrl || '' }),
      user_id: user.id
    }))

    const { data, error } = await supabase.from('albums').insert(rowsToInsert).select()

    if (error) {
      console.error('Error importing albums:', error.message)
      return []
    }

    fetchAlbums()
    // Returned in insert order — Postgres preserves row order for a
    // single multi-row INSERT ... RETURNING, which Scan Crate relies on
    // to match each inserted album back to its listing details by
    // position, since neither title nor id exists on the client side
    // until after this insert completes.
    return data.map(rowToAlbum)
  }

  async function handleExportShelf() {
    await downloadShelfCsv(realAlbums, user.id)
  }

  async function handleUpdateFromCsv(rows) {
    const result = await applyShelfCsvUpdates(rows, realAlbums, user.id)
    fetchAlbums()
    return result
  }

  function handleFollowChange(following) {
    setIsFollowing(following)
    if (following) loadProfile()
  }

  // Opens the About tab and brings the reviews into view.
  function openReviews() {
    setTab('about')
    setTimeout(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  function openCrates() {
    setTab('crates')
  }

  function leaveTab() {
    if (tab === 'crates') setCratesReloadKey((k) => k + 1)
    setTab(null)
  }

  function changeTab(next) {
    if (tab === 'crates') setCratesReloadKey((k) => k + 1)
    setTab(next)
  }

  function startEditAlbum(album) {
    setEditingAlbum(album)
    setShowAddAlbum(true)
    setTimeout(() => document.getElementById('shelf')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  // Visitor action on the details panel: put this record on the viewer's own
  // Most wanted list at the next open rank (they can re-rank it afterwards).
  async function handleAddToMyMostWanted(album) {
    const { data: mine, error } = await supabase
      .from('wishlist_items')
      .select('title, artist, rank')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error reading your Most wanted:', error.message)
      return
    }

    const alreadyThere = (mine || []).some((row) => matchKey(row.title, row.artist) === matchKey(album.title, album.artist))
    if (!alreadyThere) {
      const taken = new Set((mine || []).map((row) => row.rank))
      let rank = 1
      while (taken.has(rank) && rank <= MAX_WISHLIST_RANK) rank += 1
      if (rank > MAX_WISHLIST_RANK) {
        alert('Your Most wanted list is full (25). Remove one to add another.')
        return
      }

      const { error: insertError } = await supabase.from('wishlist_items').insert({
        ...wishlistItemToRow({ ...album, specialTags: album.specialTags || [] }),
        user_id: user.id,
        rank
      })

      if (insertError) {
        console.error('Error adding to Most wanted:', insertError.message)
        return
      }
    }

    setAddedToMostWanted((current) => [...current, album.id])
  }

  if (loading) {
    return (
      <>
        <Header />
        <section className="px-10 pb-10"><p>Loading profile...</p></section>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <Header />
        <section className="px-10 pb-10"><p className="text-text-muted font-sans text-sm">User not found.</p></section>
      </>
    )
  }

  const realAlbums = albums.filter(Boolean)
  const artistCounts = countByField(realAlbums, (a) => a.artist)
  const genreCounts = countByField(realAlbums, (a) => a.genre)
  const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0]
  const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]

  const dupCounts = {}
  for (const a of realAlbums) {
    const key = fuzzyMatchKey(a)
    if (!dupCounts[key]) dupCounts[key] = { count: 0, title: a.title, artist: a.artist }
    dupCounts[key].count += 1
  }
  const topDuplicate = Object.values(dupCounts).sort((a, b) => b.count - a.count)[0]

  const existingTitles = [...new Set(realAlbums.map((a) => a.title))]
  const existingArtists = [...new Set(realAlbums.map((a) => a.artist))]
  const existingLabels = [...new Set(realAlbums.map((a) => a.label).filter(Boolean))]
  const existingPressingCountries = [...new Set(realAlbums.map((a) => a.pressingCountry).filter(Boolean))]

  // The 15 rarest albums lead the shelf; everything else sits below them and
  // is what search / sort / genre act on.
  const topRarest = realAlbums
    .filter((a) => a.rarityRank)
    .sort((a, b) => a.rarityRank - b.rarityRank)
    .slice(0, 15)
  const topRarestIds = new Set(topRarest.map((a) => a.id))
  const restOfShelf = realAlbums.filter((a) => !topRarestIds.has(a.id))

  const normalizedSearch = collectionSearch.trim().toLowerCase()
  const shelfGenres = [...new Set(realAlbums.map((a) => a.genre).filter(Boolean))].sort()
  const sorters = {
    recent: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    rarity: (a, b) => (a.rarityRank || Infinity) - (b.rarityRank || Infinity),
    title: (a, b) => (a.title || '').localeCompare(b.title || ''),
    artist: (a, b) => (a.artist || '').localeCompare(b.artist || ''),
    year: (a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999)
  }
  const visibleRest = restOfShelf
    .filter((a) => !genreFilter || a.genre === genreFilter)
    .filter((a) => !normalizedSearch || a.title.toLowerCase().includes(normalizedSearch) || a.artist.toLowerCase().includes(normalizedSearch))
    .sort(sorters[shelfSort] || sorters.recent)

  const name = displayNameFor(profile)
  const hasListings = realAlbums.some((a) => a.listing)

  const stats = {
    albums: albums.length,
    rating: ratingInfo.count > 0 ? ratingInfo.average.toFixed(1) : null,
    following: followingCount,
    followers: followersCount
  }

  const sectionHeading = 'm-0 font-serif italic font-normal text-[28px] leading-tight'

  const aboutBody = (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex-1 min-w-0 flex flex-col gap-6 w-full">
        <div id="reviews" className="scroll-mt-4"><ReviewsSection sellerId={userId} /></div>
        <GearSection
          userId={userId}
          isOwnProfile={isOwnProfile}
          profile={profile}
          onUpdated={(patch) => setProfile((current) => ({ ...current, ...patch }))}
        />
      </div>
      {isFollowing && (
        <div className="w-full lg:w-[360px] flex-none flex flex-col gap-2">
          {!isOwnProfile && <ComparisonPanel comparisonLoading={comparisonLoading} comparison={comparison} />}
          {realAlbums.length > 0 && (
            <ShelfStats
              realAlbums={realAlbums}
              topArtist={topArtist}
              topGenre={topGenre}
              topDuplicate={topDuplicate}
              userId={userId}
              isOwnProfile={isOwnProfile}
            />
          )}
          <div className="border-t border-border pt-4 mb-4">
            <RecommendedListenSection userId={userId} isOwnProfile={isOwnProfile} realAlbums={realAlbums} onOpenAlbum={setSelectedAlbum} />
          </div>
          <div className="border-t border-border pt-4">
            <FavoritesSection userId={userId} isOwnProfile={isOwnProfile} realAlbums={realAlbums} onOpenAlbum={setSelectedAlbum} compact />
          </div>
        </div>
      )}
    </div>
  )

  const listedAlbums = realAlbums.filter((a) => a.listing)
  const marketplaceBody = (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className={sectionHeading}>{isOwnProfile ? 'My marketplace' : `${name}'s marketplace`}</h2>
        <Link to={`/profile/${userId}/marketplace`} className="text-[13px] text-accent no-underline">Open the full marketplace →</Link>
      </div>
      {isOwnProfile && <SellerDashboard sellerStatsLoading={sellerStatsLoading} sellerStats={sellerStats} />}
      {listedAlbums.length === 0 ? (
        <p className="text-sm text-text-muted m-0">
          {isOwnProfile ? 'Nothing is listed right now. List an album from your shelf and it will show up here.' : 'Nothing is listed right now.'}
        </p>
      ) : (
        <ShelfAlbumGrid
          albums={listedAlbums}
          isOwnProfile={false}
          onDelete={() => {}}
          onEdit={() => {}}
          onSelect={(album) => { setTab(null); setSelectedAlbum(album) }}
        />
      )}
    </div>
  )

  const homeBody = !isFollowing ? (
    <p className="text-text-muted font-sans text-sm mb-10">Follow {name} to see their shelf and marketplace.</p>
  ) : (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-8 items-start">
        {/* Most wanted beside Mini-crates. Visitors see Most wanted first so
            they can spot what they own that you want. */}
        <div className="basis-full min-w-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-x-8 gap-y-3.5 border-b border-border pb-6">
          <MostWantedBoard
            isOwnProfile={isOwnProfile}
            profileName={name}
            userId={userId}
            wishlist={wishlist}
            managing={managingWishlist}
            onToggleManaging={(forceOpen) => setManagingWishlist(forceOpen === true ? true : !managingWishlist)}
          />
          <MiniCratesPreview
            userId={userId}
            isOwnProfile={isOwnProfile}
            onViewAll={openCrates}
            onOpenAlbum={(albumId) => setSelectedAlbum(realAlbums.find((a) => a.id === albumId) || null)}
            reloadKey={cratesReloadKey}
          />
        </div>

        <div id="shelf" className="flex-1 basis-[560px] min-w-0 flex flex-col gap-6 scroll-mt-4">
          {isOwnProfile && (
            <WelcomeChecklist userId={user.id} albumCount={realAlbums.length} activeListingsCount={sellerStats?.activeListings} />
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className={sectionHeading}>{isOwnProfile ? 'Your shelf' : `${name}'s shelf`}</h2>
              <div className="text-[13px] leading-snug text-text-muted">
                {topRarest.length > 0
                  ? `15 rarest albums in ${isOwnProfile ? 'your' : `${name}'s`} collection`
                  : 'The 15 rarest albums appear here'}
              </div>
            </div>
            {topRarest.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {topRarest.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAlbum(a)}
                    title={`${a.title} — ${a.artist}`}
                    className={`relative aspect-square bg-border bg-cover bg-center p-0 cursor-pointer ${i === 0 ? 'border-2 border-accent' : 'border border-border'}`}
                    style={{ backgroundImage: a.imageUrl ? `url(${a.imageUrl})` : undefined }}
                  >
                    <span className="absolute top-1.5 left-1.5 bg-accent text-bg font-mono text-[10px] px-1.5 py-0.5">#{i + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {realAlbums.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-border pt-6">
              <h3 className="m-0 font-serif italic font-normal text-[22px]">The rest of the shelf</h3>
              <span className="text-[13px] text-text-muted">{restOfShelf.length} album{restOfShelf.length === 1 ? '' : 's'}</span>
            </div>
          )}

          <ShelfToolbar
            search={collectionSearch}
            setSearch={setCollectionSearch}
            sort={shelfSort}
            setSort={setShelfSort}
            genre={genreFilter}
            setGenre={setGenreFilter}
            genres={shelfGenres}
            shelfView={shelfView}
            setShelfView={setShelfView}
            isOwnProfile={isOwnProfile}
            disabled={realAlbums.length === 0}
            onAddOne={() => setShowAddAlbum(true)}
            onScan={() => setShowScanCrateModal(true)}
            onImport={() => setShowImportModal(true)}
            onExport={handleExportShelf}
          />

          {isOwnProfile && (showAddAlbum || editingAlbum) && (
            <div className="pb-4 border-b border-border">
              <AddAlbumForm
                onAddAlbum={(album) => { handleAddAlbum(album); setShowAddAlbum(false) }}
                onUpdateAlbum={(album) => { handleUpdateAlbum(album); setShowAddAlbum(false) }}
                editingAlbum={editingAlbum}
                onCancelEdit={() => { setEditingAlbum(null); setShowAddAlbum(false) }}
                existingTitles={existingTitles}
                existingArtists={existingArtists}
                existingLabels={existingLabels}
                existingPressingCountries={existingPressingCountries}
              />
              {!editingAlbum && (
                <button onClick={() => setShowAddAlbum(false)} className="text-xs text-text-muted bg-transparent border-0 cursor-pointer p-0">Cancel</button>
              )}
            </div>
          )}

          {realAlbums.length === 0 ? (
            <ShelfEmptyState
              isOwnProfile={isOwnProfile}
              onAddOne={() => setShowAddAlbum(true)}
              onScan={() => setShowScanCrateModal(true)}
              onImport={() => setShowImportModal(true)}
            />
          ) : visibleRest.length === 0 ? (
            <p className="text-text-muted font-sans text-sm m-0">
              {restOfShelf.length === 0 ? 'Every album here is in the rarest 15.' : 'No albums match.'}
            </p>
          ) : shelfView === 'wall' ? (
            <ShelfWallView albums={visibleRest} onSelectAlbum={setSelectedAlbum} isOwnProfile={isOwnProfile} />
          ) : shelfView === 'crates' ? (
            <ShelfCrateGridView albums={visibleRest} onSelectAlbum={setSelectedAlbum} />
          ) : (
            <ShelfAlbumGrid
              albums={visibleRest}
              isOwnProfile={isOwnProfile}
              onDelete={handleDeleteAlbum}
              onEdit={startEditAlbum}
              onSelect={setSelectedAlbum}
            />
          )}
        </div>

        {/* Reserved detail column — lg+ only; sticky, so the record you
            picked stays in view while the shelf scrolls. Below lg the
            SidePanel overlay below takes over. */}
        <div className="hidden lg:block lg:w-[360px] flex-none self-start sticky top-4">
          <ShelfDetailPanel
            album={selectedAlbum}
            onClose={() => setSelectedAlbum(null)}
            isOwnAlbum={isOwnProfile}
            onEdit={startEditAlbum}
            onMoveToCrate={openCrates}
            onAddToMostWanted={handleAddToMyMostWanted}
            addedToMostWanted={!!selectedAlbum && addedToMostWanted.includes(selectedAlbum.id)}
          />
        </div>
      </div>
    </div>
  )

  const tabBody = {
    about: aboutBody,
    marketplace: marketplaceBody,
    activity: <ActivityStrip />,
    crates: (
      <CrateSection userId={userId} isOwnProfile={isOwnProfile} realAlbums={realAlbums} onOpenAlbum={(a) => { setTab(null); setSelectedAlbum(a) }} />
    )
  }[tab]

  return (
    <>
      <Header />

      <div className="max-w-[1200px] w-full mx-auto px-5 lg:px-10 pt-8 pb-16 flex flex-col gap-6 overflow-x-clip">
        <ProfileBanner
          profile={profile}
          avatarPreviewUrl={editor.avatarPreviewUrl}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          userId={userId}
          editingProfile={editor.editingProfile}
          onEditProfile={() => editor.setEditingProfile(true)}
          onFollowChange={handleFollowChange}
          onOpenReviews={openReviews}
          comparison={comparison}
          onToggleCompare={() => setShowComparison((v) => !v)}
          stats={stats}
          nowSpinning={(
            <NowSpinningStrip
              userId={userId}
              isOwnProfile={isOwnProfile}
              realAlbums={realAlbums}
              albumId={profile?.now_spinning_album_id}
              onUpdated={(patch) => setProfile((current) => ({ ...current, ...patch }))}
              onOpenAlbum={setSelectedAlbum}
            />
          )}
        />

        {isOwnProfile && editor.editingProfile && <ProfileEditForm editor={editor} />}

        {!isOwnProfile && showComparison && (
          <ComparisonPanel comparisonLoading={comparisonLoading} comparison={comparison} />
        )}

        <ProfileTabs
          active={tab === 'crates' ? null : tab}
          onChange={changeTab}
          isOwnProfile={isOwnProfile}
          showActivity={isOwnProfile}
          hasMarketplace={isFollowing && (isOwnProfile || hasListings)}
        />

        {tab === null ? homeBody : (
          <div className="flex flex-col gap-4">
            <button onClick={leaveTab} className="self-start text-[13px] text-accent bg-transparent border-0 p-0 cursor-pointer">← Back to the shelf</button>
            {tabBody}
          </div>
        )}
      </div>

      {/* Narrow-screen fallback for the shelf's selected album — at lg+ the
          sticky panel above already handles it, so this renders nothing. */}
      {selectedAlbum && (
        <SidePanel onClose={() => setSelectedAlbum(null)} width={480} overlayOnly>
          <AlbumDetailContent key={selectedAlbum.id} album={selectedAlbum} isOwnAlbum={isOwnProfile} />
        </SidePanel>
      )}

      {wishlist.selectedWishlistItem && (
        <AlbumModal album={wishlist.selectedWishlistItem} onClose={() => wishlist.setSelectedWishlistItem(null)} />
      )}

      {showImportModal && (
        <ImportCsvModal onImport={handleImportAlbums} onUpdate={handleUpdateFromCsv} onClose={() => setShowImportModal(false)} />
      )}

      {showScanCrateModal && (
        <ScanCrateModal
          onClose={() => setShowScanCrateModal(false)}
          onImport={handleImportAlbums}
          existingAlbums={realAlbums}
        />
      )}
    </>
  )
}

export default ProfilePage
