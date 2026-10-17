import BadgesSection from '../BadgesSection'
import { getCollectionTier } from '../utils'

function ShelfStats({ realAlbums, topArtist, topGenre, topDuplicate, userId, isOwnProfile }) {
  return (
    <div className="border-t border-border pt-4 mb-4 font-sans">
      <div className="bg-text inline-block px-2.5 py-1 mb-2">
        <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">By the numbers</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="bg-surface border border-border rounded px-3 py-2">
          <div className="flex items-baseline justify-between gap-2">
            <div className="font-serif italic text-lg text-text">{realAlbums.length}</div>
            {getCollectionTier(realAlbums.length) && (
              <span
                title={`${realAlbums.length} albums on your shelf`}
                className="bg-surface border border-accent rounded-full px-2 py-0.5 flex items-center gap-1 flex-shrink-0"
              >
                <span className="text-[10px]">{getCollectionTier(realAlbums.length).icon}</span>
                <span className="text-[10px] font-bold text-text whitespace-nowrap">{getCollectionTier(realAlbums.length).label}</span>
              </span>
            )}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-text-faint mb-2">Total albums</div>
          <div className="border-t border-border pt-2">
            <BadgesSection userId={userId} isOwnProfile={isOwnProfile} realAlbums={realAlbums} inline />
          </div>
        </div>
        {topArtist && (
          <div className="bg-surface border border-border rounded px-3 py-2">
            <div className="font-serif italic text-sm text-text truncate">{topArtist[0]}</div>
            <div className="text-[10px] uppercase tracking-wider text-text-faint">Most collected artist ({topArtist[1]})</div>
          </div>
        )}
        {topGenre && (
          <div className="bg-surface border border-border rounded px-3 py-2">
            <div className="font-serif italic text-sm text-text">{topGenre[0]}</div>
            <div className="text-[10px] uppercase tracking-wider text-text-faint">Most collected genre ({topGenre[1]})</div>
          </div>
        )}
        {topDuplicate && topDuplicate.count > 1 && (
          <div className="bg-surface border border-border rounded px-3 py-2">
            <div className="font-serif italic text-sm text-text truncate">{topDuplicate.title}</div>
            <div className="text-[10px] uppercase tracking-wider text-text-faint">Most collected album ({topDuplicate.count} copies)</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShelfStats
