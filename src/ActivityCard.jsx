import { Link } from 'react-router-dom'
import AuctionCountdown from './AuctionCountdown'
import { describeGroup } from './activityFeed'
import { displayNameFor, avatarPlaceholder, timeAgo } from './utils'

const PLACEHOLDER = 'https://placehold.co/80x80/E4E2DC/767467?text=%20'

function ActivityCard({ group }) {
  const { headline, sub, cta, to } = describeGroup(group)
  const covers = group.items.slice(0, 4)
  const extra = group.items.length - covers.length
  const first = group.items[0]

  return (
    <div className="flex-none w-[236px] box-border bg-surface border border-border rounded-lg p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2 text-xs">
        <img
          src={group.actor?.avatar_url || avatarPlaceholder(22, displayNameFor(group.actor))}
          alt=""
          className="w-[22px] h-[22px] rounded-full object-cover flex-shrink-0"
        />
        <Link to={`/profile/${group.actorId}`} className="font-bold text-text truncate no-underline hover:underline">
          {displayNameFor(group.actor)}
        </Link>
        <span className="ml-auto font-mono text-[10px] text-text-faint whitespace-nowrap">
          {timeAgo(group.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {covers.map((item) => (
          <img key={item.key} src={item.imageUrl || PLACEHOLDER} alt="" className="w-[46px] h-[46px] object-cover rounded-sm flex-shrink-0" />
        ))}
        {extra > 0 && <span className="font-mono text-[11px] text-text-muted ml-0.5">+{extra}</span>}
      </div>

      <div>
        <p className="m-0 text-sm font-bold leading-snug text-text">
          {headline}
        </p>
        {sub && <p className="m-0 mt-0.5 text-xs text-text-muted leading-snug">{sub}</p>}
      </div>

      {group.kind === 'auction' && first.endsAt && (
        <div>
          <span className="inline-block font-mono text-[10px] tracking-wider uppercase font-bold bg-text text-bg px-2 py-0.5">
            Auction ends in
          </span>
          <AuctionCountdown endsAt={first.endsAt} />
        </div>
      )}

      <Link to={to} className="mt-auto text-xs font-medium text-accent no-underline hover:underline">
        {cta} →
      </Link>
    </div>
  )
}

export default ActivityCard