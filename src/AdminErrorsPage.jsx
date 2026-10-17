import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from './Header'
import NotFoundPage from './NotFoundPage'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { useIsAdmin } from './useIsAdmin'
import { timeAgo } from './utils'
import { SkeletonRows } from './Skeleton'

const KIND_LABELS = { render: 'Page crashed', runtime: 'Script error', promise: 'Failed request' }

// Groups repeats of the same message so one bug shows up once with a count.
function groupErrors(rows) {
  const groups = new Map()
  for (const row of rows) {
    const key = `${row.kind}:${row.message}`
    const group = groups.get(key)
    if (group) {
      group.count += 1
    } else {
      groups.set(key, { ...row, count: 1 })
    }
  }
  return [...groups.values()]
}

// Recent errors reported by people's browsers. Admin-only; everyone else
// gets the ordinary not-found page.
function AdminErrorsPage() {
  const { user } = useAuth()
  const isAdmin = useIsAdmin(user.id)
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    async function load() {
      const { data, error: loadError } = await supabase
        .from('client_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (loadError) setError('Could not load the error log.')
      setGroups(groupErrors(data || []))
      setLoading(false)
    }
    load()
  }, [isAdmin])

  if (isAdmin === null) return null
  if (!isAdmin) return <NotFoundPage />

  return (
    <div className="min-h-screen bg-bg text-text">
      <Header />
      <main className="max-w-[820px] mx-auto px-5 lg:px-10 py-6 pb-24 lg:pb-10 font-sans">
        <h1 className="font-serif italic font-normal text-3xl mt-0 mb-1">Errors</h1>
        <p className="text-xs text-text-faint mt-0 mb-4">
          Problems people's browsers ran into, newest first, with repeats grouped. <Link to="/admin/reports" className="text-text-muted">Back to reports</Link>
        </p>

        {error && <p className="text-xs text-accent">{error}</p>}
        {loading && <SkeletonRows count={3} />}

        {!loading && groups.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-6 text-center">
            <p className="font-serif italic text-text-muted m-0">No errors reported</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.id} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <span className="bg-text inline-block px-2 py-0.5">
                  <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-bg">{KIND_LABELS[group.kind] || group.kind}</span>
                </span>
                <span className="text-[11px] text-text-faint">
                  {group.count > 1 ? `${group.count} times · ` : ''}latest {timeAgo(group.created_at)}
                </span>
              </div>
              <p className="m-0 text-sm font-medium break-words">{group.message}</p>
              <p className="m-0 mt-1 text-xs text-text-muted break-all">{group.url}</p>
              {group.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-text-faint cursor-pointer">Details</summary>
                  <pre className="text-[11px] text-text-muted whitespace-pre-wrap break-words mt-2 mb-0">{group.stack}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default AdminErrorsPage
