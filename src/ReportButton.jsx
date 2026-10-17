import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'

const REASONS = [
  { key: 'counterfeit', label: 'Counterfeit or bootleg sold as original' },
  { key: 'misleading', label: 'Misleading description, photos or condition' },
  { key: 'scam', label: 'Looks like a scam or fraud' },
  { key: 'harassment', label: 'Harassment or abusive behaviour' },
  { key: 'inappropriate', label: 'Inappropriate or prohibited content' },
  { key: 'other', label: 'Something else' }
]

// "Report" link plus a small dialog. Used on listings and on other
// people's profiles. Reports go to the moderation queue at /admin/reports.
function ReportButton({ targetType, targetId, label = 'Report', className = '' }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  if (!user) return null

  function close() {
    setOpen(false)
    setReason('')
    setDetails('')
    setMessage('')
    setSaving(false)
  }

  async function submit(e) {
    e.preventDefault()
    if (!reason) {
      setMessage('Choose what is wrong first.')
      return
    }
    setSaving(true)
    setMessage('')
    const { error } = await supabase.from('reports').insert({
      target_type: targetType,
      target_id: String(targetId),
      reason,
      details: details.trim() || null
    })
    setSaving(false)
    if (error && error.code !== '23505') {
      setMessage('Could not send your report. Please try again.')
      return
    }
    // 23505 means you already reported this; treat it as done.
    setSent(true)
    close()
  }

  if (sent) {
    return <span className={`text-xs text-text-faint font-sans ${className}`}>Reported. Thank you.</span>
  }

  const noun = targetType === 'listing' ? 'listing' : 'person'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`bg-transparent border-0 p-0 text-xs text-text-faint hover:text-accent cursor-pointer font-sans underline ${className}`}
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Report this ${noun}`}
          onClick={(e) => { if (e.target === e.currentTarget) close() }}
        >
          <form onSubmit={submit} className="bg-bg border border-border rounded-lg w-full max-w-md p-5 font-sans">
            <div className="bg-text inline-block px-2.5 py-1 mb-3">
              <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">Report this {noun}</span>
            </div>
            <p className="text-xs text-text-muted mt-0 mb-3">
              Reports go to the Vinyl Venue team. The {noun} is not told who reported them.
            </p>

            <fieldset className="border-0 p-0 m-0 mb-3">
              <legend className="sr-only">Reason</legend>
              {REASONS.map((r) => (
                <label key={r.key} className="flex items-start gap-2 py-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.key}
                    checked={reason === r.key}
                    onChange={() => setReason(r.key)}
                    className="mt-1"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </fieldset>

            <label className="block text-xs text-text-muted mb-1" htmlFor="report-details">
              Anything else we should know? (optional)
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              rows={3}
              className="w-full bg-surface border border-border rounded p-2 text-sm text-text font-sans"
            />

            {message && <p className="text-xs text-accent mt-2 mb-0">{message}</p>}

            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={close}
                className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-accent text-bg border-0 px-4 py-1.5 rounded text-xs font-medium cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Sending…' : 'Send report'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

export default ReportButton