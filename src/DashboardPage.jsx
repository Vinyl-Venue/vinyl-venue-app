import { useState, useEffect } from 'react'
import Header from './Header'
import RecordCard from './RecordCard'
import AddAlbumForm from './AddAlbumForm'
import AlbumModal from './AlbumModal'

const defaultCollection = [
  {
    id: 1,
    title: "Kind of Blue",
    artist: "Miles Davis",
    year: 1959,
    genre: "Jazz",
    isInCollection: true,
    imageUrl: "https://placehold.co/400x400/2a271f/f2efe9?text=Kind+of+Blue",
    label: "",
    pressingCountry: "",
    matrixNumber: "",
    deadwax: ""
  },
  {
    id: 2,
    title: "Abbey Road",
    artist: "The Beatles",
    year: 1969,
    genre: "Rock",
    isInCollection: true,
    imageUrl: "https://placehold.co/400x400/2a271f/f2efe9?text=Abbey+Road",
    label: "",
    pressingCountry: "",
    matrixNumber: "",
    deadwax: ""
  },
  {
    id: 3,
    title: "Blue Train",
    artist: "John Coltrane",
    year: 1957,
    genre: "Jazz",
    isInCollection: true,
    imageUrl: "https://placehold.co/400x400/2a271f/f2efe9?text=Blue+Train",
    label: "",
    pressingCountry: "",
    matrixNumber: "",
    deadwax: ""
  },
  {
    id: 4,
    title: "A Love Supreme",
    artist: "John Coltrane",
    year: 1965,
    genre: "Jazz",
    isInCollection: false,
    imageUrl: "https://placehold.co/400x400/2a271f/f2efe9?text=A+Love+Supreme",
    label: "",
    pressingCountry: "",
    matrixNumber: "",
    deadwax: ""
  }
]

function DashboardPage() {
  const [collection, setCollection] = useState(() => {
    const saved = localStorage.getItem('vinylVenueCollection')
    return saved ? JSON.parse(saved) : defaultCollection
  })

  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const [editingAlbum, setEditingAlbum] = useState(null)

  useEffect(() => {
    localStorage.setItem('vinylVenueCollection', JSON.stringify(collection))
  }, [collection])

  function handleAddAlbum(newAlbum) {
    const albumWithId = { ...newAlbum, id: crypto.randomUUID() }
    setCollection([...collection, albumWithId])
  }

  function handleUpdateAlbum(updatedAlbum) {
    setCollection(
      collection.map((album) =>
        album.id === updatedAlbum.id ? updatedAlbum : album
      )
    )
    setEditingAlbum(null)
  }

  function handleDeleteAlbum(idToDelete) {
    setCollection(collection.filter((album) => album.id !== idToDelete))
  }

  const existingTitles = [...new Set(collection.map((album) => album.title))]
  const existingArtists = [...new Set(collection.map((album) => album.artist))]
  const existingGenres = [...new Set(collection.map((album) => album.genre).filter(Boolean))]
  const existingLabels = [...new Set(collection.map((album) => album.label).filter(Boolean))]
  const existingPressingCountries = [...new Set(collection.map((album) => album.pressingCountry).filter(Boolean))]

  return (
    <>
      <Header />
      <section className="shelf">
        <h2>Recently added to the shelf</h2>
        <AddAlbumForm
          onAddAlbum={handleAddAlbum}
          onUpdateAlbum={handleUpdateAlbum}
          editingAlbum={editingAlbum}
          onCancelEdit={() => setEditingAlbum(null)}
          existingTitles={existingTitles}
          existingArtists={existingArtists}
          existingGenres={existingGenres}
          existingLabels={existingLabels}
          existingPressingCountries={existingPressingCountries}
        />
        <div className="record-grid">
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
    </>
  )
}

export default DashboardPage