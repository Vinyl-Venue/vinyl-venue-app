import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import BandSection from './Bandsection'
import TryNewWidget from './Trynewwidget'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { displayNameFor, avatarPlaceholder } from './utils'

// Pulled out of the profile page entirely, not just relocated within it.
// "da creator" (band matching), "Try something new," and people search
// all answer "who should I follow next" — a question about the viewer,
// not a fact about whoever's profile is being looked at. Everything else
// on a profile (Shelf, Favorites, Setup, Reviews) describes that person;
// these three only ever mattered on your own profile in the first place,
// so they get their own page instead of crowding every profile with
// tools that only apply to yourself.
function DiscoverPage() {
  const { user } = useAuth()
  const [bandName, setBandName] = useState('')
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [followingProfiles, setFollowingProfiles] = useState([])
  const [followerProfiles, setFollowerProfiles] = useState([])

  useEffect(() => {
    loadOwnBandName()
    loadNetwork()
  }, [])

  async function loadOwnBandName() {
    const { data, error } = await supabase
      .from('profiles')
      .select('band_name')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error loading band name:', error.message)
      return
    }

    setBandName(data?.band_name || '')
  }

  async function loadNetwork() {
    const { data: followingRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIdList = (followingRows || []).map((row) => row.following_id)

    if (followingIdList.length > 0) {
      const { data: followingProfilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', followingIdList)

      setFollowingProfiles(followingProfilesData || [])
    } else {
      setFollowingProfiles([])
    }

    const { data: followerRows } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', user.id)

    const followerIdList = (followerRows || []).map((row) => row.follower_id)

    if (followerIdList.length > 0) {
      const { data: followerProfilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', followerIdList)

      setFollowerProfiles(followerProfilesData || [])
    } else {
      setFollowerProfiles([])
    }
  }

  async function handleSearch(event) {
    event.preventDefault()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', `%${searchText}%`)
      .neq('id', user.id)
      .limit(20)

    if (error) {
      console.error('Error searching profiles:', error.message)
    } else {
      setSearchResults(data)
    }
  }

  // Re-loads the whole network (following + fans) after a successful
  // follow rather than patching local state by hand — keeps this in
  // sync with the Following/Fans lists below without maintaining two
  // separate sources of truth for the same relationship.
  async function handleFollow(targetId) {
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId })

    if (error) {
      console.error('Error following user:', error.message)
      return
    }

    loadNetwork()
  }

  const followingIds = new Set(followingProfiles.map((p) => p.id))

  return (
    <div>
      <Header />
      {/* pb-24 clears the fixed mobile bottom tab bar; lg:pb-7 restores
          normal desktop spacing. px-5 on mobile instead of px-10, which
          left almost no breathing room on a phone. */}
      <div className="max-w-3xl mx-auto px-5 lg:px-10 py-5 lg:py-7 pb-24 lg:pb-7">
        <h2 className="font-serif italic text-2xl m-0 mb-1">Discover</h2>
        <p className="text-text-muted font-sans text-sm mb-8">
          Find collectors, bandmates, and new tastes to follow.
        </p>

        <div className="mb-10 flex flex-col gap-4">
          <BandSection bandName={bandName} />
          <TryNewWidget />
        </div>

        <div className="mb-10">
          <div className="bg-text inline-block px-2.5 py-1 mb-3">
            <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Find collectors</span>
          </div>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 mb-4">
            <input
              type="text"
              placeholder="Search by email to find people..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm w-full sm:w-72"
            />
            <button type="submit" className="bg-accent text-bg border-0 px-4 py-2 rounded font-sans text-sm cursor-pointer flex-shrink-0">
              Search
            </button>
          </form>
          {searchResults.length > 0 && (
            <div className="flex flex-col gap-2 max-w-xl mb-6">
              {searchResults.map((result) => {
                const alreadyFollowing = followingIds.has(result.id)
                return (
                  <div key={result.id} className="flex items-center gap-3 bg-surface border border-border rounded px-4 py-3 font-sans text-sm hover:border-accent min-w-0">
                    <Link to={`/profile/${result.id}`} className="flex items-center gap-3 flex-1 min-w-0 no-underline text-text">
                      <img src={result.avatar_url || avatarPlaceholder(32)} alt="" className="w-8 h-8 object-cover rounded-full flex-shrink-0" />
                      <span className="truncate">{displayNameFor(result)}</span>
                    </Link>
                    {alreadyFollowing ? (
                      <span className="text-[10px] uppercase tracking-wider text-text-faint flex-shrink-0">Following</span>
                    ) : (
                      <button
                        onClick={() => handleFollow(result.id)}
                        className="text-[10px] uppercase tracking-wider text-accent bg-transparent border border-border rounded-full px-2.5 py-1 cursor-pointer hover:border-accent flex-shrink-0"
                      >
                        Follow
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {/* Was a fixed grid-cols-2 with no text truncation at all — on a
              phone a long email just spilled straight past the card
              edge instead of wrapping or ellipsizing. Single column
              below sm, and min-w-0 + truncate so long emails always
              ellipsize inside their row instead of overflowing it. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <div className="bg-text inline-block px-2.5 py-1 mb-3">
                <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Following ({followingProfiles.length})</span>
              </div>
              <div className="flex flex-col gap-2">
                {followingProfiles.map((p) => (
                  <Link key={p.id} to={`/profile/${p.id}`} className="flex items-center gap-3 bg-surface border border-border rounded px-4 py-3 font-sans text-sm no-underline text-text hover:border-accent min-w-0">
                    <img src={p.avatar_url || avatarPlaceholder(32)} alt="" className="w-8 h-8 object-cover rounded-full flex-shrink-0" />
                    <span className="truncate">{displayNameFor(p)}</span>
                  </Link>
                ))}
                {followingProfiles.length === 0 && <p className="text-text-muted font-sans text-sm">You're not following anyone yet.</p>}
              </div>
            </div>
            <div>
              <div className="bg-text inline-block px-2.5 py-1 mb-3">
                <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Fans ({followerProfiles.length})</span>
              </div>
              <div className="flex flex-col gap-2">
                {followerProfiles.map((p) => {
                  const alreadyFollowing = followingIds.has(p.id)
                  return (
                    <div key={p.id} className="flex items-center gap-3 bg-surface border border-border rounded px-4 py-3 font-sans text-sm hover:border-accent min-w-0">
                      <Link to={`/profile/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0 no-underline text-text">
                        <img src={p.avatar_url || avatarPlaceholder(32)} alt="" className="w-8 h-8 object-cover rounded-full flex-shrink-0" />
                        <span className="truncate">{displayNameFor(p)}</span>
                      </Link>
                      {!alreadyFollowing && (
                        <button
                          onClick={() => handleFollow(p.id)}
                          className="text-[10px] uppercase tracking-wider text-accent bg-transparent border border-border rounded-full px-2.5 py-1 cursor-pointer hover:border-accent flex-shrink-0 whitespace-nowrap"
                        >
                          Follow back
                        </button>
                      )}
                    </div>
                  )
                })}
                {followerProfiles.length === 0 && <p className="text-text-muted font-sans text-sm">No one is following you yet.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DiscoverPage