function AlbumModal({ album, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <img
          src={album.imageUrl || "https://placehold.co/400x400/1c1a15/a8a29a?text=No+cover+yet"}
          alt={album.title}
          className="modal-cover"
        />
        <h2>{album.title}</h2>
        <p className="modal-artist">{album.artist}</p>
        <p className="modal-meta">
          {album.year || 'Year unknown'} · {album.genre || 'Genre unknown'}
        </p>

        {(album.label || album.pressingCountry || album.matrixNumber || album.deadwax) && (
          <div className="modal-pressing-details">
            {album.label && <p><strong>Label:</strong> {album.label}</p>}
            {album.pressingCountry && <p><strong>Pressing country:</strong> {album.pressingCountry}</p>}
            {album.matrixNumber && <p><strong>Matrix number:</strong> {album.matrixNumber}</p>}
            {album.deadwax && <p><strong>Deadwax / runout:</strong> {album.deadwax}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default AlbumModal