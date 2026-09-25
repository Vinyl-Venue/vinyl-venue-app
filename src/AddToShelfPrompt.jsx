import { useState } from 'react'
import { supabase } from './supabaseClient'

// Reused everywhere someone acquires an album through the platform
// rather than adding it manually — a completed purchase, an accepted
// trade (on both sides), or winning an auction. "Yes" copies what the
// listing actually carries (title/artist/year/genre/label/pressing
// country/condition) straight onto a new albums row. Tracklist and
// credits aren't included — those only ever lived on the *previous*
// owner's albums row, not the listing itself — so the new owner would
// still look those up via the same "Find on Discogs" flow every other
// album already uses.
function AddToShelfPrompt({ item, userId, onDone }) {
  const [step, setStep] = useState('asking')
  const [saving, setSaving] = useState(false)

  async function handleYes() {
    setSaving(true)

    const { error } = await supabase.from('albums').insert({
      user_id: userId,
      title: item.title,
      artist: item.artist,
      year: item.year,
      genre: item.genre,
      image_url: item.imageUrl,
      sleeve_condition: item.sleeveCondition,
      media_condition: item.mediaCondition,
      label: item.label,
      pressing_country: item.pressingCountry
    })

    setSaving(false)

    if (error) {
      console.error('Error adding to shelf:', error.message)
    }

    setStep('added')
  }

  function handleNo() {
    setStep('declined')
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5 font-sans max-w-sm">
      {step === 'asking' && (
        <>
          <div className="flex items-center gap-3 mb-3">
            <img
              src={item.imageUrl || "https://placehold.co/60x60/1c1a15/a8a29a?text=%20"}
              alt=""
              className="w-14 h-14 object-cover rounded flex-shrink-0"
            />
            <div>
              <p className="font-serif italic text-base text-text m-0">{item.title}</p>
              <p className="text-text-muted text-xs m-0">{item.artist}</p>
            </div>
          </div>
          <p className="text-sm text-text mb-4">
            Add this to your shelf?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleYes}
              disabled={saving}
              className="flex-1 bg-accent text-bg font-bold text-sm py-2 rounded cursor-pointer disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Yes, add it'}
            </button>
            <button
              onClick={handleNo}
              disabled={saving}
              className="flex-1 bg-transparent border border-border text-text-muted text-sm py-2 rounded cursor-pointer"
            >
              Not now
            </button>
          </div>
        </>
      )}

      {step === 'added' && (
        <>
          <p className="text-sm text-accent mb-3">Added to your shelf.</p>
          <button
            onClick={onDone}
            className="w-full bg-transparent border border-border text-text-muted text-sm py-2 rounded cursor-pointer"
          >
            Done
          </button>
        </>
      )}

      {step === 'declined' && (
        <>
          <p className="text-sm text-text-muted mb-3">
            Don't forget to add your new album to your shelf so it's up to date.
          </p>
          <button
            onClick={onDone}
            className="w-full bg-transparent border border-border text-text-muted text-sm py-2 rounded cursor-pointer"
          >
            Done
          </button>
        </>
      )}
    </div>
  )
}

export default AddToShelfPrompt