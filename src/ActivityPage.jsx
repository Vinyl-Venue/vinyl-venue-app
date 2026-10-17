import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import { useAuth } from './AuthContext'
import { useActivityFeed, describeGroup, FILTERS } from './activityFeed'
import ActivityCard from './ActivityCard'
import { displayNameFor, avatarPlaceholder, timeAgo } from './utils'
import { SkeletonRows } from './Skeleton'

const PAGE_SIZE = 25
const PLACEHOLDER = 'https://placehold.co/80x80/E4E2DC/767467?text=%20'

function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate())
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86400000)
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return 'Earlier this week'
  return 'Earlier'
}

// Everything the people you follow have done, filterable and grouped by
// day. The profile only shows a short strip; this is the "see it all"
// view so nothing is hidden, just not forced on you.
function ActivityPage() {
  const { user } = useAuth()
  const { loading, groups, followingCount } = useActivityFeed(user.id)
  const [filter, setFilter] = useState('all')
  const [visible, setVisible] = useState(PAGE_SIZE)

  const filtered = useMemo(
    () => (filter === 'all' ? groups : groups.filter((g) => g.kind === filter)),
    [groups, filter]
  )

  const sections = useMemo(() => {
    const out = []
    for (const group of filtered.slice(0, visible)) {
      const label = dayLabel(group.createdAt)
      const last = out[out.length - 1]
      if (last && last.label === label) last.groups.push(group)
      else out.push({ label, groups: [group] })
    }
    return out
  }, [filtered, visible])

  const endingSoon = useMemo(
    () =>
      groups
        .filter((g) => g.kind === 'auction' && g.items[0].endsAt)
        .sort((a, b) => new Date(a.items[0].endsAt) - new Date(b.items[0].endsAt))
        .slice(0, 3),
    [groups]
  )

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />
      <main className="max-w-[1100px] mx-auto px-5 lg:px-10 py-6 pb-24 lg:pb-10">
        <Link to={`/profile/${user.id}`} className="text-xs text-text-muted no-underline hover:underline">
          ← Back to profile
        </Link>
        <h1 className="font-serif italic font-normal text-3xl mt-2 mb-1">Activity</h1>
        <p className="text-xs text-text-faint font-sans mt-0 mb-5">
          Everything from the {followingCount} collector{followingCount === 1 ? '' : 's'} you follow.{' '}
          <Link to="/digest" className="text-accent no-underline hover:underline">Prefer highlights? Read your Crate Digest →</Link>
        </p>

        <div className="flex gap-2 flex-wrap mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key)
                setVisible(PAGE_SIZE)
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${
                filter === f.key
                  ? 'bg-accent text-bg border-accent'
                  : 'bg-surface text-text-muted border-border hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && <SkeletonRows count={6} />}

        {!loading && filtered.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-6 text-center">
            <p className="font-serif italic text-text-muted m-0 mb-1">Nothing here yet</p>
            <p className="text-xs text-text-faint m-0">
              {followingCount === 0
                ? 'Follow some collectors to see their activity.'
                : filter === 'all'
                ? 'The collectors you follow haven’t shared anything new lately.'
                : 'No activity of this kind right now. Try another filter.'}
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 min-w-0 w-full">
            {sections.map((section) => (
              <section key={section.label} className="mb-7">
                <div className="bg-text inline-block px-2.5 py-1 mb-3">
                  <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">
                    {section.label}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {section.groups.map((group) => (
                    <ActivityRow key={group.key} group={group} />
                  ))}
                </div>
              </section>
            ))}

            {filtered.length > visible && (
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="px-4 py-2 rounded-full text-xs font-medium border border-border bg-surface text-text cursor-pointer hover:bg-bg"
              >
                Load more
              </button>
            )}
          </div>

          {endingSoon.length > 0 && (
            <aside className="w-full lg:w-[260px] flex-none">
              <div className="bg-text inline-block px-2.5 py-1 mb-3">
                <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Ending soon</span>
              </div>
              <div className="flex flex-col gap-3">
                {endingSoon.map((group) => (
                  <ActivityCard key={group.key} group={group} />
                ))}
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}

function ActivityRow({ group }) {
  const { headline, sub, cta, to } = describeGroup(group)
  const covers = group.items.slice(0, 5)
  const extra = group.items.length - covers.length

  return (
    <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-3">
      <div className="flex gap-1 flex-shrink-0">
        {covers.map((item) => (
          <img key={item.key} src={item.imageUrl || PLACEHOLDER} alt="" className="w-11 h-11 object-cover rounded-sm" />
        ))}
        {extra > 0 && <span className="self-center font-mono text-[11px] text-text-muted ml-1">+{extra}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text m-0 leading-snug">
          <img
            src={group.actor?.avatar_url || avatarPlaceholder(18, displayNameFor(group.actor))}
            alt=""
            className="w-[18px] h-[18px] rounded-full object-cover inline-block align-text-bottom mr-1.5"
          />
          <Link to={`/profile/${group.actorId}`} className="font-bold text-text no-underline hover:underline">
            {displayNameFor(group.actor)}
          </Link>{' '}
          {group.kind === 'auction' ? `is auctioning ${headline}` : headline}
        </p>
        {sub && <p className="text-xs text-text-muted m-0 mt-0.5">{sub}</p>}
        <p className="text-[10px] text-text-faint font-mono m-0 mt-0.5">{timeAgo(group.createdAt)}</p>
      </div>
      <Link to={to} className="text-xs font-medium text-accent no-underline hover:underline whitespace-nowrap">
        {cta} →
      </Link>
    </div>
  )
}

export default ActivityPage