import { useState, useEffect } from 'react'
import Header from './Header'
import RecordCard from './RecordCard'
import AddAlbumForm from './AddAlbumForm'
import AlbumModal from './AlbumModal'
import ImportCsvModal from './ImportCsvModal'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

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
    specialTags: row.special_tags || []
  }
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
    special_tags: album.specialTags
  }
}

function DashboardPage() {
  const { user } = useAuth()
  const [collection, setCollection] = useState([])
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const [editingAlbum, setEditingAlbum] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    fetchAlbums()
  }, [])

  async function fetchAlbums() {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching albums:', error.message)
      return
    }

    setCollection(data.map(rowToAlbum))
  }

  async function uploadImage(file) {
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

  async function handleAddAlbum(newAlbum) {
    const uploadedUrl = await uploadImage(newAlbum.imageFile)

    const albumForDb = {
      ...newAlbum,
      imageUrl: uploadedUrl || ''
    }
    delete albumForDb.imageFile
    delete albumForDb.existingImageUrl

    const { data, error } = await supabase
      .from('albums')
      .insert({ ...albumToRow(albumForDb), user_id: user.id })
      .select()

    if (error) {
      console.error('Error adding album:', error.message)
      return
    }

    setCollection([rowToAlbum(data[0]), ...collection])
  }

  async function handleUpdateAlbum(updatedAlbum) {
    const uploadedUrl = await uploadImage(updatedAlbum.imageFile)

    const albumForDb = {
      ...updatedAlbum,
      imageUrl: uploadedUrl || updatedAlbum.existingImageUrl
    }
    delete albumForDb.imageFile
    delete albumForDb.existingImageUrl

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
    setCollection(
      collection.map((album) => (album.id === updatedRow.id ? updatedRow : album))
    )
    setEditingAlbum(null)
  }

  async function handleDeleteAlbum(idToDelete) {
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', idToDelete)

    if (error) {
      console.error('Error deleting album:', error.message)
      return
    }

    setCollection(collection.filter((album) => album.id !== idToDelete))
  }

  async function handleImportAlbums(albumsToImport) {
    const rowsToInsert = albumsToImport.map((album) => ({
      ...albumToRow({ ...album, isInCollection: true, imageUrl: '' }),
      user_id: user.id
    }))

    const { error } = await supabase.from('albums').insert(rowsToInsert)

    if (error) {
      console.error('Error importing albums:', error.message)
      return
    }

    fetchAlbums()
  }

  const existingTitles = [...new Set(collection.map((album) => album.title))]
  const existingArtists = [...new Set(collection.map((album) => album.artist))]
  const existingLabels = [...new Set(collection.map((album) => album.label).filter(Boolean))]
  const existingPressingCountries = [...new Set(collection.map((album) => album.pressingCountry).filter(Boolean))]

  return (
    <>
      <Header />
      <section className="px-10 pb-10">
        <h2 className="text-2xl font-serif mb-2">Recently added to the shelf</h2>
        <AddAlbumForm
          onAddAlbum={handleAddAlbum}
          onUpdateAlbum={handleUpdateAlbum}
          editingAlbum={editingAlbum}
          onCancelEdit={() => setEditingAlbum(null)}
          existingTitles={existingTitles}
          existingArtists={existingArtists}
          existingLabels={existingLabels}
          existingPressingCountries={existingPressingCountries}
        />

        <button
          onClick={() => setShowImportModal(true)}
          className="bg-transparent border border-border text-text-muted px-4 py-2 rounded font-sans text-sm cursor-pointer mb-4 hover:border-accent hover:text-accent"
        >
          Import from CSV
        </button>

        <div className="grid grid-cols-4 gap-3 mt-4">
          {collection.map((album) => (
            <RecordCard
              key={album.id}
              title={album.title}
              artist={album.artist}
              year={album.year}
              genre={album.genre}
              imageUrl={album.imageUrl}
              isInCollection={album.isInCollection}
              onDelete={() => handleDeleteAlbum(album.id)}
              onClick={() => setSelectedAlbum(album)}
              onEdit={(event) => {
                event.stopPropagation()
                setEditingAlbum(album)
              }}
            />
          ))}
        </div>
      </section>

      {selectedAlbum && (
        <AlbumModal
          album={selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
        />
      )}

      {showImportModal && (
        <ImportCsvModal
          onImport={handleImportAlbums}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </>
  )
}

export default DashboardPage