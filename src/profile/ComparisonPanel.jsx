import SimilarityRing from './SimilarityRing'
import { compatibilityLabel } from './profileData'

function ComparisonPanel({ comparisonLoading, comparison }) {
  return (
    <div className="border-t border-border pt-4 mb-4 font-sans">
      <h2 className="m-0 font-serif italic font-normal text-[28px] leading-tight text-text mb-3">How your shelves compare</h2>
      {comparisonLoading && <p className="text-xs text-text-muted">Loading...</p>}
      {!comparisonLoading && comparison && (
        <>
          <div className="flex items-center gap-4 mb-4">
            <SimilarityRing score={comparison.overallSimilarity} />
            <p className="text-xs text-text-muted leading-snug">{compatibilityLabel(comparison.overallSimilarity)}</p>
          </div>
          <p className="text-xs text-text-muted mb-4">
            {comparison.sharedAlbumCount} identical album{comparison.sharedAlbumCount === 1 ? '' : 's'} in both shelves
          </p>
          {comparison.sharedArtists.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1.5">Shared artists</p>
              <p className="text-xs text-text leading-relaxed">{comparison.sharedArtists.join(', ')}</p>
            </div>
          )}
          {comparison.sharedDecades.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1.5">By decade</p>
              {comparison.sharedDecades.map((d) => (
                <p key={d.decade} className="text-xs text-text-muted mb-1">{d.decade} — you {d.mine}, them {d.theirs}</p>
              ))}
            </div>
          )}
          {(comparison.iCanFulfillCount > 0 || comparison.theyCanFulfillCount > 0) && (
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1.5">Trade potential</p>
              {comparison.iCanFulfillCount > 0 && (
                <p className="text-xs text-text-muted mb-1">You own {comparison.iCanFulfillCount} album{comparison.iCanFulfillCount === 1 ? '' : 's'} on their wishlist</p>
              )}
              {comparison.theyCanFulfillCount > 0 && (
                <p className="text-xs text-text-muted mb-1">They own {comparison.theyCanFulfillCount} album{comparison.theyCanFulfillCount === 1 ? '' : 's'} on yours</p>
              )}
            </div>
          )}
          {comparison.discoveryArtists.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-faint mb-1.5">Try something new</p>
              <div className="flex flex-wrap gap-1.5">
                {comparison.discoveryArtists.map((artist) => (
                  <span key={artist} className="bg-surface border border-border rounded-full px-2.5 py-1 text-[11px] text-text">{artist}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ComparisonPanel
