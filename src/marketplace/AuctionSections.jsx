import { useState } from 'react'
import AuctionCountdown from '../AuctionCountdown'
import { gradeLabel } from './priceStats'

const PLACEHOLDER = 'https://placehold.co/400x400/E4E2DC/E4E2DC'
const INITIAL_VISIBLE = 8

export function SectionChip({ children, live }) {
  return (
    <h2 className="m-0 inline-flex items-center gap-2.5 font-serif italic font-normal text-[28px] leading-tight text-text whitespace-nowrap">
      {live && <span className="w-[9px] h-[9px] rounded-full bg-accent animate-pulse" />}
      {children}
    </h2>
  )
}

export function WatchHeart({ listingId, watch, className = '' }) {
  if (!watch || !watch.available) return null
  const on = watch.watched.has(listingId)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); watch.toggle(listingId) }}
      aria-label={on ? 'Stop watching' : 'Watch this listing'}
      aria-pressed={on}
      className={`absolute top-1.5 left-2 bg-transparent border-0 cursor-pointer p-0 text-xl leading-none drop-shadow ${on ? 'text-accent' : 'text-white'} ${className}`}
      style={{ textShadow: '0 1px 3px rgba(0,0,0,.5)' }}
    >
      {on ? '♥' : '♡'}
    </button>
  )
}

export function GradeTag({ listing }) {
  const grade = gradeLabel(listing)
  if (!grade) return null
  return <span className="font-mono text-[10px] border border-border-strong px-1.5 py-px text-text-muted whitespace-nowrap">{grade}</span>
}

function startsInLabel(startsAt) {
  const diffMs = new Date(startsAt).getTime() - Date.now()
  if (diffMs <= 0) return 'Starting soon'
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return 'Starts in <1h'
  if (hours < 24) return `Starts in ${hours}h`
  return `Starts in ${Math.floor(hours / 24)}d`
}

function sortAuctions(list, sort) {
  const copy = [...list]
  if (sort === 'bids') return copy.sort((a, b) => b.bidCount - a.bidCount)
  if (sort === 'price') return copy.sort((a, b) => Number(b.currentBid ?? b.price) - Number(a.currentBid ?? a.price))
  return copy.sort((a, b) => new Date(a.endsAt || 8.64e15) - new Date(b.endsAt || 8.64e15))
}

const SORTS = [
  { key: 'ending', label: 'Ending soon' },
  { key: 'bids', label: 'Most bids' },
  { key: 'price', label: 'Price' }
]

// Every live auction on the platform, ending-soonest first by default. The
// grid shows the first eight and expands in place.
export function LiveAuctions({ auctions, onSelect, watch, hideWhenEmpty, emptyAction }) {
  const [sort, setSort] = useState('ending')
  const [showAll, setShowAll] = useState(false)
  const sorted = sortAuctions(auctions, sort)
  const shown = showAll ? sorted : sorted.slice(0, INITIAL_VISIBLE)

  if (auctions.length === 0 && hideWhenEmpty) return null

  return (
    <div className="flex flex-col gap-2.5 font-sans">
      <div className="flex items-center gap-3 flex-wrap">
        <SectionChip live>Live auctions &middot; {auctions.length}</SectionChip>
        {auctions.length > 1 && (
          <>
            <span className="text-xs text-text-muted">Sort:</span>
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`font-mono text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full cursor-pointer border ${
                  sort === s.key ? 'bg-accent text-bg border-accent' : 'bg-transparent text-text-muted border-border'
                }`}
              >
                {s.label}
              </button>
            ))}
          </>
        )}
      </div>

      {auctions.length === 0 ? (
        <div className="border border-dashed border-border-strong p-6 text-center flex flex-col items-center gap-2">
          <div className="font-serif italic text-xl">No live auctions right now</div>
          <div className="text-sm text-text-muted max-w-sm">Check upcoming auctions below and watch the ones you want to catch at the start.</div>
          {emptyAction}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,176px))] gap-3.5">
            {shown.map((listing) => (
              <div
                key={listing.id}
                onClick={() => onSelect(listing)}
                className="bg-surface border border-border rounded overflow-hidden cursor-pointer hover:border-accent transition-colors"
              >
                <div className="relative">
                  <img src={listing.imageUrl || PLACEHOLDER} alt={listing.title} className="w-full aspect-square object-cover bg-border" />
                  <WatchHeart listingId={listing.id} watch={watch} />
                </div>
                <div className="p-2.5">
                  <p className="m-0 text-[13px] font-bold truncate">{listing.title}</p>
                  <p className="m-0 text-xs text-text-muted truncate">
                    {listing.artist} <GradeTag listing={listing} />
                  </p>
                  <div className="flex items-baseline justify-between mt-2 gap-2">
                    <span className="font-mono text-[15px] text-accent">${Number(listing.currentBid ?? listing.price).toFixed(2)}</span>
                    <span className="text-[11px] text-text-muted whitespace-nowrap">{listing.bidCount} bid{listing.bidCount === 1 ? '' : 's'}</span>
                  </div>
                  {listing.endsAt && <AuctionCountdown endsAt={listing.endsAt} />}
                  <p className="text-[10px] text-text-faint m-0 mt-1">
                    + {listing.shippingPrice != null ? `$${Number(listing.shippingPrice).toFixed(2)} shipping` : 'shipping: contact seller'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {sorted.length > INITIAL_VISIBLE && (
            <div className="flex justify-center">
              <button onClick={() => setShowAll((v) => !v)} className="text-[13px] text-accent bg-transparent border-0 cursor-pointer">
                {showAll ? 'Show fewer' : `Show ${sorted.length - INITIAL_VISIBLE} more live auctions ↓`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Auctions that haven't opened yet, soonest first. "Watch" saves them to
// the watchlist so they appear in Your bids once they open.
export function UpcomingAuctions({ auctions, onSelect, watch }) {
  if (auctions.length === 0) return null
  const sorted = [...auctions].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)).slice(0, 8)

  return (
    <div className="flex flex-col gap-2.5 font-sans">
      <div className="flex items-center gap-3 flex-wrap">
        <SectionChip>Upcoming auctions &middot; {auctions.length}</SectionChip>
        <span className="text-xs text-text-muted">Opening soonest first</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,176px))] gap-3.5">
        {sorted.map((listing) => {
          const on = watch?.watched?.has(listing.id)
          return (
            <div
              key={listing.id}
              onClick={() => onSelect(listing)}
              className="bg-surface border border-border rounded overflow-hidden cursor-pointer hover:border-accent transition-colors"
            >
              <div className="relative">
                <img src={listing.imageUrl || PLACEHOLDER} alt={listing.title} className="w-full aspect-square object-cover bg-border opacity-90" />
                <span className="absolute top-2 left-2 bg-text text-bg font-mono text-[10px] tracking-wider px-2 py-0.5 uppercase">{startsInLabel(listing.startsAt)}</span>
              </div>
              <div className="p-2.5">
                <p className="m-0 text-[13px] font-bold truncate">{listing.title}</p>
                <p className="m-0 text-xs text-text-muted truncate">
                  {listing.artist} <GradeTag listing={listing} />
                </p>
                <p className="font-mono text-xs text-text-muted m-0 mt-2 whitespace-nowrap">Opens at ${Number(listing.price).toFixed(2)}</p>
                {watch?.available && (
                  <button
                    onClick={(e) => { e.stopPropagation(); watch.toggle(listing.id) }}
                    className={`mt-2 text-xs bg-transparent border-0 p-0 cursor-pointer ${on ? 'text-text-muted' : 'text-accent'}`}
                  >
                    {on ? '♥ Watching' : '♡ Watch'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
