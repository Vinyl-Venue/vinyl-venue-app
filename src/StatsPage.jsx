import { useState, useEffect } from 'react'
import Header from './Header'
import { supabase } from './supabaseClient'

function countByField(albums, getValue) {
  return albums.reduce((counts, album) => {
    const value = getValue(album) || 'Unknown'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

function getDecade(year) {
  if (!year) return null
  return `${Math.floor(year / 10) * 10}s`
}

function StatsPage() {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlbums()
  }, [])

  async function fetchAlbums() {
    const { data, error } = await supabase.from('albums').select('*')

    if (error) {
      console.error('Error fetching albums for stats:', error.message)
      setLoading(false)
      return
    }

    setAlbums(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <>
        <Header />
        <section className="shelf">
          <p>Loading your stats...</p>
        </section>
      </>
    )
  }

  if (albums.length === 0) {
    return (
      <>
        <Header />
        <section className="shelf">
          <h2>Your stats</h2>
          <p className="wishlist-empty">Add some albums to your shelf to see your stats here.</p>
        </section>
      </>
    )
  }

  const genreCounts = countByField(albums, (album) => album.genre)
  const artistCounts = countByField(albums, (album) => album.artist)
  const decadeCounts = countByField(albums, (album) => getDecade(album.year))
  const countryCounts = countByField(albums, (album) => album.pressing_country)

  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])
  const sortedArtists = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])
  const sortedDecades = Object.entries(decadeCounts).sort((a, b) => b[1] - a[1])
  const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])

  const topArtist = sortedArtists[0]
  const topDecade = sortedDecades.find(([decade]) => decade !== 'Unknown')

  return (
    <>
      <Header />
      <section className="shelf">
        <h2>Your stats</h2>

        <div className="stats-summary">
          <div className="stats-card">
            <span className="stats-number">{albums.length}</span>
            <span className="stats-label">Total albums</span>
          </div>
          {topArtist && (
            <div className="stats-card">
              <span className="stats-number">{topArtist[1]}</span>
              <span className="stats-label">Albums by {topArtist[0]} (most collected)</span>
            </div>
          )}
          {topDecade && (
            <div className="stats-card">
              <span className="stats-number">{topDecade[1]}</span>
              <span className="stats-label">Albums from the {topDecade[0]} (top decade)</span>
            </div>
          )}
        </div>

        <StatsBreakdown title="By genre" data={sortedGenres} total={albums.length} />
        <StatsBreakdown title="By pressing country" data={sortedCountries} total={albums.length} />
        <StatsBreakdown title="Top artists" data={sortedArtists.slice(0, 5)} total={albums.length} />
      </section>
    </>
  )
}

function StatsBreakdown({ title, data, total }) {
  return (
    <div className="stats-breakdown">
      <h3>{title}</h3>
      {data.map(([label, count]) => {
        const percent = Math.round((count / total) * 100)
        return (
          <div key={label} className="stats-bar-row">
            <span className="stats-bar-label">{label}</span>
            <div className="stats-bar-track">
              <div className="stats-bar-fill" style={{ width: `${percent}%` }}></div>
            </div>
            <span className="stats-bar-count">{count} ({percent}%)</span>
          </div>
        )
      })}
    </div>
  )
}

export default StatsPage