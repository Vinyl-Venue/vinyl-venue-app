import { useState } from 'react'

const field = 'min-h-11 border border-border-strong bg-surface text-sm text-text px-3.5'

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently added' },
  { value: 'rarity', label: 'Rarest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'artist', label: 'Artist A–Z' },
  { value: 'year', label: 'Year (oldest)' }
]

// Search, sort, genre filter and Crates / Grid / Wall toggle for the
// shelf. On your own shelf it also carries the Add album split button (add one,
// scan a crate, import CSV) and Export CSV.
function ShelfToolbar({
  search, setSearch, sort, setSort, genre, setGenre, genres,
  shelfView, setShelfView, isOwnProfile, onAddOne, onScan, onImport, onExport, disabled
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const run = (fn) => () => { setMenuOpen(false); fn() }

  return (
    <div className="flex flex-wrap gap-3 items-center font-sans">
      <input
        type="text"
        placeholder="Search this shelf"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled}
        className={`${field} flex-1 basis-64 min-w-0 placeholder:text-text-faint`}
      />
      <select value={sort} onChange={(e) => setSort(e.target.value)} disabled={disabled} className={field} aria-label="Sort">
        {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Sort: {o.label}</option>)}
      </select>
      <select value={genre} onChange={(e) => setGenre(e.target.value)} disabled={disabled} className={field} aria-label="Genre">
        <option value="">Genre</option>
        {genres.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>

      <div className="flex">
        {[['crates', 'Crates'], ['grid', 'Grid'], ['wall', 'Wall']].map(([value, label], i) => (
          <button
            key={value}
            onClick={() => setShelfView(value)}
            className={`min-h-11 px-4 text-sm cursor-pointer border ${i > 0 ? 'border-l-0' : ''} ${
              shelfView === value ? 'bg-text text-bg border-text' : 'bg-surface text-text border-border-strong'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isOwnProfile && (
        <>
          <div className="relative flex">
            <button onClick={onAddOne} className="min-h-11 px-4 bg-accent text-bg border-0 text-sm font-semibold cursor-pointer">+ Add album</button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="More ways to add albums"
              className="min-h-11 px-3 bg-accent text-bg border-0 border-l border-l-white/40 text-sm cursor-pointer"
            >
              ▾
            </button>
            {menuOpen && (
              <div className="absolute top-12 right-0 z-10 w-56 bg-surface border border-border-strong shadow-lg flex flex-col">
                <button onClick={run(onAddOne)} className="px-4 py-3 text-sm text-left bg-transparent border-0 border-b border-border cursor-pointer hover:bg-bg">Add one album</button>
                <button onClick={run(onScan)} className="px-4 py-3 text-sm text-left bg-transparent border-0 border-b border-border cursor-pointer hover:bg-bg">Scan a crate</button>
                <button onClick={run(onImport)} className="px-4 py-3 text-sm text-left bg-transparent border-0 cursor-pointer hover:bg-bg">Import from CSV</button>
              </div>
            )}
          </div>
          {!disabled && (
            <button onClick={onExport} className="min-h-11 px-3.5 bg-surface text-text border border-border-strong text-sm cursor-pointer">Export CSV</button>
          )}
        </>
      )}
    </div>
  )
}

export default ShelfToolbar
