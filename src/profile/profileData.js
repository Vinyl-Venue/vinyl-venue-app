import { supabase } from '../supabaseClient'

export function rowToAlbum(row) {
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
export async function attachListingStatus(albumsList, ownerId) {
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

export function albumToRow(album) {
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

export function rowToWishlistItem(row) {
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

export function wishlistItemToRow(item) {
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

export function countByField(albums, getValue) {
  return albums.reduce((counts, album) => {
    const value = getValue(album) || 'Unknown'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

export function compatibilityLabel(score) {
  if (score >= 80) return 'Basically the same record shelf'
  if (score >= 60) return 'Kindred spirits'
  if (score >= 35) return 'Some common ground'
  if (score >= 15) return 'A few surprising overlaps'
  return 'Opposite ends of the crate — worth exploring'
}

// Uploads an image to the album-covers bucket under the user's own folder and
// returns its public URL, or null when there is no file or the upload fails.
export async function uploadAlbumCover(file, userId) {
  if (!file) return null
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage.from('album-covers').upload(fileName, file)
  if (uploadError) {
    console.error('Error uploading image:', uploadError.message)
    return null
  }

  const { data } = supabase.storage.from('album-covers').getPublicUrl(fileName)
  return data.publicUrl
}

