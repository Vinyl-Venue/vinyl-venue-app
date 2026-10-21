import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Header from './Header'
import FollowButton from './FollowButton'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { displayNameFor, avatarPlaceholder } from './utils'

// Full Followers / Following list for a profile. The profile page only shows
// the counts; clicking one lands here, on that list, with a toggle to the
// other. Follow lists are public identity info, same as on the profile.
function ProfileNetworkPage({ kind }) {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [followers, setFollowers] = useState(null)
  const [following, setFollowing] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

      async function peopleVia(selfColumn, otherColumn) {
        const { data: rows } = await supabase.from('follows').select(otherColumn).eq(selfColumn, userId)
        const ids = (rows || []).map((r) => r[otherColumn])
        if (ids.length === 0) return []
        const { data } = await supabase.from('profiles').select('*').in('id', ids)
        return data || []
      }

      const [followerList, followingList] = await Promise.all([
        peopleVia('following_id', 'follower_id'),
        peopleVia('follower_id', 'following_id')
      ])

      if (!cancelled) {
        setProfile(profileData)
        setFollowers(followerList)
        setFollowing(followingList)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  if (followers === null) {
    return (<><Header /><section className="px-10 pb-10"><p>Loading...</p></section></>)
  }

  const isOwn = user.id === userId
  const name = displayNameFor(profile)
  const list = kind === 'followers' ? followers : following
  const needle = search.trim().toLowerCase()
  const shown = needle ? list.filter((p) => displayNameFor(p).toLowerCase().includes(needle)) : list

  const tabClass = (on) =>
    `flex items-center min-h-11 px-[18px] text-sm bg-transparent border-0 border-b-2 -mb-px cursor-pointer ${
      on ? 'text-text font-semibold border-b-accent' : 'text-text-muted border-b-transparent hover:text-text'
    }`

  const emptyText = kind === 'followers'
    ? (isOwn ? 'No one is following you yet.' : `No one is following ${name} yet.`)
    : (isOwn ? "You're not following anyone yet." : `${name} isn't following anyone yet.`)

  return (
    <>
      <Header />
      <div className="max-w-3xl w-full mx-auto px-5 lg:px-10 pt-8 pb-16 flex flex-col gap-6 font-sans">
        <div className="flex flex-col gap-2">
          <Link to={`/profile/${userId}`} className="text-[13px] text-accent no-underline">← Back to profile</Link>
          <h1 className="m-0 font-serif italic font-normal text-4xl leading-tight">{isOwn ? 'Your network' : `${name}'s network`}</h1>
        </div>

        <div className="flex gap-1 border-b border-border">
          <button onClick={() => navigate(`/profile/${userId}/followers`, { replace: true })} className={tabClass(kind === 'followers')}>
            Followers ({followers.length})
          </button>
          <button onClick={() => navigate(`/profile/${userId}/following`, { replace: true })} className={tabClass(kind === 'following')}>
            Following ({following.length})
          </button>
        </div>

        {list.length > 5 && (
          <input
            type="text"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-11 border border-border-strong bg-surface text-sm px-3.5"
          />
        )}

        {list.length === 0 && <p className="text-sm text-text-muted">{emptyText}</p>}
        {list.length > 0 && shown.length === 0 && <p className="text-sm text-text-muted">No one matches "{search}".</p>}

        <div className="flex flex-col gap-2">
          {shown.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-surface border border-border px-4 py-3">
              <Link to={`/profile/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0 no-underline text-text">
                <img src={p.avatar_url || avatarPlaceholder(40, displayNameFor(p))} alt="" className="w-10 h-10 object-cover rounded-full flex-shrink-0" />
                <span className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate">{displayNameFor(p)}</span>
                  {p.bio && <span className="text-xs text-text-muted truncate">{p.bio}</span>}
                </span>
              </Link>
              {p.id !== user.id && <FollowButton profileUserId={p.id} />}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default ProfileNetworkPage
