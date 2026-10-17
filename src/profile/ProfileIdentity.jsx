import { displayNameFor, avatarPlaceholder } from '../utils'
import ProfileActions from './ProfileActions'

// Desktop identity block at the top of the sidebar. Hidden on mobile, where
// MobileProfileHeader covers the same ground.
function ProfileIdentity({ profile, avatarPreviewUrl, isOwnProfile, userEmail, editingProfile, actions }) {
  return (
    <div className="hidden lg:block">
      <div className="flex items-center gap-3 mb-2">
        <img src={avatarPreviewUrl || avatarPlaceholder(56, displayNameFor(profile))} alt="" className="w-14 h-14 object-cover rounded-full flex-shrink-0" />
        <div className="min-w-0">
          <h2 className="text-xl font-serif italic mb-0.5 truncate">{displayNameFor(profile)}</h2>
          {isOwnProfile && <p className="text-text-muted font-sans text-xs truncate">{userEmail}</p>}
        </div>
      </div>
      {profile.bio && !editingProfile && <p className="text-text-muted font-sans text-xs mb-3">{profile.bio}</p>}
      <ProfileActions variant="desktop" editingProfile={editingProfile} {...actions} />
    </div>
  )
}

export default ProfileIdentity
