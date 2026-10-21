
// About & reviews and Activity switch what the page body shows; My
// marketplace (or "Their marketplace") is the same tab row but a link to
// the full seller page. Nothing is highlighted on the profile home.
function ProfileTabs({ active, onChange, isOwnProfile, showActivity, hasMarketplace }) {
  const tabClass = (on) =>
    `flex items-center min-h-11 px-[18px] text-sm no-underline bg-transparent border-0 border-b-2 -mb-px cursor-pointer ${
      on ? 'text-text font-semibold border-b-accent' : 'text-text-muted border-b-transparent hover:text-text'
    }`
  return (
    <div className="flex flex-wrap gap-1 border-b border-border font-sans">
      <button onClick={() => onChange(active === 'about' ? null : 'about')} className={tabClass(active === 'about')}>About &amp; reviews</button>
      {showActivity && <button onClick={() => onChange(active === 'activity' ? null : 'activity')} className={tabClass(active === 'activity')}>Activity</button>}
      {hasMarketplace && (
        <button onClick={() => onChange(active === 'marketplace' ? null : 'marketplace')} className={tabClass(active === 'marketplace')}>
          {isOwnProfile ? 'My marketplace' : 'Their marketplace'}
        </button>
      )}
    </div>
  )
}

export default ProfileTabs
