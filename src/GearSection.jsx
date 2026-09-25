import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import SelectWithCustom from './SelectWithCustom'
import SetupReactions from './SetupReactions'

const CATEGORY_OPTIONS = [
  'Turntable', 'Cartridge', 'Phono Stage', 'Preamp', 'Amp', 'Speakers', 'DAC', 'Cables'
]

// "My Setup" — spec-sheet style: photo alongside a clean labeled table,
// a listening-space photo gallery and a free-text notes field for
// anything that doesn't fit a specific component. Sits with the rest
// of the identity-area sections but is ungated (visible regardless of
// follow status) since it doesn't depend on collection data.
function GearSection({ userId, isOwnProfile, profile, onUpdated }) {
  const { user } = useAuth()

  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [addingItem, setAddingItem] = useState(false)
  const [categoryInput, setCategoryInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [savingItem, setSavingItem] = useState(false)

  const [editingNotes, setEditingNotes] = useState(false)
  const [notesInput, setNotesInput] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const [photos, setPhotos] = useState([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchItems()
    fetchPhotos()
  }, [userId])

  async function fetchItems() {
    setItemsLoading(true)
    const { data, error } = await supabase
      .from('gear_items')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching gear items:', error.message)
      setItemsLoading(false)
      return
    }

    setItems(data || [])
    setItemsLoading(false)
  }

  async function fetchPhotos() {
    setPhotosLoading(true)
    const { data, error } = await supabase
      .from('listening_space_photos')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching listening space photos:', error.message)
      setPhotosLoading(false)
      return
    }

    setPhotos(data || [])
    setActivePhotoIndex(0)
    setPhotosLoading(false)
  }

  function openAddItemForm() {
    setAddingItem(true)
    setCategoryInput('')
    setNameInput('')
  }

  async function handleAddItem() {
    if (!categoryInput.trim() || !nameInput.trim()) return

    setSavingItem(true)

    const { error } = await supabase.from('gear_items').insert({
      user_id: userId,
      category: categoryInput.trim(),
      name: nameInput.trim(),
      sort_order: items.length
    })

    setSavingItem(false)

    if (error) {
      console.error('Error adding gear item:', error.message)
      return
    }

    setAddingItem(false)
    fetchItems()
  }

  async function handleDeleteItem(itemId) {
    const { error } = await supabase.from('gear_items').delete().eq('id', itemId)
    if (error) {
      console.error('Error deleting gear item:', error.message)
      return
    }
    setItems((current) => current.filter((i) => i.id !== itemId))
  }

  // Swaps sort_order with the neighbor in the given direction and
  // persists both rows — the chain's order is the whole point of the
  // diagram, so reordering has to actually save, not just reorder
  // locally until the next refresh undoes it.
  async function handleMove(index, direction) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= items.length) return

    const current = items[index]
    const target = items[targetIndex]

    const reordered = [...items]
    reordered[index] = target
    reordered[targetIndex] = current
    setItems(reordered)

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from('gear_items').update({ sort_order: targetIndex }).eq('id', current.id),
      supabase.from('gear_items').update({ sort_order: index }).eq('id', target.id)
    ])

    if (e1 || e2) {
      console.error('Error reordering gear items:', e1?.message || e2?.message)
      fetchItems()
    }
  }

  function startEditingNotes() {
    setNotesInput(profile?.gear_notes || '')
    setEditingNotes(true)
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    const patch = { gear_notes: notesInput.trim() || null }
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
    setSavingNotes(false)

    if (error) {
      console.error('Error saving gear notes:', error.message)
      return
    }

    setEditingNotes(false)
    onUpdated(patch)
  }

  async function handleUploadPhotos(event) {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    setUploading(true)

    let nextSortOrder = photos.length
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('listening-space-photos')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Error uploading listening space photo:', uploadError.message)
        continue
      }

      const { data: urlData } = supabase.storage.from('listening-space-photos').getPublicUrl(fileName)

      const { error: insertError } = await supabase.from('listening_space_photos').insert({
        user_id: userId,
        image_url: urlData.publicUrl,
        sort_order: nextSortOrder
      })
      if (insertError) console.error('Error saving listening space photo:', insertError.message)

      nextSortOrder += 1
    }

    setUploading(false)
    fetchPhotos()
    event.target.value = ''
  }

  async function handleDeletePhoto(photoId) {
    const { error } = await supabase.from('listening_space_photos').delete().eq('id', photoId)
    if (error) {
      console.error('Error deleting listening space photo:', error.message)
      return
    }
    setPhotos((current) => {
      const next = current.filter((p) => p.id !== photoId)
      setActivePhotoIndex((i) => Math.min(i, Math.max(next.length - 1, 0)))
      return next
    })
  }

  const hasNotes = !!profile?.gear_notes
  const hasAnything = items.length > 0 || hasNotes || photos.length > 0

  if (!isOwnProfile && !itemsLoading && !photosLoading && !hasAnything) return null

  return (
    <div className="mb-8 font-sans">
      <div className="bg-text inline-block px-2.5 py-1 mb-1">
        <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">My Setup</span>
      </div>
      <p className="text-xs text-text-faint mb-3">What you're actually listening on.</p>

      {(photos.length > 0 || items.length > 0 || isOwnProfile) && (
        <div className="bg-surface border border-border rounded-lg p-4 max-w-4xl mb-3">
          {/* Stacks on mobile (photo full-width on top, gear list below);
              side-by-side from md up. Both children get min-w-0 so
              neither one's intrinsic content width can force the row to
              overflow the viewport. */}
          <div className="flex flex-col md:flex-row gap-5">
            {/* Listening space photos — primary photo large, additional
                photos shown smaller to its right rather than as a
                thumbnail strip underneath. Clicking a smaller photo swaps
                it into the primary spot. */}
            {!photosLoading && photos.length > 0 && (
              <div className="flex flex-col gap-2 min-w-0 md:flex-shrink-0">
                <img
                  src={photos[activePhotoIndex].image_url}
                  alt=""
                  className="w-full aspect-square md:w-96 md:h-96 object-cover rounded border border-border"
                />
                {photos.length > 1 && (
                  <div className="flex gap-1.5 flex-wrap max-w-full md:max-w-96">
                    {photos.map((photo, i) => (
                      i === activePhotoIndex ? null : (
                        <img
                          key={photo.id}
                          src={photo.image_url}
                          alt=""
                          onClick={() => setActivePhotoIndex(i)}
                          className="w-14 h-14 object-cover rounded cursor-pointer border border-border hover:border-accent flex-shrink-0"
                        />
                      )
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dot-leader listing — label, dotted leader, value — the same
                convention as a newspaper stock or classified listings
                page. Reorder/delete controls stay hidden until a row is
                hovered (always visible on mobile, since there's no
                hover state to reveal them there). Full width on mobile,
                fixed 340px from md up so it doesn't stretch to match an
                unusually wide photo. */}
            {!itemsLoading && items.length > 0 && (
              <div className="min-w-0 w-full md:w-[340px] md:flex-shrink-0">
                {items.map((item, i) => (
                  <div key={item.id} className="group flex items-baseline gap-1.5 py-1.5">
                    <span className="text-sm text-text-muted whitespace-nowrap">{item.category}</span>
                    <span className="flex-1 border-b border-dotted border-border mb-[3px]"></span>
                    <span className="text-sm text-text font-bold whitespace-nowrap">{item.name}</span>
                    {isOwnProfile && (
                      <span className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => handleMove(i, -1)}
                          disabled={i === 0}
                          className="text-text-faint text-[11px] leading-none bg-transparent border-0 cursor-pointer hover:text-accent disabled:opacity-20"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-text-faint text-[11px] leading-none bg-transparent border-0 cursor-pointer hover:text-accent"
                        >
                          ×
                        </button>
                        <button
                          onClick={() => handleMove(i, 1)}
                          disabled={i === items.length - 1}
                          className="text-text-faint text-[11px] leading-none bg-transparent border-0 cursor-pointer hover:text-accent disabled:opacity-20"
                        >
                          ↓
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isOwnProfile && (
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {photos.length > 0 && !photosLoading && (
                <button
                  onClick={() => handleDeletePhoto(photos[activePhotoIndex].id)}
                  className="text-[10px] text-text-faint bg-transparent border-0 cursor-pointer hover:text-accent"
                >
                  Remove this photo
                </button>
              )}
              <label className="text-[10px] uppercase tracking-wider text-accent bg-transparent border border-border rounded px-2.5 py-1.5 cursor-pointer hover:border-accent">
                {uploading ? 'Uploading...' : '+ Add listening space photo'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadPhotos}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {isOwnProfile && (
            addingItem ? (
              <div className="bg-bg border border-border rounded p-3 mt-3 max-w-xs">
                <div className="mb-2">
                  <SelectWithCustom
                    placeholder="Category — e.g. Amp"
                    value={categoryInput}
                    onChange={setCategoryInput}
                    options={CATEGORY_OPTIONS}
                  />
                </div>
                <input
                  type="text"
                  placeholder="What is it? — e.g. Pass Labs XA30.8"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-surface border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddItem}
                    disabled={savingItem || !categoryInput.trim() || !nameInput.trim()}
                    className="bg-accent text-bg border-0 px-3 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-60"
                  >
                    {savingItem ? 'Adding...' : 'Add item'}
                  </button>
                  <button
                    onClick={() => setAddingItem(false)}
                    disabled={savingItem}
                    className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={openAddItemForm}
                className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer mt-3"
              >
                + Add to your setup
              </button>
            )
          )}
        </div>
      )}

      {/* Notes */}
      {editingNotes ? (
        <div className="bg-surface border border-border rounded p-3 mb-3">
          <textarea
            placeholder="Anything else worth mentioning (optional)"
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            rows={2}
            className="w-full bg-bg border border-border text-text px-2.5 py-1.5 rounded text-sm mb-2 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="bg-accent text-bg border-0 px-3 py-1.5 rounded text-xs font-bold cursor-pointer disabled:opacity-60"
            >
              {savingNotes ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditingNotes(false)}
              disabled={savingNotes}
              className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          {hasNotes && <p className="text-xs text-text-faint italic mb-1">{profile.gear_notes}</p>}
          {isOwnProfile && (
            <button
              onClick={startEditingNotes}
              className="text-[10px] uppercase tracking-wider text-accent bg-transparent border-0 cursor-pointer"
            >
              {hasNotes ? 'Edit notes' : '+ Add a note'}
            </button>
          )}
        </div>
      )}

      <SetupReactions
        profileUserId={userId}
        currentUserId={user.id}
        isOwnProfile={isOwnProfile}
      />
    </div>
  )
}

export default GearSection