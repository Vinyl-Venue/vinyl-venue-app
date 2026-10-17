

// The inline "Edit profile" form. All state and handlers come from
// useProfileEditor so this stays a plain presentational component.
function ProfileEditForm({ editor }) {
  const {
    displayNameInput, setDisplayNameInput, bandNameInput, setBandNameInput,
    bioInput, setBioInput, savingProfile, profileError,
    handleAvatarFileChange, handleSaveProfile, handleCancelEditProfile
  } = editor

  return (
    <div className="mb-4 font-sans bg-surface border border-border rounded p-3">
      <label className="text-xs text-text-muted block mb-1">Display name</label>
      <input type="text" placeholder="How you want to appear to others" value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} disabled={savingProfile} className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-3" />
      <label className="text-xs text-text-muted block mb-1">Band name</label>
      <input type="text" placeholder="e.g. The Deadwax Runouts" value={bandNameInput} onChange={(e) => setBandNameInput(e.target.value)} disabled={savingProfile} className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-3" />
      <label className="text-xs text-text-muted block mb-1">Bio</label>
      <textarea placeholder="A short line about your collection or taste" value={bioInput} onChange={(e) => setBioInput(e.target.value)} rows={2} disabled={savingProfile} className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm resize-none mb-3" />
      <label className="text-xs text-text-muted block mb-1">Profile photo</label>
      <input type="file" accept="image/*" onChange={handleAvatarFileChange} disabled={savingProfile} className="text-text-muted text-xs mb-3" />
      {profileError && <p className="text-xs text-[#c1666b] mb-2">{profileError}</p>}
      <div className="flex gap-2">
        <button onClick={handleSaveProfile} disabled={savingProfile} className="flex-1 bg-accent text-bg font-bold text-xs py-2 rounded cursor-pointer disabled:opacity-60">
          {savingProfile ? 'Saving...' : 'Save'}
        </button>
        <button onClick={handleCancelEditProfile} disabled={savingProfile} className="flex-1 bg-transparent border border-border text-text-muted text-xs py-2 rounded cursor-pointer">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default ProfileEditForm
