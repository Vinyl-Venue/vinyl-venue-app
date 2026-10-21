import { Link } from 'react-router-dom'
import { displayNameFor, avatarPlaceholder } from '../utils'

function NetworkLists({ followingProfiles, followerProfiles, profile, isOwnProfile }) {
  return (
    <div className="border-t border-border pt-4 mb-4 font-sans">
      <h2 className="m-0 font-serif italic font-normal text-[28px] leading-tight text-text mb-2">Following ({followingProfiles.length})</h2>
      <div className="flex flex-col gap-1.5 mb-3">
        {followingProfiles.map((p) => (
          <Link key={p.id} to={`/profile/${p.id}`} className="flex items-center gap-2 bg-surface border border-border rounded px-2.5 py-2 font-sans text-xs no-underline text-text hover:border-accent">
            <img src={p.avatar_url || avatarPlaceholder(24, displayNameFor(p))} alt="" className="w-6 h-6 object-cover rounded-full flex-shrink-0" />
            <span className="truncate">{displayNameFor(p)}</span>
          </Link>
        ))}
        {followingProfiles.length === 0 && (
          <p className="text-text-muted text-xs">
            {isOwnProfile ? "You're not following anyone yet." : `${displayNameFor(profile)} isn't following anyone yet.`}
          </p>
        )}
      </div>
      <h2 className="m-0 font-serif italic font-normal text-[28px] leading-tight text-text mb-2">Fans ({followerProfiles.length})</h2>
      <div className="flex flex-col gap-1.5">
        {followerProfiles.map((p) => (
          <Link key={p.id} to={`/profile/${p.id}`} className="flex items-center gap-2 bg-surface border border-border rounded px-2.5 py-2 font-sans text-xs no-underline text-text hover:border-accent">
            <img src={p.avatar_url || avatarPlaceholder(24, displayNameFor(p))} alt="" className="w-6 h-6 object-cover rounded-full flex-shrink-0" />
            <span className="truncate">{displayNameFor(p)}</span>
          </Link>
        ))}
        {followerProfiles.length === 0 && (
          <p className="text-text-muted text-xs">
            {isOwnProfile ? 'No one is following you yet.' : `No one is following ${displayNameFor(profile)} yet.`}
          </p>
        )}
      </div>
    </div>
  )
}

export default NetworkLists
