function RecordCard({ title, artist, year, genre, imageUrl, isInCollection, onDelete, onClick, onEdit }) {
  function handleDeleteClick(event) {
    event.stopPropagation()
    onDelete()
  }

  return (
    <div
      className="aspect-square bg-surface border border-border rounded relative cursor-pointer transition-all hover:border-accent hover:-translate-y-0.5"
      onClick={onClick}
    >
      <img
        src={imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
        alt={title}
        className="w-full h-full object-cover rounded"
      />
      <p className="absolute top-2 left-2 m-0 text-sm bg-black/50 px-2 py-0.5 rounded text-text">
        {title}
      </p>
      <p className="text-xs text-text-muted font-sans mt-1 absolute bottom-2 left-2">
        {artist}{year ? ` · ${year}` : ''}{genre ? ` · ${genre}` : ''}
      </p>
      {isInCollection === false && (
        <span className="absolute bottom-2 right-2 text-xs text-accent bg-black/60 px-2 py-0.5 rounded">
          Wishlist
        </span>
      )}
      <div className="absolute top-2 right-2 flex gap-1.5">
        <button
          onClick={onEdit}
          className="w-6 h-6 rounded-full border-0 bg-black/60 text-text-muted text-sm leading-none cursor-pointer hover:bg-accent hover:text-bg"
        >
          ✎
        </button>
        <button
          onClick={handleDeleteClick}
          className="w-6 h-6 rounded-full border-0 bg-black/60 text-text-muted text-base leading-none cursor-pointer hover:bg-accent hover:text-bg"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default RecordCard