import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { matchKey } from '../utils'
import { rowToWishlistItem, wishlistItemToRow, uploadAlbumCover } from './profileData'

const MAX_WISHLIST_RANK = 25
const PUBLIC_WISHLIST_RANKS = 10

// Everything the profile's wishlist panel needs: the items, the add/remove
// handlers (own profile only), and the filtered lists the panel renders.
// On someone else's profile it also tracks which of their wishlist records
// the viewer already owns, so those can be flagged "have it".
export function useWishlist({ viewerId, profileUserId, isOwnProfile }) {
  const [wishlistItems, setWishlistItems] = useState([])
  const [wishlistRank, setWishlistRank] = useState('')
  const [showAddToWishlist, setShowAddToWishlist] = useState(false)
  const [showExtraRanks, setShowExtraRanks] = useState(false)
  const [selectedWishlistItem, setSelectedWishlistItem] = useState(null)
  const [wishlistSearch, setWishlistSearch] = useState('')
  const [myCollectionKeys, setMyCollectionKeys] = useState([])

  async function loadOwnWishlist() {
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', viewerId)
      .order('rank', { ascending: true })

    if (error) {
      console.error('Error fetching wishlist:', error.message)
      return
    }

    setWishlistItems(data.map(rowToWishlistItem))
  }

  async function loadTheirWishlist() {
    const { data: wishlistData, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', profileUserId)
      .lte('rank', PUBLIC_WISHLIST_RANKS)
      .order('rank', { ascending: true })

    if (error) {
      console.error('Error loading their wishlist:', error.message)
    } else {
      setWishlistItems(wishlistData || [])
    }

    const { data: myAlbums } = await supabase.from('albums').select('title, artist').eq('user_id', viewerId)
    setMyCollectionKeys((myAlbums || []).map((a) => matchKey(a.title, a.artist)))
  }

  async function addWishlistItem(newItem) {
    if (wishlistRank === '') {
      alert('Please choose a rank before adding to your wishlist.')
      return
    }

    const uploadedUrl = await uploadAlbumCover(newItem.imageFile, viewerId)

    const itemForDb = { ...newItem, imageUrl: uploadedUrl || newItem.discogsImageUrl || '' }
    delete itemForDb.imageFile
    delete itemForDb.existingImageUrl
    delete itemForDb.discogsImageUrl
    delete itemForDb.tracklist
    delete itemForDb.credits
    delete itemForDb.isInCollection

    const { error } = await supabase.from('wishlist_items').insert({
      ...wishlistItemToRow(itemForDb),
      user_id: viewerId,
      rank: Number(wishlistRank)
    })

    if (error) {
      console.error('Error adding wishlist item:', error.message)
      return
    }

    setWishlistRank('')
    loadOwnWishlist()
  }

  // Removing an item closes the gap: everything ranked below it moves up one.
  async function removeWishlistItem(removedItem) {
    const { error: deleteError } = await supabase.from('wishlist_items').delete().eq('id', removedItem.id)

    if (deleteError) {
      console.error('Error removing wishlist item:', deleteError.message)
      return
    }

    const itemsToShift = wishlistItems.filter((item) => item.rank > removedItem.rank)
    for (const item of itemsToShift) {
      await supabase.from('wishlist_items').update({ rank: item.rank - 1 }).eq('id', item.id)
    }

    loadOwnWishlist()
  }

  const takenRanks = wishlistItems.map((item) => item.rank)
  const availableRanks = []
  for (let rank = 1; rank <= MAX_WISHLIST_RANK; rank++) {
    if (!takenRanks.includes(rank)) availableRanks.push(rank)
  }

  const normalizedSearch = wishlistSearch.trim().toLowerCase()
  const filteredWishlist = normalizedSearch
    ? wishlistItems.filter((item) =>
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.artist.toLowerCase().includes(normalizedSearch)
      )
    : wishlistItems

  // Ranks 11-25 are private to the owner; visitors only ever see the top 10.
  const publicWishlistItems = isOwnProfile
    ? filteredWishlist.filter((item) => item.rank <= PUBLIC_WISHLIST_RANKS)
    : filteredWishlist
  const extraWishlistItems = isOwnProfile
    ? filteredWishlist.filter((item) => item.rank > PUBLIC_WISHLIST_RANKS)
    : []

  return {
    wishlistItems,
    wishlistRank, setWishlistRank,
    showAddToWishlist, setShowAddToWishlist,
    showExtraRanks, setShowExtraRanks,
    selectedWishlistItem, setSelectedWishlistItem,
    wishlistSearch, setWishlistSearch,
    myCollectionKeys,
    availableRanks,
    publicWishlistItems,
    extraWishlistItems,
    loadOwnWishlist,
    loadTheirWishlist,
    addWishlistItem,
    removeWishlistItem
  }
}
