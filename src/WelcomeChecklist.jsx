import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

const DISMISS_KEY_PREFIX = 'vinylVenue.onboardingDismissed.'

// A brand-new signup lands on an empty shelf with no bridge to the rest
// of the app — Discover and Marketplace are full of (demo) activity, but
// nothing on the shelf itself points a first-time user there. This closes
// that gap with three trackable steps, computed from data that already
// exists (no new columns needed) rather than a separate "onboarding
// completed" flag, so it can't get out of sync with what the person
// actually did. Dismissal is per-browser (localStorage) rather than a DB
// write — this is a soft nudge, not something that needs to follow the
// person across devices, and a stray re-show on a new device is a far
// smaller cost than a schema migration for it.
function WelcomeChecklist({ userId, albumCount, activeListingsCount }) {
  const [followingCount, setFollowingCount] = useState(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    let stored = false
    try {
      stored = localStorage.getItem(DISMISS_KEY_PREFIX + userId) === 'true'
    } catch {
      // Private browsing / quota — fall through to showing it; worst
      // case it reappears next visit, which is harmless here.
    }
    setDismissed(stored)
  }, [userId])

  useEffect(() => {
    async function loadFollowingCount() {
      const { count } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId)

      setFollowingCount(count || 0)
    }

    loadFollowingCount()
  }, [userId])

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY_PREFIX + userId, 'true')
    } catch {
      // Non-critical — worst case the card comes back next visit.
    }
  }

  const steps = [
    {
      done: albumCount > 0,
      label: 'Add your first record',
      detail: 'Use + Add album, or scan a whole shelf section at once with Scan Crate.'
    },
    {
      done: followingCount != null && followingCount > 0,
      label: 'Follow a few collectors',
      detail: 'Discover is full of people to follow — their shelves and posts show up here once you do.',
      to: '/discover'
    },
    {
      done: (activeListingsCount || 0) > 0,
      label: 'List something for sale or trade',
      detail: 'Pick any album on your shelf and list it — or set a listing while you Scan Crate.'
    }
  ]

  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length

  // Once every step is genuinely complete, there's nothing left for this
  // card to do — it clears itself rather than waiting for a manual
  // dismiss, so a returning active user never has to think about it
  // again.
  useEffect(() => {
    if (allDone && followingCount != null) dismiss()
  }, [allDone, followingCount])

  if (dismissed || followingCount === null) return null

  return (
    <div className="bg-surface border border-border rounded-lg p-5 mb-6 font-sans relative">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-text-faint bg-transparent border-0 cursor-pointer hover:text-text text-lg leading-none"
      >
        ×
      </button>

      <p className="font-serif italic text-lg text-text mb-0.5">Welcome to Vinyl Venue</p>
      <p className="text-xs text-text-muted mb-4">
        {completedCount} of {steps.length} done — a few things to get the most out of it:
      </p>

      <div className="flex flex-col gap-2.5">
        {steps.map((step) => (
          <div key={step.label} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                step.done ? 'bg-accent border-accent text-bg' : 'border-border text-transparent'
              }`}
            >
              ✓
            </span>
            <div className="min-w-0">
              <p className={`m-0 text-sm ${step.done ? 'text-text-faint line-through' : 'text-text font-bold'}`}>
                {step.to && !step.done ? (
                  <Link to={step.to} className="text-text no-underline hover:text-accent">{step.label}</Link>
                ) : (
                  step.label
                )}
              </p>
              {!step.done && <p className="m-0 text-xs text-text-muted mt-0.5">{step.detail}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WelcomeChecklist