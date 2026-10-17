import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import AuctionCountdown from './AuctionCountdown'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import {
  useActivityFeed,
  fetchDigestContext,
  buildDigest,
  digestDays,
  DIGEST_OPTIONS
} from './activityFeed'
import { displayNameFor, timeAgo } from './utils'
import { SkeletonRows } from './Skeleton'

const PLACEHOLDER = 'https://placehold.co/80x80/E4E2DC/767467?text=%20'

function DigestPage() {
  const { user } = useAuth()
  const { loading, events } = useActivityFeed(user.id)
  const [frequency, setFrequency] = useState('weekly')
  const [context, setContext] = useState(null)
  const [prefsLoaded, setPrefsLoaded] = useState(false)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('profiles').select('digest_frequency').eq('id', user.id).single()
      if (data?.digest_frequency) setFrequency(data.digest_frequency)
      setContext(await fetchDigestContext(user.id))
      setPrefsLoaded(true)
      // Opening the digest counts as reading it, so the profile banner
      // goes away until the next period is due.
      await supabase.from('profiles').update({ digest_last_seen_at: new Date().toISOString() }).eq('id', user.id)
    }
    init()
  }, [user.id])

  async function changeFrequency(next) {
    setFrequency(next)
    await supabase.from('profiles').update({ digest_frequency: next }).eq('id', user.id)
  }

  const days = digestDays(frequency)
  const digest = useMemo(() => (context ? buildDigest(events, context, days) : null), [events, context, days])
  const periodLabel = DIGEST_OPTIONS.find((o) => o.key === frequency)?.label.toLowerCase()

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />
      <main className="max-w-[760px] mx-auto px-5 lg:px-10 py-6 pb-24 lg:pb-10">
        <div className="flex gap-4 flex-wrap">
          <Link to="/activity" className="text-xs text-text-muted no-underline hover:underline">
            ← Back to activity
          </Link>
          <Link to={`/profile/${user.id}`} className="text-xs text-text-muted no-underline hover:underline">
            Back to profile
          </Link>
        </div>
        <h1 className="font-serif italic font-normal text-3xl mt-2 mb-1">Your Crate Digest</h1>
        <p className="text-xs text-text-faint font-sans mt-0 mb-5">
          The highlights from the collectors you follow, so you don&rsquo;t have to scroll for them.
        </p>

        <div className="flex gap-2 flex-wrap mb-2">
          {DIGEST_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => changeFrequency(o.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${
                frequency === o.key
                  ? 'bg-accent text-bg border-accent'
                  : 'bg-surface text-text-muted border-border hover:text-text'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-text-faint font-sans mt-0 mb-6">
          {frequency === 'off'
            ? 'Digest reminders are off. You can still open this page any time (showing the last 7 days).'
            : `You'll see a reminder on your profile when a new ${periodLabel} digest is ready.`}
        </p>

        {(loading || !prefsLoaded) && <SkeletonRows count={4} />}

        {digest && !loading && digest.highlights === 0 && (
          <div className="bg-surface border border-border rounded-lg p-6 text-center">
            <p className="font-serif italic text-text-muted m-0 mb-1">A quiet stretch</p>
            <p className="text-xs text-text-faint m-0">
              Nothing noteworthy from the last {days} day{days === 1 ? '' : 's'}. Follow more collectors to fill it up.
            </p>
          </div>
        )}

        {digest && !loading && (
          <>
            <Section title="Closing soon" items={digest.closingSoon} render={(e) => <AuctionItem key={e.key} e={e} />} />
            <Section title="On your wishlist" items={digest.wishlist} render={(e) => <Item key={e.key} e={e} note="On your wishlist" />} />
            <Section title="Rare finds" items={digest.rare} render={(e) => <Item key={e.key} e={e} note="High rarity score" />} />
            <Section title="Worth a listen" items={digest.listen} render={(e) => <Item key={e.key} e={e} note={e.reason ? `“${e.reason}”` : ''} />} />

            <div className="bg-surface border border-border rounded-lg p-4 mt-2">
              <div className="bg-text inline-block px-2.5 py-1 mb-3">
                <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">
                  The last {days} day{days === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-sm m-0 text-text">
                {digest.stats.collectors} collector{digest.stats.collectors === 1 ? '' : 's'} active &middot;{' '}
                {digest.stats.added} new in shelves &middot; {digest.stats.listed} listed for sale
              </p>
              <Link to="/activity" className="inline-block mt-2 text-xs font-medium text-accent no-underline hover:underline">
                See everything →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Section({ title, items, render }) {
  if (!items || items.length === 0) return null
  return (
    <section className="mb-7">
      <div className="bg-text inline-block px-2.5 py-1 mb-3">
        <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">{title}</span>
      </div>
      <div className="flex flex-col gap-3">{items.map(render)}</div>
    </section>
  )
}

function Item({ e, note }) {
  const to =
    e.kind === 'recommended' ? `/profile/${e.actorId}` : `/profile/${e.actorId}/marketplace`
  return (
    <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-3">
      <img src={e.imageUrl || PLACEHOLDER} alt="" className="w-14 h-14 object-cover rounded-sm flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold m-0 text-text truncate">{e.title || e.artist}</p>
        <p className="text-xs text-text-muted m-0">
          {e.title ? e.artist : ''}
          {e.price > 0 && e.kind === 'listed' ? ` · $${Number(e.price).toFixed(2)}` : ''}
        </p>
        {note && <p className="text-[11px] text-text-faint italic m-0 mt-0.5">{note}</p>}
        <p className="text-[10px] text-text-faint font-mono m-0 mt-0.5">
          {displayNameFor(e.actor)} · {timeAgo(e.createdAt)}
        </p>
      </div>
      <Link to={to} className="text-xs font-medium text-accent no-underline hover:underline whitespace-nowrap">
        View →
      </Link>
    </div>
  )
}

function AuctionItem({ e }) {
  const bid = e.currentBid != null ? e.currentBid : Number(e.price)
  return (
    <div className="flex items-center gap-3 bg-surface border border-border rounded-lg p-3">
      <img src={e.imageUrl || PLACEHOLDER} alt="" className="w-14 h-14 object-cover rounded-sm flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold m-0 text-text truncate">{e.title}</p>
        <p className="text-xs text-text-muted m-0">
          {e.artist} · {e.bidCount > 0 ? `Current bid $${bid.toFixed(2)}` : `Starting bid $${bid.toFixed(2)}`}
        </p>
        <AuctionCountdown endsAt={e.endsAt} />
        <p className="text-[10px] text-text-faint font-mono m-0 mt-0.5">{displayNameFor(e.actor)}</p>
      </div>
      <Link
        to={`/profile/${e.actorId}/marketplace`}
        className="text-xs font-medium text-accent no-underline hover:underline whitespace-nowrap"
      >
        Place a bid →
      </Link>
    </div>
  )
}

export default DigestPage