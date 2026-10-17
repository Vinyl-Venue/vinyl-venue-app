import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import NotFoundPage from './NotFoundPage'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { displayNameFor, timeAgo } from './utils'
import { SkeletonRows } from './Skeleton'

const REASON_LABELS = {
  counterfeit: 'Counterfeit or bootleg',
  misleading: 'Misleading listing',
  scam: 'Scam or fraud',
  harassment: 'Harassment',
  inappropriate: 'Inappropriate content',
  other: 'Other'
}

// Moderation queue. Only people in the admins table can see it; anyone
// else gets the ordinary not-found page, so it does not advertise itself.
function AdminReportsPage() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(null)
  const [tab, setTab] = useState('open')
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function check() {
      const { data } = await supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
      setIsAdmin(!!data)
    }
    check()
  }, [user.id])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const query = supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(100)
    const { data: reports, error: reportsError } = await (tab === 'open' ? query.eq('status', 'open') : query.neq('status', 'open'))
    if (reportsError) {
      setError('Could not load reports.')
      setLoading(false)
      return
    }
    const list = reports || []

    const listingIds = [...new Set(list.filter((r) => r.target_type === 'listing').map((r) => Number(r.target_id)))]
    const { data: listings } = listingIds.length > 0
      ? await supabase.from('listings').select('id, title, artist, image_url, status, listing_type, user_id').in('id', listingIds)
      : { data: [] }
    const listingById = new Map((listings || []).map((l) => [l.id, l]))

    const profileIds = new Set()
    for (const r of list) {
      profileIds.add(r.reporter_id)
      if (r.target_type === 'profile') profileIds.add(r.target_id)
    }
    for (const l of listings || []) profileIds.add(l.user_id)
    const { data: profiles } = profileIds.size > 0
      ? await supabase.from('profiles').select('id, display_name').in('id', [...profileIds])
      : { data: [] }
    const profileById = new Map((profiles || []).map((p) => [p.id, p]))

    setRows(list.map((r) => ({
      ...r,
      reporter: profileById.get(r.reporter_id),
      listing: r.target_type === 'listing' ? listingById.get(Number(r.target_id)) : null,
      person: r.target_type === 'profile' ? profileById.get(r.target_id) : null,
      sellerProfile: r.target_type === 'listing' ? profileById.get(listingById.get(Number(r.target_id))?.user_id) : null
    })))
    setLoading(false)
  }, [tab])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  async function resolveTarget(report, status) {
    return supabase
      .from('reports')
      .update({ status, resolved_by: user.id, resolved_at: new Date().toISOString() })
      .eq('target_type', report.target_type)
      .eq('target_id', report.target_id)
      .eq('status', 'open')
  }

  async function removeListing(report) {
    setBusyId(report.id)
    setError('')
    const { error: listingError } = await supabase.from('listings').update({ status: 'cancelled' }).eq('id', Number(report.target_id))
    if (listingError) {
      setError('Could not remove that listing.')
      setBusyId(null)
      return
    }
    await resolveTarget(report, 'actioned')
    setConfirmId(null)
    setBusyId(null)
    load()
  }

  async function mark(report, status) {
    setBusyId(report.id)
    setError('')
    const { error: updateError } = await resolveTarget(report, status)
    if (updateError) setError('Could not update that report.')
    setBusyId(null)
    load()
  }

  if (isAdmin === null) return null
  if (!isAdmin) return <NotFoundPage />

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />
      <main className="max-w-[820px] mx-auto px-5 lg:px-10 py-6 pb-24 lg:pb-10 font-sans">
        <h1 className="font-serif italic font-normal text-3xl mt-0 mb-1">Reports</h1>
        <p className="text-xs text-text-faint mt-0 mb-4">
          Removing a listing cancels it for everyone, including any live bids. Reports on the same listing or person are closed together.
        </p>

        <div className="flex gap-2 mb-5">
          {[['open', 'Open'], ['handled', 'Handled']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${
                tab === key ? 'bg-accent text-bg border-accent' : 'bg-surface text-text-muted border-border hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-accent">{error}</p>}
        {loading && <SkeletonRows count={3} />}

        {!loading && rows.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-6 text-center">
            <p className="font-serif italic text-text-muted m-0">{tab === 'open' ? 'Nothing to review' : 'No handled reports yet'}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {!loading && rows.map((r) => {
            const isListing = r.target_type === 'listing'
            const busy = busyId === r.id
            return (
              <div key={r.id} className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <span className="bg-text inline-block px-2 py-0.5">
                    <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">{REASON_LABELS[r.reason] || r.reason}</span>
                  </span>
                  <span className="text-[11px] text-text-faint">
                    {timeAgo(r.created_at)} · reported by {displayNameFor(r.reporter)}
                  </span>
                </div>

                {isListing ? (
                  <div className="flex gap-3 items-center">
                    {r.listing?.image_url && <img src={r.listing.image_url} alt="" className="w-14 h-14 object-cover rounded" />}
                    <div className="min-w-0">
                      {r.listing ? (
                        <>
                          <p className="m-0 text-sm font-medium truncate">{r.listing.title}</p>
                          <p className="m-0 text-xs text-text-muted truncate">
                            {r.listing.artist} · {r.listing.listing_type} · {r.listing.status} · seller{' '}
                            <Link to={`/profile/${r.listing.user_id}`} className="text-text-muted">{displayNameFor(r.sellerProfile)}</Link>
                          </p>
                        </>
                      ) : (
                        <p className="m-0 text-sm text-text-muted">Listing {r.target_id} no longer exists.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="m-0 text-sm">
                    Person:{' '}
                    <Link to={`/profile/${r.target_id}`} className="text-text">{displayNameFor(r.person)}</Link>
                  </p>
                )}

                {r.details && <p className="text-sm text-text-muted mt-2 mb-0">&ldquo;{r.details}&rdquo;</p>}

                {r.status === 'open' ? (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {isListing && r.listing && r.listing.status === 'active' && (
                      confirmId === r.id ? (
                        <>
                          <button disabled={busy} onClick={() => removeListing(r)} className="bg-accent text-bg border-0 px-3 py-1.5 rounded text-xs font-medium cursor-pointer disabled:opacity-60">
                            {busy ? 'Removing…' : r.listing.listing_type === 'auction' ? 'Confirm: cancel auction' : 'Confirm: remove listing'}
                          </button>
                          <button onClick={() => setConfirmId(null)} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs cursor-pointer">Keep it</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmId(r.id)} className="bg-transparent border border-accent text-accent px-3 py-1.5 rounded text-xs cursor-pointer">Remove listing</button>
                      )
                    )}
                    {!isListing && (
                      <Link to={`/messages/${r.target_id}`} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs no-underline">Message them</Link>
                    )}
                    {(!isListing || !r.listing || r.listing.status !== 'active') && (
                      <button disabled={busy} onClick={() => mark(r, 'actioned')} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs cursor-pointer">Mark handled</button>
                    )}
                    <button disabled={busy} onClick={() => mark(r, 'dismissed')} className="bg-transparent border border-border text-text-muted px-3 py-1.5 rounded text-xs cursor-pointer">Dismiss</button>
                  </div>
                ) : (
                  <p className="text-[11px] text-text-faint mt-3 mb-0">
                    {r.status === 'actioned' ? 'Handled' : 'Dismissed'} {r.resolved_at ? timeAgo(r.resolved_at) : ''}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default AdminReportsPage