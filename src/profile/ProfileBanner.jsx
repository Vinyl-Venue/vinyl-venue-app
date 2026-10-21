import { useState } from 'react'
import { Link } from 'react-router-dom'
import { displayNameFor, avatarPlaceholder } from '../utils'
import FollowButton from '../FollowButton'
import ReportButton from '../ReportButton'

const monoLabel = 'font-mono text-[10px] tracking-wider uppercase'
const outlineBtn = 'min-h-11 px-5 bg-surface text-text border border-border-strong text-sm cursor-pointer no-underline inline-flex items-center hover:border-accent hover:text-accent'

function StatCell({ value, label, to, onClick, small }) {
  const body = (
    <>
      <span className={`font-serif ${small ? 'text-base leading-[2.1rem]' : 'text-[26px] leading-tight'} text-text`}>{value}</span>
      <span className={`${monoLabel} ${to || onClick ? 'text-accent' : 'text-text-muted'}`}>{label}{to || onClick ? ' →' : ''}</span>
    </>
  )
  const cls = 'bg-surface px-5 py-3.5 flex flex-col gap-0.5 min-w-[92px] no-underline'
  if (to) return <Link to={to} className={`${cls} hover:bg-bg`}>{body}</Link>
  if (onClick) return <button onClick={onClick} className={`${cls} hover:bg-bg border-0 text-left cursor-pointer font-sans`}>{body}</button>
  return <div className={cls}>{body}</div>
}

// The profile banner: identity on the left, the four headline numbers on the
// right. Each number is a doorway — Albums to the metrics page, Seller rating
// to the reviews, Following / Followers to their full lists.
function ProfileBanner({
  profile, avatarPreviewUrl, isOwnProfile, isFollowing, userId, editingProfile,
  onEditProfile, onFollowChange, onOpenReviews, comparison, onToggleCompare, stats, nowSpinning
}) {
  const [copied, setCopied] = useState(false)
  const name = displayNameFor(profile)

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this profile link:', window.location.href)
    }
  }

  const joined = profile.created_at ? new Date(profile.created_at).getFullYear() : null
  const meta = [profile.band_name, joined ? `On Vinyl Venue since ${joined}` : null].filter(Boolean).join(' · ')

  return (
    <div className="bg-surface border border-border flex flex-wrap items-center gap-8 p-6 lg:p-8">
      <img
        src={avatarPreviewUrl || profile.avatar_url || avatarPlaceholder(104, name)}
        alt=""
        className="w-[104px] h-[104px] object-cover rounded-full flex-shrink-0"
      />

      <div className="flex-1 basis-60 min-w-0 flex flex-col gap-2">
        <h1 className="m-0 font-serif italic font-normal text-4xl lg:text-[40px] leading-tight break-words">{name}</h1>
        {meta && <div className="text-sm text-text-muted">{meta}</div>}
        {profile.bio
          ? <div className="text-[15px] leading-normal max-w-[520px]">{profile.bio}</div>
          : isOwnProfile && <div className="text-[15px] text-text-faint">Add a short bio so people know what you collect.</div>}

        <div className="flex gap-2 mt-2 flex-wrap items-center">
          {isOwnProfile ? (
            <>
              {!editingProfile && <button onClick={onEditProfile} className="min-h-11 px-5 bg-text text-bg border-0 text-sm cursor-pointer">Edit profile</button>}
              <button onClick={handleShare} className={outlineBtn}>{copied ? 'Link copied' : 'Share'}</button>
            </>
          ) : (
            <>
              <FollowButton profileUserId={userId} onFollowChange={onFollowChange} />
              <Link to={`/messages/${userId}`} className={outlineBtn}>Message</Link>
              {isFollowing && (
                <>
                  <button onClick={onToggleCompare} className={outlineBtn}>Compare shelves</button>
                  {comparison && <span className="text-[13px] text-text-muted">You share {comparison.sharedAlbumCount} album{comparison.sharedAlbumCount === 1 ? '' : 's'}</span>}
                </>
              )}
              <ReportButton targetType="profile" targetId={userId} />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-px bg-border border border-border">
          <StatCell value={stats.albums} label="Albums" to={isFollowing ? `/profile/${userId}/metrics` : undefined} />
          {stats.rating
            ? <StatCell value={stats.rating} label="Seller rating" onClick={onOpenReviews} />
            : <StatCell value="No sales yet" label="Seller rating" small />}
          <StatCell value={stats.following} label="Following" to={`/profile/${userId}/following`} />
          <StatCell value={stats.followers} label="Followers" to={`/profile/${userId}/followers`} />
        </div>
        {nowSpinning}
      </div>
    </div>
  )
}

export default ProfileBanner
