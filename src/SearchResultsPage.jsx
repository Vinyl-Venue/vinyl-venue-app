import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Header from './Header'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { displayNameFor, avatarPlaceholder } from './utils'
import { SkeletonRows } from './Skeleton'

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
  const [shelfRecords, setShelfRecords] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (query) {
      setFilter('all')
      runSearch(query)
    } else {
      setPeople([])
      setListings([])
      setShelfRecords([])
      setLoading(false)
    }
  }, [query])

  // Each word must match somewhere (title OR artist, or name OR band name),
  // so "miles kind" finds Kind of Blue by Miles Davis. Characters that
  // are special inside a PostgREST filter string (commas, parentheses,
  // quotes, % and _) are stripped first: a search like "Sgt. Pepper's
  // (Remastered)" or "AC/DC, Live" would otherwise break the query.
  function searchTerms(q) {
    return q
      .split(/\s+/)
      .map((term) => term.replace(/[%_,()"\\]/g, ''))
      .filter(Boolean)
      .slice(0, 5)
  }

  function matchAllTerms(builder, terms, columns) {
    let result = builder
    for (const term of terms) {
      result = result.or(columns.map((column) => `${column}.ilike.%${term}%`).join(','))
    }
    return result
  }

  async function runSearch(q) {
    setLoading(true)
    const terms = searchTerms(q)

    if (terms.length === 0) {
      setPeople([])
      setListings([])
      setShelfRecords([])
      setLoading(false)
      return
    }

    const [peopleRes, listingsRes, shelfRes] = await Promise.all([
      matchAllTerms(
        supabase.from('profiles').select('*').neq('id', user.id).limit(20),
        terms,
        ['display_name', 'band_name']
      ),
      matchAllTerms(
        supabase
          .from('listings')
          .select('id, title, artist, image_url, price, listing_type, user_id')
          .eq('status', 'active')
          .limit(20),
        terms,
        ['title', 'artist']
      ),
      // Albums are only readable for your own shelf and shelves you
      // follow (RLS), so this never reaches into a stranger's collection.
      matchAllTerms(
        supabase.from('albums').select('id, title, artist, image_url, user_id').limit(30),
        terms,
        ['title', 'artist']
      )
    ])

    if (peopleRes.error) console.error('Error searching people:', peopleRes.error.message)
    if (listingsRes.error) console.error('Error searching listings:', listingsRes.error.message)
    if (shelfRes.error) console.error('Error searching shelves:', shelfRes.error.message)

    const listingRows = listingsRes.data || []
    const shelfRows = shelfRes.data || []

    const profileIds = [...new Set([...listingRows.map((r) => r.user_id), ...shelfRows.map((r) => r.user_id)])]
    const { data: ownerProfiles } = profileIds.length > 0
      ? await supabase.from('profiles').select('id, display_name').in('id', profileIds)
      : { data: [] }
    const ownerById = new Map((ownerProfiles || []).map((p) => [p.id, p]))
    const nameFor = (id) => ownerById.get(id)?.display_name || 'Unknown'

    setPeople(peopleRes.data || [])
    setListings(listingRows.map((row) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      imageUrl: row.image_url,
      price: row.price,
      listingType: row.listing_type,
      sellerId: row.user_id,
      sellerName: nameFor(row.user_id) === 'Unknown' ? 'Unknown seller' : nameFor(row.user_id)
    })))
    setShelfRecords(shelfRows.map((row) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      imageUrl: row.image_url,
      ownerId: row.user_id,
      ownerName: row.user_id === user.id ? 'Your shelf' : nameFor(row.user_id)
    })))
    setLoading(false)
  }

  const hasResults = people.length > 0 || listings.length > 0 || shelfRecords.length > 0
  const tabs = [
    { key: 'all', label: 'All', count: people.length + listings.length + shelfRecords.length },
    { key: 'listings', label: 'Listings', count: listings.length },
    { key: 'shelves', label: 'On shelves', count: shelfRecords.length },
    { key: 'people', label: 'People', count: people.length }
  ]
  const show = (key) => filter === 'all' || filter === key

  return (
    <>
      <Header />
      {/* pb-24 clears the fixed mobile bottom tab bar; lg:pb-7 restores
          normal desktop spacing — same convention as every other page. */}
      <section className="px-5 lg:px-10 py-5 lg:py-7 pb-24 lg:pb-7 max-w-4xl">
        <h2 className="text-2xl font-serif italic mb-1">Search</h2>
        <p className="font-sans text-sm text-text-muted mb-6">
          {query ? <>Results for "<strong>{query}</strong>"</> : 'Enter a search term to find records, people and listings.'}
        </p>

        {!loading && hasResults && (
          <div className="flex gap-2 flex-wrap mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${
                  filter === tab.key
                    ? 'bg-accent text-bg border-accent'
                    : 'bg-surface text-text-muted border-border hover:text-text'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        )}

        {loading && <SkeletonRows count={5} />}

        {!loading && query && !hasResults && (
          <p className="font-sans text-sm text-text-muted">No matches for "{query}".</p>
        )}

        {!loading && show('listings') && listings.length > 0 && (
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

        {!loading && show('shelves') && shelfRecords.length > 0 && (
          <div className="mb-8">
            <div className="bg-text inline-block px-2.5 py-1 mb-3">
              <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">On shelves you can see</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {shelfRecords.map((item) => (
                <Link
                  key={item.id}
                  to={`/profile/${item.ownerId}`}
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
                    <p className="m-0 text-[10px] text-text-faint truncate mt-1">{item.ownerName}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && show('people') && people.length > 0 && (
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
                  <img src={person.avatar_url || avatarPlaceholder(32, displayNameFor(person))} alt="" className="w-8 h-8 object-cover rounded-full flex-shrink-0" />
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