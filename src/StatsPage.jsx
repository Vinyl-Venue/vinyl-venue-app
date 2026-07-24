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
        <section className="px-10 pb-10">
          <p>Loading your stats...</p>
        </section>
      </>
    )
  }

  if (albums.length === 0) {
    return (
      <>
        <Header />
        <section className="px-10 pb-10">
          <h2 className="text-2xl font-serif mb-2">Your stats</h2>
          <p className="text-text-muted font-sans text-sm">Add some albums to your shelf to see your stats here.</p>
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
      <section className="px-10 pb-10">
        <h2 className="text-2xl font-serif mb-2">Your stats</h2>

        <div className="flex gap-4 my-5 flex-wrap">
          <div className="bg-surface border border-border rounded-md px-5 py-4 flex flex-col min-w-[160px]">
            <span className="font-serif text-3xl text-accent">{albums.length}</span>
            <span className="font-sans text-xs text-text-muted mt-1">Total albums</span>
          </div>
          {topArtist && (
            <div className="bg-surface border border-border rounded-md px-5 py-4 flex flex-col min-w-[160px]">
              <span className="font-serif text-3xl text-accent">{topArtist[1]}</span>
              <span className="font-sans text-xs text-text-muted mt-1">Albums by {topArtist[0]} (most collected)</span>
            </div>
          )}
          {topDecade && (
            <div className="bg-surface border border-border rounded-md px-5 py-4 flex flex-col min-w-[160px]">
              <span className="font-serif text-3xl text-accent">{topDecade[1]}</span>
              <span className="font-sans text-xs text-text-muted mt-1">Albums from the {topDecade[0]} (top decade)</span>
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
    <div className="mb-7 max-w-[500px]">
      <h3 className="font-serif text-lg mb-3">{title}</h3>
      {data.map(([label, count]) => {
        const percent = Math.round((count / total) * 100)
        return (
          <div key={label} className="flex items-center gap-2.5 mb-2 font-sans text-sm">
            <span className="w-[130px] text-text-muted shrink-0 overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
            <div className="flex-1 h-2 bg-surface border border-border rounded overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${percent}%` }}></div>
            </div>
            <span className="text-text-muted w-[70px] shrink-0 text-right">{count} ({percent}%)</span>
          </div>
        )
      })}
    </div>
  )
}

export default StatsPage