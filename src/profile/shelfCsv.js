import { supabase } from '../supabaseClient'

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
async function buildExportRows(albums, userId) {
  const { data: listingsData, error: listingsError } = await supabase
    .from('listings')
    .select('album_id, listing_type, price, trade_preference')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (listingsError) {
    console.error('Error fetching listings for export:', listingsError.message)
  }

  const listingByAlbumId = new Map((listingsData || []).map((l) => [l.album_id, l]))

  return albums.map((album) => {
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

export async function downloadShelfCsv(albums, userId) {
  const rows = await buildExportRows(albums, userId)

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
export async function applyShelfCsvUpdates(rows, albums, userId) {
  const { data: existingListings, error: listingsFetchError } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (listingsFetchError) {
    console.error('Error fetching listings for update:', listingsFetchError.message)
  }

  const listingByAlbumId = new Map((existingListings || []).map((l) => [l.album_id, l]))
  const albumById = new Map(albums.map((a) => [String(a.id), a]))

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
      .eq('user_id', userId)

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
        user_id: userId,
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

  return { updated, skipped, listingsChanged }
}
