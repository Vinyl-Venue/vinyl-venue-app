// Type-ahead suggestions from the Discogs catalogue for the Add Album form.
// field=title  -> albums (Discogs "masters") whose title matches, optionally limited to an artist
// field=artist -> artists matching the text; when a title is also given, only artists who made that title

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}
const UA = 'VinylVenue/1.0 +https://vinyl-venue-app.vercel.app'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
const clean = (s: string) => (s || '').replace(/\s\(\d+\)$/, '').trim()

// Discogs master titles come back as "Artist - Title".
function splitTitle(full: string) {
  const i = (full || '').indexOf(' - ')
  if (i < 0) return { artist: '', title: full || '' }
  return { artist: clean(full.slice(0, i)), title: full.slice(i + 3).trim() }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const token = Deno.env.get('DISCOGS_TOKEN')
  if (!token) return json({ error: 'Discogs token not configured on the server.' }, 500)

  const url = new URL(req.url)
  const field = url.searchParams.get('field') === 'artist' ? 'artist' : 'title'
  const title = (url.searchParams.get('title') || '').trim()
  const artist = (url.searchParams.get('artist') || '').trim()
  const text = field === 'title' ? title : artist
  if (text.length < 2) return json({ items: [] })

  async function search(params: Record<string, string>) {
    const p = new URLSearchParams({ token, per_page: '20', ...params })
    const res = await fetch(`https://api.discogs.com/database/search?${p.toString()}`, { headers: { 'User-Agent': UA } })
    if (!res.ok) throw new Error(`Discogs suggest failed (${res.status})`)
    return (await res.json()).results || []
  }

  try {
    // Artists with no album typed yet: plain artist search.
    if (field === 'artist' && !title) {
      const rows = await search({ type: 'artist', q: artist, per_page: '12' })
      const items = rows.map((r: any) => ({ kind: 'artist', artist: clean(r.title), thumb: r.thumb || '' }))
      return json({ items })
    }

    // Albums (masters). Title typed, and/or artist typed.
    const params: Record<string, string> = { type: 'master' }
    if (title) params.release_title = title
    if (artist) params.artist = artist
    let rows = await search(params)
    if (rows.length === 0 && field === 'title') rows = await search({ type: 'master', q: title })

    const seen = new Set<string>()
    const albums: any[] = []
    for (const r of rows) {
      const { artist: a, title: t } = splitTitle(r.title)
      const key = `${a.toLowerCase()}|${t.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      albums.push({
        kind: 'album',
        masterId: r.master_id || r.id,
        title: t,
        artist: a,
        year: r.year || '',
        thumb: r.thumb || ''
      })
    }

    if (field === 'artist') {
      // Distinct artists who made an album with that title.
      const names = new Set<string>()
      const items: any[] = []
      for (const al of albums) {
        if (!al.artist || names.has(al.artist.toLowerCase())) continue
        names.add(al.artist.toLowerCase())
        items.push({ kind: 'artist', artist: al.artist, thumb: al.thumb, title: al.title, year: al.year, masterId: al.masterId })
      }
      return json({ items })
    }
    return json({ items: albums })
  } catch (err) {
    return json({ items: [], error: err instanceof Error ? err.message : 'Unknown error' }, 502)
  }
})
