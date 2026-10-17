import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
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
import NowSpinningSection from './NowSpinningSection'
import GearSection from './GearSection'
import AlbumDetailContent from './AlbumDetailContent'
import SidePanel from './SidePanel'
import ScanCrateModal from './ScanCrateModal'
import WelcomeChecklist from './WelcomeChecklist'
import ActivityStrip from './ActivityStrip'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { attachRarity, displayNameFor, fuzzyMatchKey } from './utils'
import {
  rowToAlbum, albumToRow, attachListingStatus, countByField, uploadAlbumCover
} from './profile/profileData'
import { loadShelfComparison } from './profile/compareShelves'
import { downloadShelfCsv, applyShelfCsvUpdates } from './profile/shelfCsv'
import { useWishlist } from './profile/useWishlist'
import { useProfileEditor } from './profile/useProfileEditor'
import MobileTabBar from './profile/MobileTabBar'
import MobileProfileHeader from './profile/MobileProfileHeader'
import ProfileIdentity from './profile/ProfileIdentity'
import ProfileEditForm from './profile/ProfileEditForm'
import SellerDashboard from './profile/SellerDashboard'
import ComparisonPanel from './profile/ComparisonPanel'
import NetworkLists from './profile/NetworkLists'
import ShelfStats from './profile/ShelfStats'
import WishlistPanel from './profile/WishlistPanel'
import ShelfHeader from './profile/ShelfHeader'
import ShelfGridView from './profile/ShelfGridView'

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
  const [collectionSearch, setCollectionSearch] = useState('')
  const [showAddAlbum, setShowAddAlbum] = useState(false)
  const [shelfView, setShelfView] = useState('wall')
  const [followingProfiles, setFollowingProfiles] = useState([])
  const [followerProfiles, setFollowerProfiles] = useState([])

  // Mobile-only: which of Shelf / About / Activity is showing. Ignored
  // entirely at lg+ (see MobileTabBar and the `lg:block` overrides
  // below) — the desktop two-column layout always shows everything.
  const [mobileTab, setMobileTab] = useState('shelf')

  const [comparison, setComparison] = useState(null)
  const [comparisonLoading, setComparisonLoading] = useState(true)

  const [sellerStats, setSellerStats] = useState(null)
  const [sellerStatsLoading, setSellerStatsLoading] = useState(true)

  const editor = useProfileEditor({ viewerId: user.id, profile, setProfile })
  const wishlist = useWishlist({ viewerId: user.id, profileUserId: userId, isOwnProfile })

  useEffect(() => {
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

    await loadNetwork()

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

  // Own-profile sidebar leads with this instead of trust signals, since
  // you don't need to build trust with yourself — active listings,
  // pending trade offers, and recent sales are what's actually useful
  // to see at a glance when it's your own shelf.
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

  // Following/Fans — public identity info shown on whichever profile is
  // being viewed, same as Instagram/Facebook/TikTok, not gated behind
  // follow-approval like the album collection is. Scoped to userId (the
  // viewed profile), not user.id (the viewer), so it works correctly on
  // anyone's page, not just your own.
  async function loadNetwork() {
    const { data: followingRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    const followingIdList = (followingRows || []).map((row) => row.following_id)

    if (followingIdList.length > 0) {
      const { data: followingProfilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', followingIdList)

      setFollowingProfiles(followingProfilesData || [])
    } else {
      setFollowingProfiles([])
    }

    const { data: followerRows } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId)

    const followerIdList = (followerRows || []).map((row) => row.follower_id)

    if (followerIdList.length > 0) {
      const { data: followerProfilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', followerIdList)

      setFollowerProfiles(followerProfilesData || [])
    } else {
      setFollowerProfiles([])
    }
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

  const normalizedCollectionSearch = collectionSearch.trim().toLowerCase()
  const filteredAlbums = normalizedCollectionSearch
    ? realAlbums.filter((a) =>
        a.title.toLowerCase().includes(normalizedCollectionSearch) ||
        a.artist.toLowerCase().includes(normalizedCollectionSearch)
      )
    : albums

  // Section visibility on mobile is tab-driven; at lg+ everything is
  // always visible (the trailing `lg:block` wins regardless of tab).
  // Each of these controls CSS display only — nothing below is mounted
  // more than once, so CrateSection/GearSection/etc. never double-fetch.
  const aboutTabClass = `${mobileTab === 'about' ? 'block' : 'hidden'} lg:block`
  const shelfTabClass = `${mobileTab === 'shelf' ? 'block' : 'hidden'} lg:block`
  const activityTabClass = `${mobileTab === 'activity' ? 'block' : 'hidden'} lg:block`

  const profileActions = { isOwnProfile, isFollowing, userId, onFollowChange: handleFollowChange }

  return (
    <>
      <Header />

      <MobileProfileHeader
        profile={profile}
        avatarPreviewUrl={editor.avatarPreviewUrl}
        actions={{
          ...profileActions,
          onEditProfile: () => { editor.setEditingProfile(true); setMobileTab('about') }
        }}
      />

      <MobileTabBar activeTab={mobileTab} onChange={setMobileTab} showActivity={isOwnProfile} />

      {/* overflow-x-hidden here is a safety net — the real fixes are the
          responsive grid below and GearSection's stacking, but this
          keeps one stray fixed-width element from ever taking the whole
          page horizontal again. */}
      <div className="flex flex-col lg:flex-row overflow-x-hidden">
        <aside className={`w-full lg:w-96 flex-shrink-0 lg:border-r border-border px-5 lg:px-6 py-5 lg:py-7 pb-24 lg:pb-7 lg:sticky lg:top-0 lg:self-start lg:overflow-y-auto lg:max-h-screen ${aboutTabClass}`}>
          <ProfileIdentity
            profile={profile}
            avatarPreviewUrl={editor.avatarPreviewUrl}
            isOwnProfile={isOwnProfile}
            userEmail={user.email}
            editingProfile={editor.editingProfile}
            actions={{ ...profileActions, onEditProfile: () => editor.setEditingProfile(true) }}
          />

          {isOwnProfile && editor.editingProfile && <ProfileEditForm editor={editor} />}

          {/* Own profile leads with the seller dashboard instead of trust
              signals — you don't need reviews to trust yourself, but you do
              want your listings, offers and sales at a glance. */}
          {isOwnProfile && <SellerDashboard sellerStatsLoading={sellerStatsLoading} sellerStats={sellerStats} />}

          {/* Reviews lead the sidebar for visitors — reputation is the
              first thing to see, before anything about taste or activity. */}
          <div className="border-t border-border pt-4 mb-4">
            <ReviewsSection sellerId={userId} />
          </div>

          {/* "How compatible are we, and can we trade" follows directly
              after "can I trust this person". */}
          {!isOwnProfile && isFollowing && (
            <ComparisonPanel comparisonLoading={comparisonLoading} comparison={comparison} />
          )}

          <NetworkLists
            followingProfiles={followingProfiles}
            followerProfiles={followerProfiles}
            profile={profile}
            isOwnProfile={isOwnProfile}
          />

          {isFollowing && (
            <div className="border-t border-border pt-4 mb-4">
              <NowSpinningSection
                userId={userId}
                isOwnProfile={isOwnProfile}
                realAlbums={realAlbums}
                albumId={profile?.now_spinning_album_id}
                updatedAt={profile?.now_spinning_updated_at}
                onUpdated={(patch) => setProfile((current) => ({ ...current, ...patch }))}
                onOpenAlbum={setSelectedAlbum}
              />
            </div>
          )}

          {isFollowing && (
            <div className="border-t border-border pt-4 mb-4">
              <RecommendedListenSection
                userId={userId}
                isOwnProfile={isOwnProfile}
                realAlbums={realAlbums}
                onOpenAlbum={setSelectedAlbum}
              />
            </div>
          )}

          {isFollowing && realAlbums.length > 0 && (
            <ShelfStats
              realAlbums={realAlbums}
              topArtist={topArtist}
              topGenre={topGenre}
              topDuplicate={topDuplicate}
              userId={userId}
              isOwnProfile={isOwnProfile}
            />
          )}

          {isFollowing && (
            <div className="border-t border-border pt-4">
              <FavoritesSection
                userId={userId}
                isOwnProfile={isOwnProfile}
                realAlbums={realAlbums}
                onOpenAlbum={setSelectedAlbum}
                compact
              />
            </div>
          )}

          {/* Wishlist lives in the About tab on mobile — it's identity/taste
              content like everything else in this column, and applies the
              same way to both your own profile and someone else's. */}
          {isFollowing && <WishlistPanel isOwnProfile={isOwnProfile} wishlist={wishlist} />}
        </aside>

        <section className="flex-1 min-w-0 px-5 lg:px-10 py-5 lg:py-7 pb-24 lg:pb-7">
          {/* Latest activity strip — Activity tab on mobile, own-profile only. */}
          {isOwnProfile && <ActivityStrip className={activityTabClass} />}

          {/* Mini-Crates — Activity tab on mobile. */}
          {isFollowing && (
            <div className={activityTabClass}>
              <CrateSection
                userId={userId}
                isOwnProfile={isOwnProfile}
                realAlbums={realAlbums}
                onOpenAlbum={setSelectedAlbum}
              />
            </div>
          )}

          {/* My Setup — Activity tab on mobile. */}
          <div className={activityTabClass}>
            <GearSection
              userId={userId}
              isOwnProfile={isOwnProfile}
              profile={profile}
              onUpdated={(patch) => setProfile((current) => ({ ...current, ...patch }))}
            />
          </div>

          {/* Shelf — Shelf tab on mobile, the main reason anyone lands on
              this page. */}
          <div className={shelfTabClass}>
          {isOwnProfile && (
            <WelcomeChecklist
              userId={user.id}
              albumCount={realAlbums.length}
              activeListingsCount={sellerStats?.activeListings}
            />
          )}
          <ShelfHeader
            isOwnProfile={isOwnProfile}
            shelfView={shelfView}
            setShelfView={setShelfView}
            showAddAlbum={showAddAlbum}
            setShowAddAlbum={setShowAddAlbum}
            editingAlbum={editingAlbum}
            handleExportShelf={handleExportShelf}
            setShowScanCrateModal={setShowScanCrateModal}
          />

          {isFollowing && (
            <p className="text-[11px] text-text-faint font-sans mb-3 -mt-1">
              {shelfView === 'wall' && 'Browse spines on a virtual record shelf, grouped by genre.'}
              {shelfView === 'grid' && 'A compact grid of covers — fastest way to scan the whole collection.'}
              {shelfView === 'crates' && 'Flip through genre-grouped stacks with depth and a filmstrip.'}
            </p>
          )}

          {!isFollowing ? (
            <p className="text-text-muted font-sans text-sm mb-10">Follow {displayNameFor(profile)} to see their shelf and marketplace.</p>
          ) : (
            // Shared left column for the Add-album form, Wall view, and Grid
            // view — all three sit in the same 1fr column as a sibling of
            // ShelfDetailPanel, so their margins line up automatically and
            // the reserved detail column can grow as tall as it needs
            // (long tracklists, comments, listing forms) without ever
            // pushing this column's content around. Single column below
            // lg (no side-by-side detail column — the SidePanel overlay
            // below handles album detail there instead); the fixed 380px
            // rail only appears at lg+, via a real breakpoint instead of
            // a hardcoded inline style that never responded to viewport
            // width at all.
            <div className="grid gap-7 mb-12 grid-cols-1 lg:grid-cols-[1fr_380px]">
              <div className="min-w-0">
                {isOwnProfile && (showAddAlbum || editingAlbum) && (
                  <div className="mb-4 pb-4 border-b border-border">
                    <AddAlbumForm
                      onAddAlbum={(album) => { handleAddAlbum(album); setShowAddAlbum(false) }}
                      onUpdateAlbum={handleUpdateAlbum}
                      editingAlbum={editingAlbum}
                      onCancelEdit={() => { setEditingAlbum(null); setShowAddAlbum(false) }}
                      existingTitles={existingTitles}
                      existingArtists={existingArtists}
                      existingLabels={existingLabels}
                      existingPressingCountries={existingPressingCountries}
                    />
                    <div className="flex items-center gap-3">
                      <button onClick={() => setShowImportModal(true)} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded font-sans text-xs cursor-pointer hover:border-accent hover:text-accent">
                        Import from CSV
                      </button>
                      {!editingAlbum && (
                        <button onClick={() => setShowAddAlbum(false)} className="text-xs text-text-muted bg-transparent border-0 cursor-pointer">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {shelfView === 'wall' ? (
                  <ShelfWallView albums={realAlbums} onSelectAlbum={setSelectedAlbum} isOwnProfile={isOwnProfile} />
                ) : shelfView === 'crates' ? (
                  <ShelfCrateGridView albums={realAlbums} onSelectAlbum={setSelectedAlbum} />
                ) : (
                  <ShelfGridView
                    realAlbums={realAlbums}
                    filteredAlbums={filteredAlbums}
                    collectionSearch={collectionSearch}
                    setCollectionSearch={setCollectionSearch}
                    normalizedCollectionSearch={normalizedCollectionSearch}
                    isOwnProfile={isOwnProfile}
                    handleDeleteAlbum={handleDeleteAlbum}
                    setEditingAlbum={setEditingAlbum}
                    setSelectedAlbum={setSelectedAlbum}
                  />
                )}
              </div>

              {/* Reserved detail column — lg+ only. Below lg there's no
                  room for a side-by-side column, so ShelfDetailPanel hides
                  itself via CSS and the SidePanel overlay fallback below
                  handles narrow screens instead. */}
              <ShelfDetailPanel
                album={selectedAlbum}
                albums={realAlbums}
                onClose={() => setSelectedAlbum(null)}
                isOwnAlbum={isOwnProfile}
              />
            </div>
          )}
          </div>

          {/* Everything below here is secondary/supporting content —
              standardized to one consistent max-w-3xl so the page reads
              as a single coherent column instead of jumping between
              different widths section to section. */}
        </section>
      </div>

      {/* Narrow-screen fallback for the Shelf's selected album — at lg+
          this renders nothing (overlayOnly), since ShelfDetailPanel above
          already handles that width in-layout. */}
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
