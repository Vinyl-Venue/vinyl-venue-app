import { supabase } from '../supabaseClient'
import { jaccardSimilarity, uniqueValues, getDecade, fuzzyMatchKey } from '../utils'
import { countByField } from './profileData'

// Compares the viewer's shelf and wishlist with another collector's and
// returns the numbers shown in the "How your shelves compare" panel.
export async function loadShelfComparison(viewerId, profileId) {
  const [myAlbumsRes, theirAlbumsRes, myWishlistRes, theirWishlistRes] = await Promise.all([
    supabase.from('albums').select('*').eq('user_id', viewerId),
    supabase.from('albums').select('*').eq('user_id', profileId),
    supabase.from('wishlist_items').select('*').eq('user_id', viewerId),
    supabase.from('wishlist_items').select('*').eq('user_id', profileId)
  ])
  const myAlbums = myAlbumsRes.data || []
  const theirAlbums = theirAlbumsRes.data || []
  const myWishlist = myWishlistRes.data || []
  const theirWishlist = theirWishlistRes.data || []

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

  const iCanFulfillCount = theirWishlist.filter((item) => myAlbumKeys.includes(fuzzyMatchKey(item))).length
  const theyCanFulfillCount = myWishlist.filter((item) => theirAlbumKeys.includes(fuzzyMatchKey(item))).length

  return {
    overallSimilarity,
    dissimilarity: 100 - overallSimilarity,
    sharedAlbumCount,
    sharedArtists: sharedArtists.slice(0, 6),
    discoveryArtists: discoveryArtists.slice(0, 6),
    sharedDecades,
    iCanFulfillCount,
    theyCanFulfillCount
  }
}
