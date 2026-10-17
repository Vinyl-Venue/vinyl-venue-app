import { useState } from 'react'
import { supabase } from '../supabaseClient'

// State and handlers for the inline "Edit profile" form: display name, band
// name, bio and avatar. `hydrate` fills the inputs from a loaded profile row.
export function useProfileEditor({ viewerId, profile, setProfile }) {
  const [editingProfile, setEditingProfile] = useState(false)
  const [displayNameInput, setDisplayNameInput] = useState('')
  const [bandNameInput, setBandNameInput] = useState('')
  const [bioInput, setBioInput] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')

  function hydrate(profileData) {
    setDisplayNameInput(profileData?.display_name || '')
    setBandNameInput(profileData?.band_name || '')
    setBioInput(profileData?.bio || '')
    setAvatarPreviewUrl(profileData?.avatar_url || '')
  }

  function handleAvatarFileChange(event) {
    const file = event.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  async function handleSaveProfile() {
    setSavingProfile(true)
    setProfileError('')

    let avatarUrl = profile?.avatar_url || null

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${viewerId}/${crypto.randomUUID()}.${fileExt}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile)

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError.message)
        setProfileError('Could not upload that image — try a different file.')
        setSavingProfile(false)
        return
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      avatarUrl = data.publicUrl
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        display_name: displayNameInput.trim() || null,
        band_name: bandNameInput.trim() || null,
        bio: bioInput.trim() || null,
        avatar_url: avatarUrl
      })
      .eq('id', viewerId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Error updating profile:', error.message)
      setProfileError('Something went wrong saving your profile — try again.')
      setSavingProfile(false)
      return
    }

    setProfile(updated)
    setAvatarFile(null)
    setSavingProfile(false)
    setEditingProfile(false)
  }

  function handleCancelEditProfile() {
    hydrate(profile)
    setAvatarFile(null)
    setProfileError('')
    setEditingProfile(false)
  }

  return {
    editingProfile, setEditingProfile,
    displayNameInput, setDisplayNameInput,
    bandNameInput, setBandNameInput,
    bioInput, setBioInput,
    avatarPreviewUrl,
    savingProfile, profileError,
    hydrate,
    handleAvatarFileChange, handleSaveProfile, handleCancelEditProfile
  }
}
