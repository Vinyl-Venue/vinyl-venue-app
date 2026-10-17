import { displayNameFor, avatarPlaceholder } from '../utils'
import ProfileActions from './ProfileActions'

// Mobile-only compact header — avatar, name, bio, and the same identity
// actions as the desktop sidebar, always visible above the tabs regardless
// of which tab is active.
function MobileProfileHeader({ profile, avatarPreviewUrl, actions }) {
  return (
    <div className="lg:hidden px-5 py-5 border-b border-border">
      <div className="flex items-center gap-3 mb-3">
        <img src={avatarPreviewUrl || avatarPlaceholder(56, displayNameFor(profile))} alt="" className="w-14 h-14 object-cover rounded-full flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-serif italic mb-0.5 truncate">{displayNameFor(profile)}</h2>
          {profile.bio && <p className="text-text-muted font-sans text-xs truncate">{profile.bio}</p>}
        </div>
      </div>
      <ProfileActions variant="mobile" {...actions} />
    </div>
  )
}

export default MobileProfileHeader
