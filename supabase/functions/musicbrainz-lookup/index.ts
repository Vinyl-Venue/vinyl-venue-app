// Looks up releases on MusicBrainz by barcode, as a second opinion next to Discogs.
// MusicBrainz asks for a descriptive User-Agent and at most ~1 request/second.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}
const UA = 'VinylVenue/1.0 (https://vinyl-venue-app.vercel.app)'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const url = new URL(req.url)
  const barcode = (url.searchParams.get('barcode') || '').replace(/\D/g, '')
  if (!barcode) return json({ releases: [] })

  // UPC-A (12) and EAN-13 (leading 0) are the same code; try both.
  const variants = [...new Set([barcode, barcode.length === 12 ? `0${barcode}` : barcode.length === 13 && barcode.startsWith('0') ? barcode.slice(1) : barcode])]
  const seen = new Set<string>()
  const releases: any[] = []
  try {
    for (let i = 0; i < variants.length; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1100))
      const res = await fetch(
        `https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(`barcode:${variants[i]}`)}&fmt=json&limit=25`,
        { headers: { 'User-Agent': UA, Accept: 'application/json' } }
      )
      if (!res.ok) return json({ releases, error: `MusicBrainz lookup failed (${res.status})` }, 502)
      const data = await res.json()
      for (const r of data.releases || []) {
        if (seen.has(r.id)) continue
        seen.add(r.id)
        const events = r['release-events'] || []
        const countries = [r.country, ...events.map((e: any) => e.area?.['iso-3166-1-codes']?.[0])].filter(Boolean)
        const labelInfo = r['label-info'] || []
        releases.push({
          id: r.id,
          title: r.title || '',
          artist: (r['artist-credit'] || []).map((a: any) => a.name).join(''),
          date: r.date || events[0]?.date || '',
          country: countries[0] || '',
          barcode: r.barcode || '',
          labels: labelInfo.map((l: any) => l.label?.name).filter(Boolean),
          catnos: labelInfo.map((l: any) => l['catalog-number']).filter(Boolean),
          formats: (r.media || []).map((m: any) => m.format).filter(Boolean),
          status: r.status || ''
        })
      }
    }
    return json({ releases })
  } catch (err) {
    return json({ releases, error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
