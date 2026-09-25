import SidePanel from './SidePanel'
import AlbumDetailContent from './AlbumDetailContent'

// Floating panel used everywhere AlbumDetailContent needs to show as an
// overlay: full-screen backdrop below lg, docked-right panel at lg+.
// Used directly by the Wishlist item modal. The Shelf (Wall + Grid) uses
// ShelfDetailPanel instead at lg+, and only falls back to this for the
// narrow-screen overlay — see ProfilePage.jsx.
function AlbumModal({ album, onClose, isOwnAlbum = false }) {
  return (
    <SidePanel onClose={onClose} width={480}>
      <AlbumDetailContent key={album.id} album={album} onClose={onClose} isOwnAlbum={isOwnAlbum} />
    </SidePanel>
  )
}

export default AlbumModal