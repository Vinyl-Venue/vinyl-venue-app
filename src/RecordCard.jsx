function RecordCard({ title, artist, year, genre, imageUrl, isInCollection, onDelete, onClick, onEdit }) {
  function handleDeleteClick(event) {
    event.stopPropagation()
    onDelete()
  }

  return (
    <div className="record-card" onClick={onClick}>
      <img
        src={imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
        alt={title}
        className="record-cover"
      />
      <p className="record-title">{title}</p>
      <p className="record-meta">
        {artist}{year ? ` · ${year}` : ''}{genre ? ` · ${genre}` : ''}
      </p>
      {isInCollection === false && (
        <span className="record-badge">Wishlist</span>
      )}
      <div className="card-actions">
        <button className="edit-button" onClick={onEdit}>✎</button>
        <button className="delete-button" onClick={handleDeleteClick}>×</button>
      </div>
    </div>
  )
}

export default RecordCard