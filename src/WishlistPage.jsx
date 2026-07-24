import { useState, useEffect } from 'react'
import Header from './Header'
import AddAlbumForm from './AddAlbumForm'
import AlbumModal from './AlbumModal'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

function rowToItem(row) {
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

function itemToRow(item) {
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

function WishlistPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [rank, setRank] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [uploadImage, setUploadImage] = useState(null)

  useEffect(() => {
    fetchWishlist()
  }, [])

  async function fetchWishlist() {
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .order('rank', { ascending: true })

    if (error) {
      console.error('Error fetching wishlist:', error.message)
      return
    }

    setItems(data.map(rowToItem))
  }

  const takenRanks = items.map((item) => item.rank)
  const availableRanks = []
  for (let i = 1; i <= 10; i++) {
    if (!takenRanks.includes(i)) {
      availableRanks.push(i)
    }
  }

  async function uploadCoverIfNeeded(file) {
    if (!file) return null

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('album-covers')
      .upload(fileName, file)

    if (uploadError) {
      console.error('Error uploading image:', uploadError.message)
      return null
    }

    const { data } = supabase.storage.from('album-covers').getPublicUrl(fileName)
    return data.publicUrl
  }

  async function handleAdd(newItem) {
    if (rank === '') {
      alert('Please choose a rank before adding to your wishlist.')
      return
    }

    const uploadedUrl = await uploadCoverIfNeeded(newItem.imageFile)

    const itemForDb = {
      ...newItem,
      imageUrl: uploadedUrl || ''
    }
    delete itemForDb.imageFile
    delete itemForDb.existingImageUrl
    delete itemForDb.isInCollection

    const { error } = await supabase.from('wishlist_items').insert({
      ...itemToRow(itemForDb),
      user_id: user.id,
      rank: Number(rank)
    })

    if (error) {
      console.error('Error adding wishlist item:', error.message)
      return
    }

    setRank('')
    fetchWishlist()
  }

  async function handleRemove(removedItem) {
    const { error: deleteError } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', removedItem.id)

    if (deleteError) {
      console.error('Error removing wishlist item:', deleteError.message)
      return
    }

    const itemsToShift = items.filter((item) => item.rank > removedItem.rank)

    for (const item of itemsToShift) {
      await supabase
        .from('wishlist_items')
        .update({ rank: item.rank - 1 })
        .eq('id', item.id)
    }

    fetchWishlist()
  }

  return (
    <>
      <Header />
      <section className="shelf">
        <h2>Your wishlist</h2>
        <p className="wishlist-subtitle">
          Rank the albums you want most — 1 is your most coveted, 10 your least.
        </p>

        <div className="wishlist-rank-picker">
          <label>New item's rank:</label>
          <select value={rank} onChange={(event) => setRank(event.target.value)}>
            <option value="">Choose a rank</option>
            {availableRanks.map((r) => (
              <option key={r} value={r}>#{r}</option>
            ))}
          </select>
        </div>

        <AddAlbumForm
          onAddAlbum={handleAdd}
          onUpdateAlbum={() => {}}
          editingAlbum={null}
          onCancelEdit={() => {}}
          existingTitles={[]}
          existingArtists={[]}
          existingLabels={[]}
          existingPressingCountries={[]}
        />

        <ol className="wishlist-list">
          {items.map((item) => (
            <li key={item.id} className="wishlist-row">
              <span className="wishlist-rank">#{item.rank}</span>
              <img
                src={item.imageUrl || "https://placehold.co/60x60/1c1a15/a8a29a?text=%20"}
                alt={item.title}
                className="wishlist-thumb"
                onClick={() => setSelectedItem(item)}
              />
              <span className="wishlist-info" onClick={() => setSelectedItem(item)}>
                <strong>{item.title}</strong> — {item.artist}
                {item.year ? ` (${item.year})` : ''}
              </span>
              <button
                className="wishlist-remove"
                onClick={() => handleRemove(item)}
              >
                Remove
              </button>
            </li>
          ))}
        </ol>

        {items.length === 0 && (
          <p className="wishlist-empty">Your wishlist is empty — add your first album above.</p>
        )}
      </section>

      {selectedItem && (
        <AlbumModal
          album={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  )
}

export default WishlistPage