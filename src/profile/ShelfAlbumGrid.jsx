import RecordCard from '../RecordCard'

// The "Grid" view: a four-across cover grid. Search / sort / filter live in
// the shelf toolbar above it, so this only draws what it is given.
function ShelfAlbumGrid({ albums, isOwnProfile, onDelete, onEdit, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-5">
      {albums.map((album, i) => (
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
          onDelete={isOwnProfile ? () => onDelete(album.id) : undefined}
          onEdit={isOwnProfile ? (e) => { e.stopPropagation(); onEdit(album) } : undefined}
          onClick={() => onSelect(album)}
        />
      ))}
    </div>
  )
}

export default ShelfAlbumGrid
