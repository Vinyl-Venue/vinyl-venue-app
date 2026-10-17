import { Link } from 'react-router-dom'
import { displayNameFor, avatarPlaceholder } from '../utils'

function NetworkLists({ followingProfiles, followerProfiles, profile, isOwnProfile }) {
  return (
    <div className="border-t border-border pt-4 mb-4 font-sans">
      <div className="bg-text inline-block px-2.5 py-1 mb-2">
        <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Following ({followingProfiles.length})</span>
      </div>
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
      <div className="bg-text inline-block px-2.5 py-1 mb-2">
        <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Fans ({followerProfiles.length})</span>
      </div>
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
