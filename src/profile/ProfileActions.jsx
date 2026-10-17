import { Link } from 'react-router-dom'
import FollowButton from '../FollowButton'
import ReportButton from '../ReportButton'

// The Edit / Marketplace / Message / Report / Follow buttons. The same set
// appears in the compact mobile header and the desktop sidebar, with small
// differences in wording and layout, so one component serves both.
function ProfileActions({ variant, isOwnProfile, isFollowing, userId, editingProfile, onEditProfile, onFollowChange }) {
  const isMobile = variant === 'mobile'
  const pillClass = `bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs hover:border-accent hover:text-accent ${isMobile ? '' : 'font-sans'}`
  const buttonClass = `${pillClass} cursor-pointer`
  const linkClass = `${pillClass} no-underline`

  return (
    <div className={isMobile ? 'flex gap-2 flex-wrap font-sans' : 'flex gap-2 mb-4 flex-wrap'}>
      {isOwnProfile && (isMobile || !editingProfile) && (
        <button onClick={onEditProfile} className={buttonClass}>
          Edit profile
        </button>
      )}
      {isOwnProfile && (
        <Link to={`/profile/${userId}/marketplace`} className={linkClass}>
          My marketplace
        </Link>
      )}
      {!isOwnProfile && isFollowing && (
        <Link to={`/profile/${userId}/marketplace`} className={linkClass}>
          {isMobile ? 'Their marketplace' : 'View their marketplace'}
        </Link>
      )}
      {!isOwnProfile && (
        <Link to={`/messages/${userId}`} className={linkClass}>
          Message
        </Link>
      )}
      {!isOwnProfile && <ReportButton targetType="profile" targetId={userId} />}
      {!isOwnProfile && <FollowButton profileUserId={userId} onFollowChange={onFollowChange} />}
    </div>
  )
}

export default ProfileActions
