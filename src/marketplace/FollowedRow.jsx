import { SectionChip } from './AuctionSections'

const PLACEHOLDER = 'https://placehold.co/200x200/E4E2DC/E4E2DC'

// New listings from people you follow: one slim scrolling row. When you
// follow no one it collapses to a single quiet line instead of vanishing.
function FollowedRow({ items, followsAnyone, onSelect, onShowOnly, showingOnly }) {
  if (!followsAnyone) {
    return (
      <div className="flex flex-col gap-2 font-sans">
        <SectionChip>New from people you follow</SectionChip>
        <div className="flex items-center justify-between border border-border bg-surface px-3.5 py-3 text-[13px] text-text-muted gap-3">
          <span>Follow collectors to see their new listings here.</span>
          <a href="/discover" className="text-accent no-underline whitespace-nowrap">Find people &rarr;</a>
        </div>
      </div>
    )
  }
  if (items.length === 0) return null

  return (
    <div className="flex flex-col gap-2 font-sans">
      <div className="flex items-center gap-3">
        <SectionChip>New from people you follow</SectionChip>
        <button onClick={onShowOnly} className="ml-auto text-xs text-accent bg-transparent border-0 cursor-pointer p-0">
          {showingOnly ? 'Showing only these ×' : 'Show only these →'}
        </button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="flex-none w-[132px] bg-surface border border-border rounded overflow-hidden cursor-pointer hover:border-accent"
          >
            <img src={item.imageUrl || PLACEHOLDER} alt={item.title} className="w-full aspect-square object-cover bg-border" />
            <div className="px-2 py-1.5">
              <p className="m-0 text-[11px] font-bold truncate">{item.title}</p>
              <p className="m-0 text-[10px] text-text-muted truncate">
                {item.price != null && item.listingType !== 'trade' ? `$${Number(item.price).toFixed(2)} · ` : ''}{item.sellerName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FollowedRow
