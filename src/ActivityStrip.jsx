import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ActivityCard from './ActivityCard'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { useActivityFeed, fetchDigestContext, buildDigest, digestDays, digestIsDue } from './activityFeed'
import { SkeletonStrip } from './Skeleton'

const MAX_CARDS = 6

// Compact horizontal strip of the latest grouped activity from people
// you follow. Replaces the tall one-card-per-event list that pushed the
// rest of the profile off screen; the full list lives on /activity.
function ActivityStrip({ className = '' }) {
  const { user } = useAuth()
  const { loading, events, groups, followingCount } = useActivityFeed(user.id)

  const cards = groups.slice(0, MAX_CARDS)

  // "Digest is ready" banner: shown when the user's chosen period has
  // elapsed since they last opened the digest and there's something in it.
  const [banner, setBanner] = useState(null)
  useEffect(() => {
    if (loading) return
    let cancelled = false
    async function check() {
      const { data: prefs } = await supabase
        .from('profiles')
        .select('digest_frequency, digest_last_seen_at')
        .eq('id', user.id)
        .single()
      if (!prefs || !digestIsDue(prefs.digest_frequency, prefs.digest_last_seen_at)) return
      const context = await fetchDigestContext(user.id)
      const digest = buildDigest(events, context, digestDays(prefs.digest_frequency))
      if (!cancelled && digest.highlights > 0) setBanner({ count: digest.highlights, frequency: prefs.digest_frequency })
    }
    check()
    return () => {
      cancelled = true
    }
  }, [loading, events, user.id])

  return (
    <div className={`mb-8 ${className}`}>
      {banner && (
        <Link
          to="/digest"
          className="flex items-center justify-between gap-3 flex-wrap bg-surface border border-border rounded-lg px-4 py-3 mb-5 no-underline text-text"
        >
          <span className="flex items-center gap-3 text-sm">
            <span className="font-mono text-[10px] tracking-wider uppercase font-bold bg-accent text-bg px-2 py-0.5">New</span>
            <span>
              <strong>Your {banner.frequency === 'daily' ? 'daily' : banner.frequency === 'weekly' ? 'weekly' : banner.frequency === 'biweekly' ? 'bi-weekly' : 'monthly'} Crate Digest is ready</strong>{' '}
              <span className="text-text-muted">&mdash; {banner.count} highlight{banner.count === 1 ? '' : 's'} from the people you follow</span>
            </span>
          </span>
          <span className="text-[13px] font-medium text-accent">Read digest →</span>
        </Link>
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="bg-text inline-block px-2.5 py-1">
          <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">
            Latest from your collectors
          </span>
        </div>
        {groups.length > 0 && (
          <Link to="/activity" className="text-[13px] font-medium text-accent no-underline hover:underline">
            See all activity →
          </Link>
        )}
      </div>

      {loading && <SkeletonStrip />}

      {!loading && cards.length === 0 && (
        <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-4 text-text-faint">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="opacity-50 flex-shrink-0">
            <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div>
            <p className="font-serif italic text-sm text-text-muted m-0">Nothing yet</p>
            <p className="font-sans text-xs m-0">
              {followingCount === 0
                ? 'Follow some collectors to see their activity here.'
                : 'The collectors you follow haven’t shared anything new lately.'}
            </p>
          </div>
        </div>
      )}

      {!loading && cards.length > 0 && (
        <div className="flex gap-3.5 overflow-x-auto pb-1.5">
          {cards.map((group) => (
            <ActivityCard key={group.key} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}

export default ActivityStrip