import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from './Header'
import RecordCard from './RecordCard'
import AlbumModal from './AlbumModal'
import FollowButton from './FollowButton'
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
import BadgesSection from './BadgesSection'
import AlbumDetailContent from './AlbumDetailContent'
import SidePanel from './SidePanel'
import ScanCrateModal from './ScanCrateModal'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import {
  attachRarity, displayNameFor, avatarPlaceholder,
  jaccardSimilarity, uniqueValues, getDecade, fuzzyMatchKey, matchKey, timeAgo, getCollectionTier
} from './utils'

const PLACEHOLDER_60 = "https://placehold.co/60x60/E4E2DC/767467?text=%20"
const PLACEHOLDER_44 = "https://placehold.co/44x44/E4E2DC/767467?text=%20"

function rowToAlbum(row) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    year: row.year,
    genre: row.genre,
    subgenre: row.subgenre,
    imageUrl: row.image_url,
    isInCollection: row.is_in_collection,
    label: row.label,
    pressingCountry: row.pressing_country,
    matrixNumber: row.matrix_number,
    deadwax: row.deadwax,
    sleeveCondition: row.sleeve_condition,
    mediaCondition: row.media_condition,
    specialTags: row.special_tags || [],
    tracklist: row.tracklist || null,
    credits: row.credits || null
  }
}

// Merges each album's active listing (if any) onto the album object, so
// the shelf can show "For sale $X" / "Trade only" / etc. directly in a
// hover-crate preview without a separate trip to the marketplace.
// Queries raw listing rows directly (rather than going through the
// marketplace's rowToListing/attachHighestBids helpers) using the same
// raw column names this file already relies on elsewhere in
// buildExportRows — auction current-bid price isn't included here, this
// only surfaces the listing's base price/type/trade-preference. Only
// active listings are fetched, so a sold or cancelled listing leaves the
// album looking like a plain collection item.
async function attachListingStatus(albumsList, ownerId) {
  const { data: listingRows, error } = await supabase
    .from('listings')
    .select('id, album_id, listing_type, price, trade_preference, starts_at, ends_at')
    .eq('user_id', ownerId)
    .eq('status', 'active')

  if (error) {
    console.error('Error loading listing status:', error.message)
    return albumsList.map((a) => ({ ...a, listing: null }))
  }

  const listingByAlbumId = new Map(
    (listingRows || []).map((row) => [
      row.album_id,
      {
        id: row.id,
        listingType: row.listing_type,
        price: row.price,
        tradePreference: row.trade_preference,
        startsAt: row.starts_at,
        endsAt: row.ends_at
      }
    ])
  )

  return albumsList.map((album) => ({
    ...album,
    listing: listingByAlbumId.get(album.id) || null
  }))
}

function albumToRow(album) {
  return {
    title: album.title,
    artist: album.artist,
    year: album.year,
    genre: album.genre,
    subgenre: album.subgenre,
    image_url: album.imageUrl,
    is_in_collection: album.isInCollection,
    label: album.label,
    pressing_country: album.pressingCountry,
    matrix_number: album.matrixNumber,
    deadwax: album.deadwax,
    sleeve_condition: album.sleeveCondition,
    media_condition: album.mediaCondition,
    special_tags: album.specialTags,
    tracklist: album.tracklist || null,
    credits: album.credits || null
  }
}

function rowToWishlistItem(row) {
  return {
    id: row.id,
    rank: row.rank,
    title: row.title,
    artist: row.artist,
    year: row.year,
    genre: row.genre,
    subgenre: row.subgenre,
    imageUrl: row.image_url,
    label: row.label,
    pressingCountry: row.pressing_country,
    matrixNumber: row.matrix_number,
    deadwax: row.deadwax,
    sleeveCondition: row.sleeve_condition,
    mediaCondition: row.media_condition,
    specialTags: row.special_tags || []
  }
}

function wishlistItemToRow(item) {
  return {
    title: item.title,
    artist: item.artist,
    year: item.year,
    genre: item.genre,
    subgenre: item.subgenre,
    image_url: item.imageUrl,
    label: item.label,
    pressing_country: item.pressingCountry,
    matrix_number: item.matrixNumber,
    deadwax: item.deadwax,
    sleeve_condition: item.sleeveCondition,
    media_condition: item.mediaCondition,
    special_tags: item.specialTags
  }
}

function countByField(albums, getValue) {
  return albums.reduce((counts, album) => {
    const value = getValue(album) || 'Unknown'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

function compatibilityLabel(score) {
  if (score >= 80) return 'Basically the same record shelf'
  if (score >= 60) return 'Kindred spirits'
  if (score >= 35) return 'Some common ground'
  if (score >= 15) return 'A few surprising overlaps'
  return 'Opposite ends of the crate — worth exploring'
}

function SimilarityRing({ score }) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <svg width="110" height="110" viewBox="0 0 110 110" className="shrink-0">
      <circle cx="55" cy="55" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="8" />
      <circle
        cx="55" cy="55" r={radius} fill="none" stroke="var(--color-accent)" strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 55 55)"
      />
      <text x="55" y="51" textAnchor="middle" fontSize="22" fill="var(--color-text)" fontFamily="Georgia, serif" fontStyle="italic">{score}%</text>
      <text x="55" y="68" textAnchor="middle" fontSize="9.5" fill="var(--color-text-muted)" fontFamily="sans-serif">similar</text>
    </svg>
  )
}

