import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { matchKey } from './utils'

// Badges are entirely derived from data that already exists elsewhere
// (rarity_scores, albums, wishlist_items, listings) — no new table, no
// self-declared anything. Every badge is either objectively computable
// from the collection itself or an actual completed platform action
// (a trade), same "external, not self-asserted" principle as the
// setup-likes reactions.
function BadgesSection({ userId, isOwnProfile, realAlbums, inline = false }) {
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    computeBadges()
  }, [userId, realAlbums])

  async function computeBadges() {
    setLoading(true)
    const earned = []

    // Completionist — 3+ copies of the same title+artist.
    const copyCounts = {}
    realAlbums.forEach((a) => {
      const k = matchKey(a.title, a.artist)
      copyCounts[k] = (copyCounts[k] || 0) + 1
    })
    const maxCopies = Object.values(copyCounts).reduce((m, c) => Math.max(m, c), 0)
    if (maxCopies >= 3) {
      earned.push({ key: 'completionist', icon: '🎯', label: 'Completionist', desc: `${maxCopies} copies of one album` })
    }

    if (realAlbums.length > 0) {
      // Rare Find — owns something in the platform's top 1% by rarity.
      const { count: totalRanked } = await supabase
        .from('rarity_scores')
        .select('*', { count: 'exact', head: true })

      if (totalRanked) {
        const keys = realAlbums.map((a) => matchKey(a.title, a.artist))
        const { data: matchedRanks } = await supabase
          .from('rarity_scores')
          .select('rank')
          .in('composite_key', keys)

        if (matchedRanks && matchedRanks.length > 0) {
          const bestRank = Math.min(...matchedRanks.map((r) => r.rank))
          const cutoff = Math.max(1, Math.ceil(totalRanked * 0.01))
          if (bestRank <= cutoff) {
            earned.push({ key: 'rare', icon: '💎', label: 'Rare Find', desc: 'Owns a top 1% rarity record' })
          }
        }
      }

      // Wishlist Win — owns something that's also on their own wishlist.
      const { data: wishlistData } = await supabase
        .from('wishlist_items')
        .select('title, artist')
        .eq('user_id', userId)

      if (wishlistData && wishlistData.length > 0) {
        const ownedKeys = new Set(realAlbums.map((a) => matchKey(a.title, a.artist)))
        const won = wishlistData.some((w) => ownedKeys.has(matchKey(w.title, w.artist)))
        if (won) {
          earned.push({ key: 'wishlist', icon: '✓', label: 'Wishlist Win', desc: 'Tracked down something on your wishlist' })
        }
      }
    }

    // Trader — at least one completed trade (not a cash-only sale).
    const { count: tradeCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'sold')
      .in('listing_type', ['trade', 'fixed_or_trade'])

    if (tradeCount && tradeCount > 0) {
      earned.push({ key: 'trader', icon: '🔁', label: 'Trader', desc: `Completed ${tradeCount} trade${tradeCount === 1 ? '' : 's'}` })
    }

    setBadges(earned)
    setLoading(false)
  }

  if (loading) return null
  if (badges.length === 0 && !isOwnProfile) return null

  const pillList = badges.length === 0 ? (
    <p className="text-xs text-text-faint">
      {isOwnProfile ? 'None earned yet — keep collecting.' : 'No badges yet.'}
    </p>
  ) : (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => (
        <div
          key={b.key}
          title={b.desc}
          className="bg-surface border border-accent rounded-full px-3 py-1.5 flex items-center gap-1.5"
        >
          <span>{b.icon}</span>
          <span className="text-xs font-bold text-text">{b.label}</span>
        </div>
      ))}
    </div>
  )

  if (inline) return pillList

  return (
    <div className="font-sans flex-shrink-0">
      <div className="bg-surface border border-border rounded p-3 max-w-md">
        <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1">Badges</p>
        <p className="text-xs text-text-faint mb-3">
          Earned from your collection and activity — not something you can set yourself.
        </p>
        {pillList}
      </div>
    </div>
  )
}

export default BadgesSection