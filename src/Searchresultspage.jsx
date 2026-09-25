import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Header from './Header'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { displayNameFor, avatarPlaceholder } from './utils'

// Global search only covers people and active listings — not personal
// shelves. Someone's private collection isn't something a stranger
// should be able to search into; the marketplace (active listings) is
// the intentionally public/discoverable surface, same boundary the rest
// of the app already draws around follow-gating.
function SearchResultsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') || '').trim()
  const [people, setPeople] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (query) {
      runSearch(query)
    } else {
      setPeople([])
      setListings([])
      setLoading(false)
    }
  }, [query])

  async function runSearch(q) {
    setLoading(true)

    const { data: peopleData, error: peopleError } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq('id', user.id)
      .limit(20)

    if (peopleError) {
      console.error('Error searching people:', peopleError.message)
    }

    const { data: listingRows, error: listingError } = await supabase
      .from('listings')
      .select('id, title, artist, image_url, price, listing_type, user_id')
      .eq('status', 'active')
      .or(`title.ilike.%${q}%,artist.ilike.%${q}%`)
      .limit(20)

    if (listingError) {
      console.error('Error searching listings:', listingError.message)
    }

    const sellerIds = [...new Set((listingRows || []).map((row) => row.user_id))]
    const { data: sellerProfiles } = sellerIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, email').in('id', sellerIds)
      : { data: [] }
    const sellerById = new Map((sellerProfiles || []).map((p) => [p.id, p]))

    setPeople(peopleData || [])
    setListings((listingRows || []).map((row) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      imageUrl: row.image_url,
      price: row.price,
      listingType: row.listing_type,
      sellerId: row.user_id,
      sellerName: sellerById.get(row.user_id)?.display_name || sellerById.get(row.user_id)?.email || 'Unknown seller'
    })))
    setLoading(false)
  }

  const hasResults = people.length > 0 || listings.length > 0

  return (
    <>
      <Header />
      {/* pb-24 clears the fixed mobile bottom tab bar; lg:pb-7 restores
          normal desktop spacing — same convention as every other page. */}
      <section className="px-5 lg:px-10 py-5 lg:py-7 pb-24 lg:pb-7 max-w-4xl">
        <h2 className="text-2xl font-serif italic mb-1">Search</h2>
        <p className="font-sans text-sm text-text-muted mb-6">
          {query ? <>Results for "<strong>{query}</strong>"</> : 'Enter a search term to find people and listings.'}
        </p>

        {loading && <p className="font-sans text-sm text-text-muted">Searching...</p>}

        {!loading && query && !hasResults && (
          <p className="font-sans text-sm text-text-muted">No matches for "{query}".</p>
        )}

        {!loading && listings.length > 0 && (
          <div className="mb-8">
            <div className="bg-text inline-block px-2.5 py-1 mb-3">
              <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Listings</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {listings.map((item) => (
                <Link
                  key={item.id}
                  to={`/profile/${item.sellerId}/marketplace?listing=${item.id}`}
                  className="bg-surface border border-border rounded overflow-hidden no-underline hover:border-accent transition-colors block"
                >
                  <img
                    src={item.imageUrl || "https://placehold.co/200x200/E4E2DC/767467?text=%20"}
                    alt={item.title}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-2 font-sans">
                    <p className="m-0 text-xs font-bold text-text truncate">{item.title}</p>
                    <p className="m-0 text-[11px] text-text-muted truncate">{item.artist}</p>
                    {item.price != null && item.listingType !== 'trade' && (
                      <p className="m-0 text-xs text-accent font-mono mt-1">${Number(item.price).toFixed(2)}</p>
                    )}
                    <p className="m-0 text-[10px] text-text-faint truncate mt-1">{item.sellerName}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && people.length > 0 && (
          <div className="mb-8">
            <div className="bg-text inline-block px-2.5 py-1 mb-3">
              <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">People</span>
            </div>
            <div className="flex flex-col gap-2 max-w-xl">
              {people.map((person) => (
                <Link
                  key={person.id}
                  to={`/profile/${person.id}`}
                  className="flex items-center gap-3 bg-surface border border-border rounded px-4 py-3 font-sans text-sm no-underline text-text hover:border-accent min-w-0"
                >
                  <img src={person.avatar_url || avatarPlaceholder(32)} alt="" className="w-8 h-8 object-cover rounded-full flex-shrink-0" />
                  <span className="truncate">{displayNameFor(person)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  )
}

export default SearchResultsPage