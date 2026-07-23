import './App.css'
import Header from './Header'
import RecordCard from './RecordCard'

const collection = [
  {
    title: "Kind of Blue",
    artist: "Miles Davis",
    year: 1959,
    genre: "Jazz",
    isInCollection: true,
    imageUrl: "https://placehold.co/400x400/2a271f/f2efe9?text=Kind+of+Blue"
  },
  {
    title: "Abbey Road",
    artist: "The Beatles",
    year: 1969,
    genre: "Rock",
    isInCollection: true,
    imageUrl: "https://placehold.co/400x400/2a271f/f2efe9?text=Abbey+Road"
  },
  {
    title: "Blue Train",
    artist: "John Coltrane",
    year: 1957,
    genre: "Jazz",
    isInCollection: true,
    imageUrl: "https://placehold.co/400x400/2a271f/f2efe9?text=Blue+Train"
  },
  {
    title: "A Love Supreme",
    artist: "John Coltrane",
    year: 1965,
    genre: "Jazz",
    isInCollection: false,
    imageUrl: "https://placehold.co/400x400/2a271f/f2efe9?text=A+Love+Supreme"
  }
]

function App() {
  return (
    <>
      <Header />
      <section className="shelf">
        <h2>Recently added to the shelf</h2>
        <div className="record-grid">
          {collection.map((album) => (
            <RecordCard
              key={album.title}
              title={album.title}
              artist={album.artist}
              imageUrl={album.imageUrl}
              isInCollection={album.isInCollection}
            />
          ))}
        </div>
      </section>
    </>
  )
}

export default App