function RecordCard({ title, artist, imageUrl, isInCollection }) {
  return (
    <div className="record-card">
      <img
        src={imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
        alt={title}
        className="record-cover"
      />
      <p className="record-title">{title}</p>
      {isInCollection === false && (
        <span className="record-badge">Wishlist</span>
      )}
    </div>
  )
}

export default RecordCard