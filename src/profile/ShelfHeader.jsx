// The shelf title row: Wall / Grid / Crates toggle plus, on your own shelf,
// the export, scan and add-album actions.
function ShelfHeader({
  isOwnProfile, shelfView, setShelfView, showAddAlbum, setShowAddAlbum,
  editingAlbum, handleExportShelf, setShowScanCrateModal
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
      <h3 className="font-serif italic text-lg m-0">{isOwnProfile ? 'Your shelf' : 'Their shelf'}</h3>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-surface border border-border rounded-full p-0.5 flex-shrink-0">
          <button
            onClick={() => setShelfView('wall')}
            className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
              shelfView === 'wall' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
            }`}
          >
            Wall
          </button>
          <button
            onClick={() => setShelfView('grid')}
            className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
              shelfView === 'grid' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setShelfView('crates')}
            className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer border-0 whitespace-nowrap ${
              shelfView === 'crates' ? 'bg-accent text-bg' : 'bg-transparent text-text-muted'
            }`}
          >
            Crates
          </button>
        </div>
        {isOwnProfile && !showAddAlbum && !editingAlbum && (
          <div className="flex items-center gap-3 flex-wrap lg:pl-3 lg:border-l border-border">
            <button
              onClick={handleExportShelf}
              className="text-[10px] uppercase tracking-wider text-text-muted bg-transparent border-0 cursor-pointer hover:text-accent whitespace-nowrap"
            >
              Export shelf
            </button>
            <button
              onClick={() => setShowScanCrateModal(true)}
              className="text-[10px] uppercase tracking-wider text-text-muted bg-transparent border-0 cursor-pointer hover:text-accent whitespace-nowrap"
            >
              Scan Crate
            </button>
            <button
              onClick={() => setShowAddAlbum(true)}
              className="bg-accent text-bg text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer whitespace-nowrap"
            >
              + Add album
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ShelfHeader
