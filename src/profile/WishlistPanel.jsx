import AddAlbumForm from '../AddAlbumForm'
import { matchKey } from '../utils'

const PLACEHOLDER_60 = 'https://placehold.co/60x60/E4E2DC/767467?text=%20'

// "My Most Wanted" on your own profile, "Their wishlist" on someone else's.
// All state and handlers come from useWishlist.
function WishlistPanel({ isOwnProfile, wishlist }) {
  const {
    wishlistItems, wishlistRank, setWishlistRank,
    showAddToWishlist, setShowAddToWishlist, showExtraRanks, setShowExtraRanks,
    setSelectedWishlistItem, wishlistSearch, setWishlistSearch, myCollectionKeys,
    availableRanks, publicWishlistItems, extraWishlistItems,
    addWishlistItem: handleAddWishlistItem, removeWishlistItem: handleRemoveWishlistItem
  } = wishlist

  return (
    <div className="mt-8 max-w-lg">
      <div className="flex items-center justify-between mb-3">
        <h2 className="m-0 font-serif italic font-normal text-[28px] leading-tight text-text">{isOwnProfile ? 'My Most Wanted' : 'Their wishlist'}</h2>
        {isOwnProfile && !showAddToWishlist && (
          <button
            onClick={() => setShowAddToWishlist(true)}
            className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
          >
            + Add album
          </button>
        )}
      </div>
      <div className="bg-surface border border-border rounded p-4 font-sans">
      <p className="text-xs text-text-faint mb-3">
        {isOwnProfile ? 'Ranked by how much you want it — 1 is your most coveted.' : 'Their top-ranked wishlist.'}
      </p>

      {isOwnProfile && showAddToWishlist && (
        <div className="mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5 mb-3 text-text-muted text-sm">
            <label>Rank:</label>
            <select value={wishlistRank} onChange={(e) => setWishlistRank(e.target.value)} className="bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm">
              <option value="">Choose a rank</option>
              {availableRanks.map((r) => <option key={r} value={r}>#{r}</option>)}
            </select>
            <button
              onClick={() => setShowAddToWishlist(false)}
              className="text-xs text-text-muted bg-transparent border-0 cursor-pointer ml-auto"
            >
              Cancel
            </button>
          </div>
          <AddAlbumForm
            onAddAlbum={(item) => { handleAddWishlistItem(item); setShowAddToWishlist(false) }}
            onUpdateAlbum={() => {}}
            editingAlbum={null}
            onCancelEdit={() => {}}
            existingTitles={[]}
            existingArtists={[]}
            existingLabels={[]}
            existingPressingCountries={[]}
          />
        </div>
      )}

      {wishlistItems.length > 3 && (
        <input
          type="text"
          placeholder="Search wishlist..."
          value={wishlistSearch}
          onChange={(e) => setWishlistSearch(e.target.value)}
          className="bg-bg border border-border text-text px-2.5 py-1.5 rounded text-xs w-full mb-3"
        />
      )}

      {publicWishlistItems.length === 0 ? (
        <p className="text-text-muted text-sm">
          {isOwnProfile ? 'Nothing here yet — add your first album above.' : 'Their wishlist is empty.'}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {publicWishlistItems.map((item) => {
            const imageUrl = item.imageUrl || item.image_url
            const isMatch = !isOwnProfile && myCollectionKeys.includes(matchKey(item.title, item.artist))
            return (
              <div key={item.id} className={`flex items-center gap-2.5 rounded px-2 py-1.5 ${isMatch ? 'bg-accent/10' : ''}`}>
                <span className="text-accent font-bold text-xs w-5 flex-shrink-0">#{item.rank}</span>
                <img
                  src={imageUrl || PLACEHOLDER_60}
                  alt={item.title}
                  className="w-8 h-8 object-cover rounded flex-shrink-0 cursor-pointer"
                  onClick={() => isOwnProfile && setSelectedWishlistItem(item)}
                />
                <span className="flex-1 text-sm min-w-0 truncate cursor-pointer" onClick={() => isOwnProfile && setSelectedWishlistItem(item)}>
                  <strong>{item.title}</strong> — {item.artist}
                </span>
                {isMatch && <span className="text-accent text-[10px] font-bold flex-shrink-0">have it</span>}
                {isOwnProfile && (
                  <button onClick={() => handleRemoveWishlistItem(item)} className="text-text-faint text-xs bg-transparent border-0 cursor-pointer flex-shrink-0 hover:text-accent">
                    ×
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isOwnProfile && extraWishlistItems.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            onClick={() => setShowExtraRanks(!showExtraRanks)}
            className="text-[10px] uppercase tracking-wider text-text-faint bg-transparent border-0 cursor-pointer"
          >
            {showExtraRanks ? '− Hide' : '+ Show'} ranks 11–25 ({extraWishlistItems.length})
          </button>
          {showExtraRanks && (
            <div className="flex flex-col gap-1.5 mt-2 opacity-70">
              {extraWishlistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 rounded px-2 py-1.5">
                  <span className="text-text-muted font-bold text-xs w-5 flex-shrink-0">#{item.rank}</span>
                  <img src={item.imageUrl || PLACEHOLDER_60} alt={item.title} className="w-8 h-8 object-cover rounded flex-shrink-0 cursor-pointer" onClick={() => setSelectedWishlistItem(item)} />
                  <span className="flex-1 text-sm min-w-0 truncate cursor-pointer" onClick={() => setSelectedWishlistItem(item)}>
                    <strong>{item.title}</strong> — {item.artist}
                  </span>
                  <button onClick={() => handleRemoveWishlistItem(item)} className="text-text-faint text-xs bg-transparent border-0 cursor-pointer flex-shrink-0 hover:text-accent">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

export default WishlistPanel
