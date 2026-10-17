import RecordCard from '../RecordCard'

// The "Grid" shelf view: search box, empty-shelf message and the cover grid.
function ShelfGridView({
  realAlbums, filteredAlbums, collectionSearch, setCollectionSearch,
  normalizedCollectionSearch, isOwnProfile, handleDeleteAlbum, setEditingAlbum, setSelectedAlbum
}) {
  return (
    <>
      {realAlbums.length > 0 && (
        <input
          type="text"
          placeholder="Search this shelf by title or artist..."
          value={collectionSearch}
          onChange={(e) => setCollectionSearch(e.target.value)}
          className="bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm w-full md:w-80 mt-2 mb-4"
        />
      )}

      {normalizedCollectionSearch && filteredAlbums.length === 0 && (
        <p className="text-text-muted font-sans text-sm mb-3">No albums match "{collectionSearch}".</p>
      )}

      {/* Grid view previously had no empty-shelf messaging at
          all — Wall and Crates each have one, so a brand-new
          profile viewed in Grid (the default for anyone who
          last switched views) just rendered a blank area with
          no explanation. Matches the Wall view's copy. */}
      {realAlbums.length === 0 && (
        <div className="bg-surface border border-dashed border-border rounded-lg p-10 text-center font-sans max-w-4xl">
          <p className="font-serif italic text-xl text-text mb-2">
            {isOwnProfile ? 'Your shelf is empty' : 'This shelf is empty'}
          </p>
          <p className="text-sm text-text-muted max-w-sm mx-auto">
            {isOwnProfile
              ? 'Add your first record to start building your collection.'
              : "They haven't added any albums yet."}
          </p>
          {isOwnProfile && (
            <p className="text-xs text-text-faint mt-4">
              Use <strong className="text-text-muted">+ Add album</strong> above to add one by hand, or <strong className="text-text-muted">Scan Crate</strong> to add several at once.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
        {filteredAlbums.map((album, i) => (
          <RecordCard
            key={album?.id ?? i}
            title={album?.title}
            artist={album?.artist}
            year={album?.year}
            genre={album?.genre}
            imageUrl={album?.imageUrl}
            isInCollection={album?.isInCollection}
            listing={album?.listing}
            rarityRank={album?.rarityRank}
            rarityBreakdown={album?.rarityBreakdown}
            onDelete={() => isOwnProfile && handleDeleteAlbum(album.id)}
            onEdit={(e) => { if (isOwnProfile) { e.stopPropagation(); setEditingAlbum(album) } }}
            onClick={() => setSelectedAlbum(album)}
          />
        ))}
      </div>
    </>
  )
}

export default ShelfGridView
