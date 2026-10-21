import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from './Header'
import { supabase } from './supabaseClient'
import { attachRarity, displayNameFor } from './utils'
import { rowToAlbum } from './profile/profileData'
import { computeShelfMetrics, formatMonth } from './profile/profileMetrics'

const monoLabel = 'font-mono text-[10px] tracking-wider uppercase text-text-muted'

function Card({ title, children }) {
  return (
    <div className="bg-surface border border-border p-6 flex flex-col gap-4">
      <h2 className="m-0 font-serif italic font-normal text-2xl">{title}</h2>
      {children}
    </div>
  )
}

function BarRow({ label, n, max, labelWidth = 'w-28' }) {
  return (
    <div className="flex items-center gap-3 text-[13px]">
      <span className={`${labelWidth} flex-shrink-0 truncate`}>{label}</span>
      <div className="flex-1 h-3.5 bg-bg">
        <div className="h-3.5 bg-text" style={{ width: `${max ? Math.round((n / max) * 100) : 0}%` }} />
      </div>
      <span className="w-9 flex-shrink-0 text-right text-text-muted">{n}</span>
    </div>
  )
}

// Collection metrics: what a collector's shelf is made of. Reached by
// clicking the Albums number on a profile. Every album counts, duplicates
// included.
function ProfileMetricsPage() {
  const { userId } = useParams()
  const [profile, setProfile] = useState(null)
  const [albums, setAlbums] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      const { data, error } = await supabase.from('albums').select('*').eq('user_id', userId)
      if (error) console.error('Error loading albums:', error.message)
      const withRarity = await attachRarity((data || []).map(rowToAlbum))
      if (!cancelled) {
        setProfile(profileData)
        setAlbums(withRarity)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  if (albums === null) {
    return (<><Header /><section className="px-10 pb-10"><p>Loading metrics...</p></section></>)
  }

  const m = computeShelfMetrics(albums)
  const name = displayNameFor(profile)
  const maxGenre = Math.max(0, ...m.genres.map(([, n]) => n))
  const maxCondition = Math.max(0, ...m.conditions.map(([, n]) => n))
  const maxDecade = Math.max(0, ...m.decades.map(([, n]) => n))
  const maxGrowth = m.growth.length ? m.growth[m.growth.length - 1].total : 0

  const headline = [
    { n: m.total, l: 'Albums', note: 'Duplicates included' },
    { n: m.uniqueTitles, l: 'Unique titles', note: 'Different albums' },
    { n: m.duplicates, l: 'Duplicates', note: 'Extra copies' },
    { n: m.genreCount, l: 'Genres', note: 'Across the collection' }
  ]

  return (
    <>
      <Header />
      <div className="max-w-[1200px] w-full mx-auto px-5 lg:px-10 pt-8 pb-16 flex flex-col gap-8 font-sans">
        <div className="flex flex-col gap-2">
          <Link to={`/profile/${userId}`} className="text-[13px] text-accent no-underline">← Back to profile</Link>
          <h1 className="m-0 font-serif italic font-normal text-4xl lg:text-[40px] leading-tight">Collection metrics</h1>
          <div className="text-sm text-text-muted">{name} · every album counted, duplicates included</div>
        </div>

        {m.total === 0 ? (
          <div className="border border-dashed border-border-strong p-10 text-center text-sm text-text-muted">No albums on this shelf yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
              {headline.map((h) => (
                <div key={h.l} className="bg-surface px-6 py-5 flex flex-col gap-1">
                  <span className="font-serif text-[34px] leading-tight">{h.n}</span>
                  <span className={monoLabel}>{h.l}</span>
                  <span className="text-xs text-text-faint">{h.note}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-8 items-start">
              <div className="flex-1 basis-[480px] min-w-0 flex flex-col gap-8">
                <Card title="By genre">
                  {m.genres.map(([label, n]) => <BarRow key={label} label={label} n={n} max={maxGenre} labelWidth="w-32" />)}
                </Card>

                {m.decades.length > 0 && (
                  <Card title="By decade">
                    <div className="flex items-end gap-3 h-40">
                      {m.decades.map(([label, n]) => (
                        <div key={label} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                          <span className="text-xs text-text-muted">{n}</span>
                          <div className="w-full bg-accent" style={{ height: `${Math.max(4, Math.round((n / maxDecade) * 100))}%`, maxHeight: '80%' }} />
                          <span className="text-xs">{label}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {m.growth.length > 1 && (
                  <Card title="Collection growth">
                    <div className="flex items-end gap-1.5 h-32 border-b border-border-strong">
                      {m.growth.map((g) => (
                        <div key={g.month} title={`${formatMonth(g.month)}: ${g.total}`} className="flex-1 bg-text" style={{ height: `${Math.round((g.total / maxGrowth) * 100)}%` }} />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>{formatMonth(m.growth[0].month)}</span>
                      <span>{formatMonth(m.growth[m.growth.length - 1].month)}</span>
                    </div>
                  </Card>
                )}
              </div>

              <div className="flex-none w-full lg:w-[360px] max-w-full flex flex-col gap-8">
                {m.conditions.length > 0 && (
                  <Card title="By condition">
                    {m.conditions.map(([label, n]) => <BarRow key={label} label={label} n={n} max={maxCondition} labelWidth="w-24" />)}
                  </Card>
                )}

                {m.rarest.length > 0 && (
                  <Card title="Rarest in the collection">
                    {m.rarest.slice(0, 5).map((a, i) => (
                      <div key={a.id} className="flex items-center gap-3 border-t border-border pt-3">
                        <span className="w-7 flex-shrink-0 font-mono text-[11px] text-accent">#{i + 1}</span>
                        <div className="w-11 h-11 flex-shrink-0 bg-border bg-cover bg-center" style={{ backgroundImage: a.imageUrl ? `url(${a.imageUrl})` : undefined }} />
                        <div className="flex flex-col gap-0.5 text-[13px] min-w-0">
                          <b className="truncate">{a.title}</b>
                          <span className="text-xs text-text-muted truncate">{a.artist}</span>
                        </div>
                      </div>
                    ))}
                    {m.rarest.length > 5 && (
                      <Link to={`/profile/${userId}`} className="text-[13px] text-accent no-underline">View all {Math.min(15, m.rarest.length)} →</Link>
                    )}
                  </Card>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default ProfileMetricsPage