// Mobile-only tab bar. Sits under the compact header on narrow screens;
// entirely absent (via lg:hidden on its wrapper) at lg+, where the
// two-column layout renders everything at once instead.
function MobileTabBar({ activeTab, onChange, showActivity }) {
  const tabs = [
    { key: 'shelf', label: 'Shelf' },
    { key: 'about', label: 'About' },
    ...(showActivity ? [{ key: 'activity', label: 'Activity' }] : [])
  ]

  return (
    <div className="lg:hidden flex border-b border-border font-sans sticky top-0 bg-bg z-10">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 text-[11px] uppercase tracking-wider py-3 border-b-2 bg-transparent cursor-pointer transition-colors ${
            activeTab === tab.key ? 'border-accent text-text' : 'border-transparent text-text-muted'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

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

  const [editingProfile, setEditingProfile] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [bandNameInput, setBandNameInput] = useState('')
  const [bioInput, setBioInput] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [feedEvents, setFeedEvents] = useState([])
  const [visibleFeedCount, setVisibleFeedCount] = useState(15)
  const [feedLoading, setFeedLoading] = useState(true)

  const [comparison, setComparison] = useState(null)
  const [comparisonLoading, setComparisonLoading] = useState(true)

  const [sellerStats, setSellerStats] = useState(null)
  const [sellerStatsLoading, setSellerStatsLoading] = useState(true)

  const [wishlistItems, setWishlistItems] = useState([])
  const [wishlistRank, setWishlistRank] = useState('')
  const [showAddToWishlist, setShowAddToWishlist] = useState(false)
  const [showExtraRanks, setShowExtraRanks] = useState(false)
  const [selectedWishlistItem, setSelectedWishlistItem] = useState(null)
  const [wishlistSearch, setWishlistSearch] = useState('')
  const [myCollectionKeys, setMyCollectionKeys] = useState([])

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
    setDisplayNameInput(profileData?.display_name || '')
    setBandNameInput(profileData?.band_name || '')
    setBioInput(profileData?.bio || '')
    setAvatarPreviewUrl(profileData?.avatar_url || '')

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
      await loadFeed()
      await fetchWishlist()
      await loadSellerStats()
    } else if (allowed) {
      await loadComparison()
      await loadTheirWishlist()
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

  async function loadFeed() {
    setFeedLoading(true)
    setVisibleFeedCount(15)

    const { data: followRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followedIds = (followRows || []).map((row) => row.following_id)

    if (followedIds.length === 0) {
      setFeedEvents([])
      setFeedLoading(false)
      return
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .in('id', followedIds)
    const profileById = new Map((profilesData || []).map((p) => [p.id, p]))

    const { data: albumsData } = await supabase
      .from('albums')
      .select('id, title, artist, image_url, user_id, created_at')
      .in('user_id', followedIds)
      .order('created_at', { ascending: false })
      .limit(60)

    const { data: listingsData } = await supabase
      .from('listings')
      .select('id, title, artist, image_url, user_id, price, created_at')
      .in('user_id', followedIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(60)

    const { data: recommendationsData } = await supabase
      .from('recommendations')
      .select('id, title, artist, image_url, reason, user_id, created_at')
      .in('user_id', followedIds)
      .order('created_at', { ascending: false })
      .limit(60)

    const albumEvents = (albumsData || []).map((a) => ({
      key: `album-${a.id}`,
      type: 'added',
      title: a.title,
      artist: a.artist,
      imageUrl: a.image_url,
      actor: profileById.get(a.user_id),
      createdAt: a.created_at
    }))

    const listingEvents = (listingsData || []).map((l) => ({
      key: `listing-${l.id}`,
      type: 'listed',
      title: l.title,
      artist: l.artist,
      imageUrl: l.image_url,
      price: l.price,
      actor: profileById.get(l.user_id),
      createdAt: l.created_at
    }))

    const recommendationEvents = (recommendationsData || []).map((r) => ({
      key: `recommendation-${r.id}`,
      type: 'recommended',
      title: r.title,
      artist: r.artist,
      imageUrl: r.image_url,
      reason: r.reason,
      actor: profileById.get(r.user_id),
      createdAt: r.created_at
    }))

    const combined = [...albumEvents, ...listingEvents, ...recommendationEvents]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    setFeedEvents(combined)
    setFeedLoading(false)
  }

  async function loadComparison() {
    setComparisonLoading(true)

    const { data: myAlbumsData } = await supabase.from('albums').select('*').eq('user_id', user.id)
    const myAlbums = myAlbumsData || []

    const { data: theirAlbumsData } = await supabase.from('albums').select('*').eq('user_id', userId)
    const theirAlbums = theirAlbumsData || []

    const { data: myWishlistData } = await supabase.from('wishlist_items').select('*').eq('user_id', user.id)
    const myWishlist = myWishlistData || []

    const { data: theirWishlistData } = await supabase.from('wishlist_items').select('*').eq('user_id', userId)
    const theirWishlist = theirWishlistData || []

    const { data: myListingsData } = await supabase
      .from('listings').select('title, artist').eq('user_id', user.id).eq('status', 'active')
    const myListings = myListingsData || []

    const { data: theirListingsData } = await supabase
      .from('listings').select('title, artist').eq('user_id', userId).eq('status', 'active')
    const theirListings = theirListingsData || []

    const myArtists = uniqueValues(myAlbums, (a) => a.artist)
    const theirArtists = uniqueValues(theirAlbums, (a) => a.artist)
    const myGenres = uniqueValues(myAlbums, (a) => a.genre)
    const theirGenres = uniqueValues(theirAlbums, (a) => a.genre)
    const mySubgenres = uniqueValues(myAlbums, (a) => a.subgenre)
    const theirSubgenres = uniqueValues(theirAlbums, (a) => a.subgenre)
    const myDecades = uniqueValues(myAlbums, (a) => getDecade(a.year))
    const theirDecades = uniqueValues(theirAlbums, (a) => getDecade(a.year))
    const myCountries = uniqueValues(myAlbums, (a) => a.pressing_country)
    const theirCountries = uniqueValues(theirAlbums, (a) => a.pressing_country)
    const myLabels = uniqueValues(myAlbums, (a) => a.label)
    const theirLabels = uniqueValues(theirAlbums, (a) => a.label)

    const metrics = [
      { score: jaccardSimilarity(myArtists, theirArtists), weight: 0.30 },
      { score: jaccardSimilarity(myGenres, theirGenres), weight: 0.25 },
      { score: jaccardSimilarity(mySubgenres, theirSubgenres), weight: 0.15 },
      { score: jaccardSimilarity(myLabels, theirLabels), weight: 0.10 },
      { score: jaccardSimilarity(myDecades, theirDecades), weight: 0.10 },
      { score: jaccardSimilarity(myCountries, theirCountries), weight: 0.10 }
    ]
    const overallSimilarity = Math.round(metrics.reduce((sum, m) => sum + m.score * m.weight, 0) * 100)

    const myAlbumKeys = myAlbums.map(fuzzyMatchKey)
    const theirAlbumKeys = theirAlbums.map(fuzzyMatchKey)
    const sharedAlbumCount = theirAlbumKeys.filter((key) => myAlbumKeys.includes(key)).length
    const sharedArtists = myArtists.filter((a) => theirArtists.includes(a))
    const discoveryArtists = theirArtists.filter(
      (a) => !myArtists.includes(a) && theirGenres.some((g) => myGenres.includes(g))
    )

    const myDecadeCounts = countByField(myAlbums, (a) => getDecade(a.year))
    const theirDecadeCounts = countByField(theirAlbums, (a) => getDecade(a.year))
    const sharedDecades = Object.keys(myDecadeCounts)
      .filter((d) => d !== 'Unknown' && theirDecadeCounts[d])
      .map((d) => ({ decade: d, mine: myDecadeCounts[d], theirs: theirDecadeCounts[d] }))
      .sort((a, b) => (b.mine + b.theirs) - (a.mine + a.theirs))
      .slice(0, 3)

    const myListingKeys = myListings.map(fuzzyMatchKey)
    const theirListingKeys = theirListings.map(fuzzyMatchKey)

    const iCanFulfillCount = theirWishlist.filter((item) => myAlbumKeys.includes(fuzzyMatchKey(item))).length
    const theyCanFulfillCount = myWishlist.filter((item) => theirAlbumKeys.includes(fuzzyMatchKey(item))).length

    setComparison({
      overallSimilarity,
      dissimilarity: 100 - overallSimilarity,
      sharedAlbumCount,
      sharedArtists: sharedArtists.slice(0, 6),
      discoveryArtists: discoveryArtists.slice(0, 6),
      sharedDecades,
      iCanFulfillCount,
      theyCanFulfillCount
    })
    setComparisonLoading(false)
  }

  async function loadTheirWishlist() {
    const { data: wishlistData, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', userId)
      .lte('rank', 10)
      .order('rank', { ascending: true })

    if (error) {
      console.error('Error loading their wishlist:', error.message)
    } else {
      setWishlistItems(wishlistData || [])
    }

    const { data: myAlbums } = await supabase.from('albums').select('title, artist').eq('user_id', user.id)
    setMyCollectionKeys((myAlbums || []).map((a) => matchKey(a.title, a.artist)))
  }

  async function fetchWishlist() {
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', user.id)
      .order('rank', { ascending: true })

    if (error) {
      console.error('Error fetching wishlist:', error.message)
      return
    }

    setWishlistItems(data.map(rowToWishlistItem))
  }

  async function uploadCoverIfNeeded(file) {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('album-covers').upload(fileName, file)
    if (uploadError) {
      console.error('Error uploading image:', uploadError.message)
      return null
    }

    const { data } = supabase.storage.from('album-covers').getPublicUrl(fileName)
    return data.publicUrl
  }

  async function handleAddWishlistItem(newItem) {
    if (wishlistRank === '') {
      alert('Please choose a rank before adding to your wishlist.')
      return
    }

    const uploadedUrl = await uploadCoverIfNeeded(newItem.imageFile)

    const itemForDb = { ...newItem, imageUrl: uploadedUrl || newItem.discogsImageUrl || '' }
    delete itemForDb.imageFile
    delete itemForDb.existingImageUrl
    delete itemForDb.discogsImageUrl
    delete itemForDb.tracklist
    delete itemForDb.credits
    delete itemForDb.isInCollection

    const { error } = await supabase.from('wishlist_items').insert({
      ...wishlistItemToRow(itemForDb),
      user_id: user.id,
      rank: Number(wishlistRank)
    })

    if (error) {
      console.error('Error adding wishlist item:', error.message)
      return
    }

    setWishlistRank('')
    fetchWishlist()
  }

  async function handleRemoveWishlistItem(removedItem) {
    const { error: deleteError } = await supabase.from('wishlist_items').delete().eq('id', removedItem.id)

    if (deleteError) {
      console.error('Error removing wishlist item:', deleteError.message)
      return
    }

    const itemsToShift = wishlistItems.filter((item) => item.rank > removedItem.rank)
    for (const item of itemsToShift) {
      await supabase.from('wishlist_items').update({ rank: item.rank - 1 }).eq('id', item.id)
    }

    fetchWishlist()
  }

  async function uploadImage(file) {
    if (!file) return null
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('album-covers').upload(fileName, file)
    if (uploadError) {
      console.error('Error uploading image:', uploadError.message)
      return null
    }

    const { data } = supabase.storage.from('album-covers').getPublicUrl(fileName)
    return data.publicUrl
  }

  async function handleAddAlbum(newAlbum) {
    const uploadedUrl = await uploadImage(newAlbum.imageFile)

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
    const uploadedUrl = await uploadImage(updatedAlbum.imageFile)

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

  const LISTING_STATUS_FOR_TYPE = {
    fixed: 'for_sale',
    trade: 'trade_only',
    fixed_or_trade: 'for_sale_or_trade'
  }

  const EXPORT_HEADERS = [
    'id', 'title', 'artist', 'year', 'genre', 'subgenre', 'label',
    'pressing_country', 'matrix_number', 'deadwax', 'sleeve_condition',
    'media_condition', 'special_tags', 'listing_status', 'price', 'trade_preference'
  ]

  // Active listings joined in by album_id, so this one export doubles as
  // the bulk listing editor — price/status/trade-preference sit right
  // next to the album's own metadata. Tracklist and credits are
  // deliberately left out: nested per-track data doesn't fit a flat
  // spreadsheet row sensibly, and "Find on Discogs" already covers
  // refreshing those per album.
  async function buildExportRows() {
    const { data: listingsData, error: listingsError } = await supabase
      .from('listings')
      .select('album_id, listing_type, price, trade_preference')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (listingsError) {
      console.error('Error fetching listings for export:', listingsError.message)
    }

    const listingByAlbumId = new Map((listingsData || []).map((l) => [l.album_id, l]))

    return realAlbums.map((album) => {
      const listing = listingByAlbumId.get(album.id)
      return [
        album.id,
        album.title || '',
        album.artist || '',
        album.year || '',
        album.genre || '',
        album.subgenre || '',
        album.label || '',
        album.pressingCountry || '',
        album.matrixNumber || '',
        album.deadwax || '',
        album.sleeveCondition || '',
        album.mediaCondition || '',
        (album.specialTags || []).join('; '),
        listing ? (LISTING_STATUS_FOR_TYPE[listing.listing_type] || 'not_listed') : 'not_listed',
        listing ? listing.price : '',
        listing ? (listing.trade_preference || '') : ''
      ]
    })
  }

  // Turns a value into a safe CSV cell: wrapped in quotes (with internal
  // quotes doubled) whenever it contains a comma, quote, or newline —
  // anything else is left bare for readability when opened in a
  // spreadsheet app.
  function csvEscape(value) {
    const str = String(value ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }

  function exportFilenameBase() {
    return `vinyl-venue-shelf-${new Date().toISOString().slice(0, 10)}`
  }

  async function handleExportShelf() {
    const rows = await buildExportRows()

    const csvContent = [EXPORT_HEADERS, ...rows]
      .map((row) => row.map(csvEscape).join(','))
      .join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${exportFilenameBase()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const LISTING_TYPE_FOR_STATUS = {
    for_sale: 'fixed',
    trade_only: 'trade',
    for_sale_or_trade: 'fixed_or_trade'
  }

  // Applies a bulk update from a re-uploaded Export Shelf CSV. Each row
  // is matched back to a real album by its id column, never by title or
  // artist, since those are exactly the fields someone might be
  // correcting. Rows with no id, or an id that doesn't match one of this
  // user's own albums, are skipped and counted rather than treated as new
  // albums to add.
  async function handleUpdateFromCsv(rows) {
    const { data: existingListings, error: listingsFetchError } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (listingsFetchError) {
      console.error('Error fetching listings for update:', listingsFetchError.message)
    }

    const listingByAlbumId = new Map((existingListings || []).map((l) => [l.album_id, l]))
    const albumById = new Map(realAlbums.map((a) => [String(a.id), a]))

    let updated = 0
    let skipped = 0
    let listingsChanged = 0

    for (const row of rows) {
      const numericId = row.id ? Number(row.id) : null
      const existingAlbum = numericId ? albumById.get(String(numericId)) : null

      if (!numericId || !existingAlbum) {
        skipped += 1
        continue
      }

      const specialTags = (row.special_tags || '')
        .split(';')
        .map((t) => t.trim())
        .filter(Boolean)

      const updatedFields = {
        title: row.title || existingAlbum.title,
        artist: row.artist || existingAlbum.artist,
        year: row.year ? Number(row.year) : null,
        genre: row.genre || '',
        subgenre: row.subgenre || '',
        label: row.label || '',
        pressing_country: row.pressing_country || '',
        matrix_number: row.matrix_number || '',
        deadwax: row.deadwax || '',
        sleeve_condition: row.sleeve_condition || '',
        media_condition: row.media_condition || '',
        special_tags: specialTags
      }

      const { error: updateError } = await supabase
        .from('albums')
        .update(updatedFields)
        .eq('id', numericId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error(`Error updating album ${numericId}:`, updateError.message)
        skipped += 1
        continue
      }

      updated += 1

      // Reconcile the listing against listing_status/price/trade_preference.
      const desiredType = LISTING_TYPE_FOR_STATUS[row.listing_status] || null
      const existingListing = listingByAlbumId.get(numericId)

      if (!desiredType && existingListing) {
        // Row says "not_listed" but a listing is currently active — cancel it.
        const { error } = await supabase
          .from('listings')
          .update({ status: 'cancelled' })
          .eq('id', existingListing.id)
        if (!error) listingsChanged += 1
      } else if (desiredType && !existingListing) {
        // Newly marked for sale/trade — create a listing from the row's
        // just-applied values plus the album's existing cover image.
        const { error } = await supabase.from('listings').insert({
          album_id: numericId,
          user_id: user.id,
          price: Number(row.price) || 0,
          listing_type: desiredType,
          trade_preference: row.trade_preference || null,
          status: 'active',
          title: updatedFields.title,
          artist: updatedFields.artist,
          year: updatedFields.year,
          genre: updatedFields.genre,
          image_url: existingAlbum.imageUrl,
          sleeve_condition: updatedFields.sleeve_condition,
          media_condition: updatedFields.media_condition,
          label: updatedFields.label,
          pressing_country: updatedFields.pressing_country
        })
        if (!error) listingsChanged += 1
      } else if (desiredType && existingListing) {
        // Still listed — refresh price/type/trade plus keep the listing's
        // display snapshot in sync with any metadata edits from the sheet.
        const { error } = await supabase
          .from('listings')
          .update({
            listing_type: desiredType,
            price: Number(row.price) || 0,
            trade_preference: row.trade_preference || null,
            title: updatedFields.title,
            artist: updatedFields.artist,
            year: updatedFields.year,
            genre: updatedFields.genre,
            sleeve_condition: updatedFields.sleeve_condition,
            media_condition: updatedFields.media_condition,
            label: updatedFields.label,
            pressing_country: updatedFields.pressing_country
          })
          .eq('id', existingListing.id)
        if (!error) listingsChanged += 1
      }
    }

    fetchAlbums()
    return { updated, skipped, listingsChanged }
  }

  function handleAvatarFileChange(event) {
    const file = event.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSaveProfile() {
    setSavingProfile(true)
    setProfileError('')

    let avatarUrl = profile?.avatar_url || null

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile)

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError.message)
        setProfileError('Could not upload that image — try a different file.')
        setSavingProfile(false)
        return
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      avatarUrl = data.publicUrl
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        display_name: displayNameInput.trim() || null,
        band_name: bandNameInput.trim() || null,
        bio: bioInput.trim() || null,
        avatar_url: avatarUrl
      })
      .eq('id', user.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error updating profile:', error.message)
      setProfileError('Something went wrong saving your profile — try again.')
      setSavingProfile(false)
      return
    }

    setProfile(updated)
    setAvatarFile(null)
    setSavingProfile(false)
    setEditingProfile(false)
  }

  function handleCancelEditProfile() {
    setDisplayNameInput(profile?.display_name || '')
    setBandNameInput(profile?.band_name || '')
    setBioInput(profile?.bio || '')
    setAvatarPreviewUrl(profile?.avatar_url || '')
    setAvatarFile(null)
    setProfileError('')
    setEditingProfile(false)
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

  const takenRanks = wishlistItems.map((item) => item.rank)
  const availableRanks = []
  for (let i = 1; i <= 25; i++) {
    if (!takenRanks.includes(i)) availableRanks.push(i)
  }

  const normalizedWishlistSearch = wishlistSearch.trim().toLowerCase()
  const filteredWishlist = normalizedWishlistSearch
    ? wishlistItems.filter((item) =>
        item.title.toLowerCase().includes(normalizedWishlistSearch) ||
        item.artist.toLowerCase().includes(normalizedWishlistSearch)
      )
    : wishlistItems

  const publicWishlistItems = isOwnProfile ? filteredWishlist.filter((item) => item.rank <= 10) : filteredWishlist
  const extraWishlistItems = isOwnProfile ? filteredWishlist.filter((item) => item.rank > 10) : []

  // Section visibility on mobile is tab-driven; at lg+ everything is
  // always visible (the trailing `lg:block` wins regardless of tab).
  // Each of these controls CSS display only — nothing below is mounted
  // more than once, so CrateSection/GearSection/etc. never double-fetch.
  const aboutTabClass = `${mobileTab === 'about' ? 'block' : 'hidden'} lg:block`
  const shelfTabClass = `${mobileTab === 'shelf' ? 'block' : 'hidden'} lg:block`
  const activityTabClass = `${mobileTab === 'activity' ? 'block' : 'hidden'} lg:block`

  return (
    <>
      <Header />

      {/* Mobile-only compact header — avatar, name, bio, and the same
          identity actions as the desktop sidebar, always visible above
          the tabs regardless of which tab is active. */}
      <div className="lg:hidden px-5 py-5 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <img src={avatarPreviewUrl || avatarPlaceholder(56)} alt="" className="w-14 h-14 object-cover rounded-full flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-serif italic mb-0.5 truncate">{displayNameFor(profile)}</h2>
            {profile.bio && <p className="text-text-muted font-sans text-xs truncate">{profile.bio}</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap font-sans">
          {isOwnProfile && (
            <button
              onClick={() => { setEditingProfile(true); setMobileTab('about') }}
              className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs cursor-pointer hover:border-accent hover:text-accent"
            >
              Edit profile
            </button>
          )}
          {isOwnProfile && (
            <Link to={`/profile/${userId}/marketplace`} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs no-underline hover:border-accent hover:text-accent">
              My marketplace
            </Link>
          )}
          {!isOwnProfile && isFollowing && (
            <Link to={`/profile/${userId}/marketplace`} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs no-underline hover:border-accent hover:text-accent">
              Their marketplace
            </Link>
          )}
          {!isOwnProfile && (
            <Link to={`/messages/${userId}`} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs no-underline hover:border-accent hover:text-accent">
              Message
            </Link>
          )}
          {!isOwnProfile && (
            <FollowButton
              profileUserId={userId}
              onFollowChange={(following) => {
                setIsFollowing(following)
                if (following) loadProfile()
              }}
            />
          )}
        </div>
      </div>

      <MobileTabBar activeTab={mobileTab} onChange={setMobileTab} showActivity={isOwnProfile} />

      {/* overflow-x-hidden here is a safety net — the real fixes are the
          responsive grid below and GearSection's stacking, but this
          keeps one stray fixed-width element from ever taking the whole
          page horizontal again. */}
      <div className="flex flex-col lg:flex-row overflow-x-hidden">
        <aside className={`w-full lg:w-96 flex-shrink-0 lg:border-r border-border px-5 lg:px-6 py-5 lg:py-7 pb-24 lg:pb-7 lg:sticky lg:top-0 lg:self-start lg:overflow-y-auto lg:max-h-screen ${aboutTabClass}`}>
          {/* Identity block — hidden on mobile since the compact header
              above already covers it; the edit-profile form below still
              renders here regardless of breakpoint, since "Edit profile"
              on mobile routes into this tab. */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-3 mb-2">
              <img src={avatarPreviewUrl || avatarPlaceholder(56)} alt="" className="w-14 h-14 object-cover rounded-full flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-xl font-serif italic mb-0.5 truncate">{displayNameFor(profile)}</h2>
                {profile.display_name && <p className="text-text-muted font-sans text-xs truncate">{profile.email}</p>}
              </div>
            </div>
            {profile.bio && !editingProfile && <p className="text-text-muted font-sans text-xs mb-3">{profile.bio}</p>}

            <div className="flex gap-2 mb-4 flex-wrap">
              {isOwnProfile && !editingProfile && (
                <button onClick={() => setEditingProfile(true)} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded font-sans text-xs cursor-pointer hover:border-accent hover:text-accent">
                  Edit profile
                </button>
              )}
              {isOwnProfile && (
                <Link to={`/profile/${userId}/marketplace`} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded font-sans text-xs no-underline hover:border-accent hover:text-accent">
                  My marketplace
                </Link>
              )}
              {!isOwnProfile && isFollowing && (
                <Link to={`/profile/${userId}/marketplace`} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded font-sans text-xs no-underline hover:border-accent hover:text-accent">
                  View their marketplace
                </Link>
              )}
              {!isOwnProfile && (
                <Link to={`/messages/${userId}`} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded font-sans text-xs no-underline hover:border-accent hover:text-accent">
                  Message
                </Link>
              )}
              {!isOwnProfile && (
                <FollowButton
                  profileUserId={userId}
                  onFollowChange={(following) => {
                    setIsFollowing(following)
                    if (following) loadProfile()
                  }}
                />
              )}
            </div>
          </div>

          {isOwnProfile && editingProfile && (
            <div className="mb-4 font-sans bg-surface border border-border rounded p-3">
              <label className="text-xs text-text-muted block mb-1">Display name</label>
              <input type="text" placeholder="How you want to appear to others" value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} disabled={savingProfile} className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-3" />
              <label className="text-xs text-text-muted block mb-1">Band name</label>
              <input type="text" placeholder="e.g. The Deadwax Runouts" value={bandNameInput} onChange={(e) => setBandNameInput(e.target.value)} disabled={savingProfile} className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-3" />
              <label className="text-xs text-text-muted block mb-1">Bio</label>
              <textarea placeholder="A short line about your collection or taste" value={bioInput} onChange={(e) => setBioInput(e.target.value)} rows={2} disabled={savingProfile} className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm resize-none mb-3" />
              <label className="text-xs text-text-muted block mb-1">Profile photo</label>
              <input type="file" accept="image/*" onChange={handleAvatarFileChange} disabled={savingProfile} className="text-text-muted text-xs mb-3" />
              {profileError && <p className="text-xs text-[#c1666b] mb-2">{profileError}</p>}
              <div className="flex gap-2">
                <button onClick={handleSaveProfile} disabled={savingProfile} className="flex-1 bg-accent text-bg font-bold text-xs py-2 rounded cursor-pointer disabled:opacity-60">
                  {savingProfile ? 'Saving...' : 'Save'}
                </button>
                <button onClick={handleCancelEditProfile} disabled={savingProfile} className="flex-1 bg-transparent border border-border text-text-muted text-xs py-2 rounded cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Own profile leads with this instead of trust signals — you
              don't need reviews/comparison to trust yourself, but you
              do want to see your listings/offers/sales at a glance. */}
          {isOwnProfile && (
            <div className="border-t border-border pt-4 mb-4 font-sans">
              <div className="bg-text inline-block px-2.5 py-1 mb-2">
                <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Seller dashboard</span>
              </div>
              {sellerStatsLoading && <p className="text-xs text-text-muted">Loading...</p>}
              {!sellerStatsLoading && sellerStats && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between bg-surface border border-border rounded px-3 py-2">
                    <span className="text-xs text-text-muted">Active listings</span>
                    <span className="font-serif italic text-text">{sellerStats.activeListings}</span>
                  </div>
                  <div className="flex items-center justify-between bg-surface border border-border rounded px-3 py-2">
                    <span className="text-xs text-text-muted">Pending trade offers</span>
                    <span className={`font-serif italic ${sellerStats.pendingOffers > 0 ? 'text-accent' : 'text-text'}`}>
                      {sellerStats.pendingOffers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-surface border border-border rounded px-3 py-2">
                    <span className="text-xs text-text-muted">Sales this month</span>
                    <span className="font-serif italic text-text">{sellerStats.salesThisMonth}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reviews leads the sidebar for visitors — trust/reputation is
              the first thing a visitor should see, before anything about
              taste or activity. On your own profile it sits below the
              seller dashboard instead of leading. */}
          <div className="border-t border-border pt-4 mb-4">
            <ReviewsSection sellerId={userId} />
          </div>

          {/* Comparison moved up to sit right after trust/reviews — on
              someone else's profile, "how compatible are we, and can we
              trade" is exactly the context that should follow "can I
              trust this person," not something buried near the bottom
              of the sidebar. */}
          {!isOwnProfile && isFollowing && (
            <div className="border-t border-border pt-4 mb-4 font-sans">
              <div className="bg-text inline-block px-2.5 py-1 mb-3">
                <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">How your shelves compare</span>
              </div>
              {comparisonLoading && <p className="text-xs text-text-muted">Loading...</p>}
              {!comparisonLoading && comparison && (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <SimilarityRing score={comparison.overallSimilarity} />
                    <p className="text-xs text-text-muted leading-snug">{compatibilityLabel(comparison.overallSimilarity)}</p>
                  </div>
                  <p className="text-xs text-text-muted mb-4">
                    {comparison.sharedAlbumCount} identical album{comparison.sharedAlbumCount === 1 ? '' : 's'} in both shelves
                  </p>
                  {comparison.sharedArtists.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1.5">Shared artists</p>
                      <p className="text-xs text-text leading-relaxed">{comparison.sharedArtists.join(', ')}</p>
                    </div>
                  )}
                  {comparison.sharedDecades.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1.5">By decade</p>
                      {comparison.sharedDecades.map((d) => (
                        <p key={d.decade} className="text-xs text-text-muted mb-1">{d.decade} — you {d.mine}, them {d.theirs}</p>
                      ))}
                    </div>
                  )}
                  {(comparison.iCanFulfillCount > 0 || comparison.theyCanFulfillCount > 0) && (
                    <div className="mb-4">
                      <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1.5">Trade potential</p>
                      {comparison.iCanFulfillCount > 0 && (
                        <p className="text-xs text-text-muted mb-1">You own {comparison.iCanFulfillCount} album{comparison.iCanFulfillCount === 1 ? '' : 's'} on their wishlist</p>
                      )}
                      {comparison.theyCanFulfillCount > 0 && (
                        <p className="text-xs text-text-muted mb-1">They own {comparison.theyCanFulfillCount} album{comparison.theyCanFulfillCount === 1 ? '' : 's'} on yours</p>
                      )}
                    </div>
                  )}
                  {comparison.discoveryArtists.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1.5">Try something new</p>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.discoveryArtists.map((artist) => (
                          <span key={artist} className="bg-surface border border-border rounded-full px-2.5 py-1 text-[11px] text-text">{artist}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="border-t border-border pt-4 mb-4 font-sans">
            <div className="bg-text inline-block px-2.5 py-1 mb-2">
              <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Following ({followingProfiles.length})</span>
            </div>
            <div className="flex flex-col gap-1.5 mb-3">
              {followingProfiles.map((p) => (
                <Link key={p.id} to={`/profile/${p.id}`} className="flex items-center gap-2 bg-surface border border-border rounded px-2.5 py-2 font-sans text-xs no-underline text-text hover:border-accent">
                  <img src={p.avatar_url || avatarPlaceholder(24)} alt="" className="w-6 h-6 object-cover rounded-full flex-shrink-0" />
                  <span className="truncate">{displayNameFor(p)}</span>
                </Link>
              ))}
              {followingProfiles.length === 0 && (
                <p className="text-text-muted text-xs">
                  {isOwnProfile ? "You're not following anyone yet." : `${displayNameFor(profile)} isn't following anyone yet.`}
                </p>
              )}
            </div>
            <div className="bg-text inline-block px-2.5 py-1 mb-2">
              <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Fans ({followerProfiles.length})</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {followerProfiles.map((p) => (
                <Link key={p.id} to={`/profile/${p.id}`} className="flex items-center gap-2 bg-surface border border-border rounded px-2.5 py-2 font-sans text-xs no-underline text-text hover:border-accent">
                  <img src={p.avatar_url || avatarPlaceholder(24)} alt="" className="w-6 h-6 object-cover rounded-full flex-shrink-0" />
                  <span className="truncate">{displayNameFor(p)}</span>
                </Link>
              ))}
              {followerProfiles.length === 0 && (
                <p className="text-text-muted text-xs">
                  {isOwnProfile ? 'No one is following you yet.' : `No one is following ${displayNameFor(profile)} yet.`}
                </p>
              )}
            </div>
          </div>

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
            <div className="border-t border-border pt-4 mb-4 font-sans">
              <div className="bg-text inline-block px-2.5 py-1 mb-2">
                <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">By the numbers</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="bg-surface border border-border rounded px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-serif italic text-lg text-text">{realAlbums.length}</div>
                    {getCollectionTier(realAlbums.length) && (
                      <span
                        title={`${realAlbums.length} albums on your shelf`}
                        className="bg-surface border border-accent rounded-full px-2 py-0.5 flex items-center gap-1 flex-shrink-0"
                      >
                        <span className="text-[10px]">{getCollectionTier(realAlbums.length).icon}</span>
                        <span className="text-[10px] font-bold text-text whitespace-nowrap">{getCollectionTier(realAlbums.length).label}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-text-faint mb-2">Total albums</div>
                  <div className="border-t border-border pt-2">
                    <BadgesSection userId={userId} isOwnProfile={isOwnProfile} realAlbums={realAlbums} inline />
                  </div>
                </div>
                {topArtist && (
                  <div className="bg-surface border border-border rounded px-3 py-2">
                    <div className="font-serif italic text-sm text-text truncate">{topArtist[0]}</div>
                    <div className="text-[10px] uppercase tracking-wider text-text-faint">Most collected artist ({topArtist[1]})</div>
                  </div>
                )}
                {topGenre && (
                  <div className="bg-surface border border-border rounded px-3 py-2">
                    <div className="font-serif italic text-sm text-text">{topGenre[0]}</div>
                    <div className="text-[10px] uppercase tracking-wider text-text-faint">Most collected genre ({topGenre[1]})</div>
                  </div>
                )}
                {topDuplicate && topDuplicate.count > 1 && (
                  <div className="bg-surface border border-border rounded px-3 py-2">
                    <div className="font-serif italic text-sm text-text truncate">{topDuplicate.title}</div>
                    <div className="text-[10px] uppercase tracking-wider text-text-faint">Most collected album ({topDuplicate.count} copies)</div>
                  </div>
                )}
              </div>
            </div>
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
          {isFollowing && (
            <div className="mt-8 max-w-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-text inline-block px-2.5 py-1">
                  <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">
                    {isOwnProfile ? 'My Most Wanted' : 'Their wishlist'}
                  </span>
                </div>
                {isOwnProfile && !showAddToWishlist && (
                  <button
                    onClick={() => setShowAddToWishlist(true)}
                    className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
                  >
                    + Add album
                  </button>
                )}
              </div>
              <div className="bg-surface border border-border rounded p-4 font-sans">
              <p className="text-xs text-text-faint mb-3">
                {isOwnProfile ? 'Ranked by how much you want it — 1 is your most coveted.' : 'Their top-ranked wishlist.'}
              </p>

              {isOwnProfile && showAddToWishlist && (
                <div className="mb-4 pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5 mb-3 text-text-muted text-sm">
                    <label>Rank:</label>
                    <select value={wishlistRank} onChange={(e) => setWishlistRank(e.target.value)} className="bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm">
                      <option value="">Choose a rank</option>
                      {availableRanks.map((r) => <option key={r} value={r}>#{r}</option>)}
                    </select>
                    <button
                      onClick={() => setShowAddToWishlist(false)}
                      className="text-xs text-text-muted bg-transparent border-0 cursor-pointer ml-auto"
                    >
                      Cancel
                    </button>
                  </div>
                  <AddAlbumForm
                    onAddAlbum={(item) => { handleAddWishlistItem(item); setShowAddToWishlist(false) }}
                    onUpdateAlbum={() => {}}
                    editingAlbum={null}
                    onCancelEdit={() => {}}
                    existingTitles={[]}
                    existingArtists={[]}
                    existingLabels={[]}
                    existingPressingCountries={[]}
                  />
                </div>
              )}

              {wishlistItems.length > 3 && (
                <input
                  type="text"
                  placeholder="Search wishlist..."
                  value={wishlistSearch}
                  onChange={(e) => setWishlistSearch(e.target.value)}
                  className="bg-bg border border-border text-text px-2.5 py-1.5 rounded text-xs w-full mb-3"
                />
              )}

              {publicWishlistItems.length === 0 ? (
                <p className="text-text-muted text-sm">
                  {isOwnProfile ? 'Nothing here yet — add your first album above.' : 'Their wishlist is empty.'}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {publicWishlistItems.map((item) => {
                    const imageUrl = item.imageUrl || item.image_url
                    const isMatch = !isOwnProfile && myCollectionKeys.includes(matchKey(item.title, item.artist))
                    return (
                      <div key={item.id} className={`flex items-center gap-2.5 rounded px-2 py-1.5 ${isMatch ? 'bg-accent/10' : ''}`}>
                        <span className="text-accent font-bold text-xs w-5 flex-shrink-0">#{item.rank}</span>
                        <img
                          src={imageUrl || PLACEHOLDER_60}
                          alt={item.title}
                          className="w-8 h-8 object-cover rounded flex-shrink-0 cursor-pointer"
                          onClick={() => isOwnProfile && setSelectedWishlistItem(item)}
                        />
                        <span className="flex-1 text-sm min-w-0 truncate cursor-pointer" onClick={() => isOwnProfile && setSelectedWishlistItem(item)}>
                          <strong>{item.title}</strong> — {item.artist}
                        </span>
                        {isMatch && <span className="text-accent text-[10px] font-bold flex-shrink-0">have it</span>}
                        {isOwnProfile && (
                          <button onClick={() => handleRemoveWishlistItem(item)} className="text-text-faint text-xs bg-transparent border-0 cursor-pointer flex-shrink-0 hover:text-accent">
                            ×
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {isOwnProfile && extraWishlistItems.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => setShowExtraRanks(!showExtraRanks)}
                    className="text-[10px] uppercase tracking-wider text-text-faint bg-transparent border-0 cursor-pointer"
                  >
                    {showExtraRanks ? '− Hide' : '+ Show'} ranks 11–25 ({extraWishlistItems.length})
                  </button>
                  {showExtraRanks && (
                    <div className="flex flex-col gap-1.5 mt-2 opacity-70">
                      {extraWishlistItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2.5 rounded px-2 py-1.5">
                          <span className="text-text-muted font-bold text-xs w-5 flex-shrink-0">#{item.rank}</span>
                          <img src={item.imageUrl || PLACEHOLDER_60} alt={item.title} className="w-8 h-8 object-cover rounded flex-shrink-0 cursor-pointer" onClick={() => setSelectedWishlistItem(item)} />
                          <span className="flex-1 text-sm min-w-0 truncate cursor-pointer" onClick={() => setSelectedWishlistItem(item)}>
                            <strong>{item.title}</strong> — {item.artist}
                          </span>
                          <button onClick={() => handleRemoveWishlistItem(item)} className="text-text-faint text-xs bg-transparent border-0 cursor-pointer flex-shrink-0 hover:text-accent">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          )}
        </aside>

        <section className="flex-1 min-w-0 px-5 lg:px-10 py-5 lg:py-7 pb-24 lg:pb-7">
          {/* Recent Activity — Activity tab on mobile, own-profile only,
              same as before. */}
          {isOwnProfile && (
            <div className={`mb-10 ${activityTabClass}`}>
              <div className="bg-text inline-block px-2.5 py-1 mb-3">
                <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">
                  Recent activity — from people you follow
                </span>
              </div>

              {feedLoading && <p className="text-xs text-text-muted font-sans">Loading...</p>}
              {!feedLoading && feedEvents.length === 0 && (
                <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-4 text-text-faint">
                  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="opacity-50 flex-shrink-0">
                    <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="16" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <div>
                    <p className="font-serif italic text-sm text-text-muted m-0">Nothing yet</p>
                    <p className="font-sans text-xs m-0">Follow some collectors to see their activity here.</p>
                  </div>
                </div>
              )}
              <div
                className="flex flex-col gap-3 max-h-[1200px] overflow-y-auto pr-1"
                onScroll={(e) => {
                  const el = e.currentTarget
                  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40
                  if (nearBottom && visibleFeedCount < feedEvents.length) {
                    setVisibleFeedCount((current) => Math.min(current + 15, feedEvents.length))
                  }
                }}
              >
                {feedEvents.slice(0, visibleFeedCount).map((event) => (
                  <div key={event.key} className="flex items-center gap-3 bg-surface border border-border rounded-lg p-3">
                    <img src={event.imageUrl || PLACEHOLDER_44} alt="" className="w-11 h-11 object-cover rounded flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-text m-0 leading-snug">
                        <strong>{displayNameFor(event.actor)}</strong>{' '}
                        {event.type === 'added' && `added ${event.title}`}
                        {event.type === 'listed' && (
                          <>
                            listed {event.title}
                            <span className="text-accent"> — ${Number(event.price).toFixed(2)}</span>
                          </>
                        )}
                        {event.type === 'recommended' && (
                          <>recommends {event.title ? `${event.title} — ${event.artist}` : event.artist}</>
                        )}
                      </p>
                      {event.type === 'recommended' && event.reason && (
                        <p className="text-xs text-text-muted italic mt-0.5 mb-0">"{event.reason}"</p>
                      )}
                      <p className="text-[10px] text-text-faint font-mono mt-0.5">{timeAgo(event.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
            <h3 className="font-serif italic text-lg m-0">{isOwnProfile ? 'Your shelf' : 'Their shelf'}</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1 bg-surface border border-border rounded-full p-0.5 flex-shrink-0">
                <button
                  onClick={() => setShelfView('wall')}
                  className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
                    shelfView === 'wall' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
                  }`}
                >
                  Wall
                </button>
                <button
                  onClick={() => setShelfView('grid')}
                  className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
                    shelfView === 'grid' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setShelfView('crates')}
                  className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
                    shelfView === 'crates' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
                  }`}
                >
                  Crates
                </button>
              </div>
              {isOwnProfile && !showAddAlbum && !editingAlbum && (
                <div className="flex items-center gap-3 flex-wrap lg:pl-3 lg:border-l border-border">
                  <button
                    onClick={handleExportShelf}
                    className="text-[10px] uppercase tracking-wider text-text-muted bg-transparent border-0 cursor-pointer hover:text-accent whitespace-nowrap"
                  >
                    Export shelf
                  </button>
                  <button
                    onClick={() => setShowScanCrateModal(true)}
                    className="text-[10px] uppercase tracking-wider text-text-muted bg-transparent border-0 cursor-pointer hover:text-accent whitespace-nowrap"
                  >
                    Scan Crate
                  </button>
                  <button
                    onClick={() => setShowAddAlbum(true)}
                    className="bg-accent text-bg text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer whitespace-nowrap"
                  >
                    + Add album
                  </button>
                </div>
              )}
            </div>
          </div>

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
                  <>
                    {realAlbums.length > 0 && (
                      <input
                        type="text"
                        placeholder="Search this shelf by title or artist..."
                        value={collectionSearch}
                        onChange={(e) => setCollectionSearch(e.target.value)}
                        className="bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm w-full md:w-80 mt-2 mb-4"
                      />
                    )}

                    {normalizedCollectionSearch && filteredAlbums.length === 0 && (
                      <p className="text-text-muted font-sans text-sm mb-3">No albums match "{collectionSearch}".</p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                      {filteredAlbums.map((album, i) => (
                        <RecordCard
                          key={album?.id ?? i}
                          title={album?.title}
                          artist={album?.artist}
                          year={album?.year}
                          genre={album?.genre}
                          imageUrl={album?.imageUrl}
                          isInCollection={album?.isInCollection}
                          listing={album?.listing}
                          rarityRank={album?.rarityRank}
                          rarityBreakdown={album?.rarityBreakdown}
                          onDelete={() => isOwnProfile && handleDeleteAlbum(album.id)}
                          onEdit={(e) => { if (isOwnProfile) { e.stopPropagation(); setEditingAlbum(album) } }}
                          onClick={() => setSelectedAlbum(album)}
                        />
                      ))}
                    </div>
                  </>
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
          <AlbumDetailContent key={selectedAlbum.id} album={selectedAlbum} onClose={() => setSelectedAlbum(null)} isOwnAlbum={isOwnProfile} />
        </SidePanel>
      )}

      {selectedWishlistItem && (
        <AlbumModal album={selectedWishlistItem} onClose={() => setSelectedWishlistItem(null)} />
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