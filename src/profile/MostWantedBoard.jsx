import { matchKey } from '../utils'
import WishlistPanel from './WishlistPanel'

const PLACEHOLDER = 'https://placehold.co/300x300/E4E2DC/E4E2DC'

function Tile({ item, owned, muted, onClick }) {
  const imageUrl = item.imageUrl || item.image_url
  return (
    <div className={`flex flex-col gap-2 min-w-0 ${muted ? 'opacity-70' : ''}`}>
      <div
        onClick={onClick}
        className={`relative aspect-square bg-border border border-border bg-cover bg-center ${onClick ? 'cursor-pointer' : ''}`}
        style={{ backgroundImage: `url(${imageUrl || PLACEHOLDER})` }}
      >
        <span className="absolute top-1.5 left-1.5 bg-text text-bg font-mono text-[10px] px-1.5 py-0.5">#{item.rank}</span>
        {owned && (
          <span className="absolute left-1.5 right-1.5 bottom-1.5 bg-surface text-text text-[11px] font-semibold px-1.5 py-0.5 text-center">You own this</span>
        )}
      </div>
      <div className="text-[13px] font-semibold truncate">{item.title}</div>
      <div className="text-xs text-text-muted -mt-1.5 truncate">{item.artist}</div>
    </div>
  )
}

// "Most wanted" — top 10 for everyone, ranks 11–25 owner-only behind a
// toggle. On someone else's profile, albums the viewer owns are flagged and a
// trade prompt counts how many of their top 10 are on the viewer's shelf.
// Adding / removing / re-ranking reuses the existing WishlistPanel form,
// shown under the grid while "Edit list" is open.
function MostWantedBoard({ isOwnProfile, profileName, wishlist, managing, onToggleManaging, userId }) {
  const {
    publicWishlistItems, extraWishlistItems, showExtraRanks, setShowExtraRanks,
    myCollectionKeys, setSelectedWishlistItem, wishlistItems, setShowAddToWishlist
  } = wishlist

  const top = publicWishlistItems.slice(0, 10)
  const ownedCount = isOwnProfile
    ? 0
    : top.filter((i) => myCollectionKeys.includes(matchKey(i.title, i.artist))).length

  const heading = (
    <div className="flex flex-col gap-1 lg:col-start-1 lg:row-start-1">
      <h2 className="m-0 font-serif italic font-normal text-[28px] leading-tight">Most wanted</h2>
      <div className="flex items-baseline gap-3 text-[13px] leading-snug">
        <span className="text-text-muted">
          {isOwnProfile ? 'Showing #1–10 of your top 25' : `${profileName}'s top 10 most wanted`}
        </span>
        {isOwnProfile && (
          <button onClick={onToggleManaging} className="text-accent bg-transparent border-0 p-0 cursor-pointer text-[13px]">
            {managing ? 'Done' : 'Edit list'}
          </button>
        )}
      </div>
    </div>
  )

  if (wishlistItems.length === 0) {
    return (
      <>
        {heading}
        <div className="lg:col-start-1 lg:row-start-2 border border-dashed border-border-strong min-h-64 flex flex-col items-center justify-center gap-2.5 p-6 text-center">
          {isOwnProfile ? (
            <>
              <div className="font-serif italic text-[22px]">What are you hunting for?</div>
              <div className="text-sm text-text-muted max-w-md">Pick up to 25 albums you want most. Visitors see your top 10 and can tell what they own that you need.</div>
              <button
                onClick={() => { setShowAddToWishlist(true); onToggleManaging(true) }}
                className="min-h-11 px-5 bg-text text-bg border-0 text-sm cursor-pointer"
              >
                Add your first album
              </button>
            </>
          ) : (
            <div className="text-sm text-text-muted">{profileName} hasn't picked their most wanted albums yet.</div>
          )}
        </div>
        {managing && <div className="lg:col-span-2 lg:row-start-4"><WishlistPanel isOwnProfile={isOwnProfile} wishlist={wishlist} /></div>}
      </>
    )
  }

  return (
    <>
      {heading}
      <div className="lg:col-start-1 lg:row-start-2 grid grid-cols-2 sm:grid-cols-5 gap-3 content-start">
        {top.map((item) => (
          <Tile
            key={item.id}
            item={item}
            owned={!isOwnProfile && myCollectionKeys.includes(matchKey(item.title, item.artist))}
            onClick={isOwnProfile ? () => setSelectedWishlistItem(item) : undefined}
          />
        ))}
        {isOwnProfile && showExtraRanks && extraWishlistItems.map((item) => (
          <Tile key={item.id} item={item} muted onClick={() => setSelectedWishlistItem(item)} />
        ))}
      </div>

      <div className="lg:col-start-1 lg:row-start-3 flex flex-wrap items-center gap-3 text-sm">
        {isOwnProfile ? (
          extraWishlistItems.length > 0 && (
            <>
              <button
                onClick={() => setShowExtraRanks(!showExtraRanks)}
                className="min-h-11 px-4 bg-surface text-text border border-border-strong text-sm cursor-pointer"
              >
                {showExtraRanks ? 'Hide #11–25' : 'Show #11–25'}
              </button>
              <span className="text-xs text-text-muted">Only you can see #11–25. Every rank still counts toward rarity and suggested prices.</span>
            </>
          )
        ) : (
          ownedCount > 0 && (
            <>
              <span><b>{ownedCount} of {top.length}</b> are on your shelf.</span>
              <a href={`/messages/${userId}`} className="text-accent no-underline">Message {profileName} about a trade →</a>
            </>
          )
        )}
      </div>

      {managing && <div className="lg:col-span-2 lg:row-start-4"><WishlistPanel isOwnProfile={isOwnProfile} wishlist={wishlist} /></div>}
    </>
  )
}

export default MostWantedBoard
