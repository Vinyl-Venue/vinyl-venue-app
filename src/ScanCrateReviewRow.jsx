const PLACEHOLDER = "https://placehold.co/60x60/1c1a15/1c1a15"

const CONFIDENCE_COLORS = {
  high: 'bg-accent text-bg',
  medium: 'bg-[#b08d57] text-bg',
  low: 'bg-[#c1666b] text-bg'
}

// One row in the Scan Crate review list. Purely presentational — all the
// actual enrichment logic (searching Discogs, resolving ambiguous matches)
// lives in ScanCrateModal and is passed in via callbacks, so this stays
// easy to reason about on its own.
function ScanCrateReviewRow({ item, isDuplicate, onFieldChange, onToggleInclude, onSelectCandidate, onRetrySearch }) {
  const coverUrl = item.enriched?.coverImageUrl || PLACEHOLDER

  return (
    <div className="bg-surface border border-border rounded p-3 font-sans">
      <div className="flex gap-3">
        <input
          type="checkbox"
          checked={item.included}
          onChange={() => onToggleInclude(item.key)}
          disabled={item.discogsStatus === 'searching' || item.discogsStatus === 'fetching'}
          className="mt-1 flex-shrink-0"
        />

        <img
          src={coverUrl}
          alt={item.title}
          className="w-14 h-14 object-cover rounded flex-shrink-0 bg-bg"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <input
              type="text"
              value={item.title}
              onChange={(e) => onFieldChange(item.key, 'title', e.target.value)}
              placeholder="Title"
              className="flex-1 min-w-0 bg-bg border border-border text-text px-2 py-1 rounded text-sm"
            />
            <span className={`flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${CONFIDENCE_COLORS[item.confidence] || 'bg-border text-text-muted'}`}>
              {item.confidence || 'unknown'}
            </span>
          </div>

          <input
            type="text"
            value={item.artist}
            onChange={(e) => onFieldChange(item.key, 'artist', e.target.value)}
            placeholder="Artist"
            className="w-full bg-bg border border-border text-text px-2 py-1 rounded text-sm mb-1.5"
          />

          {item.note && (
            <p className="text-[11px] text-text-faint mb-1.5">{item.note}</p>
          )}

          {isDuplicate && (
            <p className="text-[11px] text-[#b08d57] font-bold mb-1.5">
              Already in your collection — left unchecked, check the box if you want to add this copy too
            </p>
          )}

          {item.discogsStatus === 'searching' && (
            <p className="text-[11px] text-text-muted m-0">Searching Discogs...</p>
          )}

          {item.discogsStatus === 'fetching' && (
            <p className="text-[11px] text-text-muted m-0">Loading match details...</p>
          )}

          {item.discogsStatus === 'matched' && (
            <p className="text-[11px] text-accent font-bold m-0">
              Matched on Discogs{item.enriched?.year ? ` · ${item.enriched.year}` : ''}
            </p>
          )}

          {item.discogsStatus === 'none' && (
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-[#c1666b] m-0">No Discogs match</p>
              <button
                onClick={() => onRetrySearch(item.key)}
                className="text-[11px] text-accent bg-transparent border-0 cursor-pointer underline p-0"
              >
                Search again
              </button>
            </div>
          )}

          {item.discogsStatus === 'ambiguous' && (
            <div>
              <p className="text-[11px] text-text-muted mb-1.5">Multiple possible matches — pick one:</p>
              <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                {item.candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => onSelectCandidate(item.key, candidate.id)}
                    className="flex items-center gap-2 bg-bg border border-border rounded px-2 py-1.5 text-left cursor-pointer hover:border-accent"
                  >
                    <img src={candidate.thumb || PLACEHOLDER} alt="" className="w-6 h-6 object-cover rounded flex-shrink-0" />
                    <span className="text-[11px] text-text flex-1 min-w-0 truncate">
                      {candidate.title}
                      <span className="text-text-faint block">
                        {[candidate.year, candidate.format, candidate.country].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ScanCrateReviewRow