// Proxies Discogs API calls server-side so the personal access token never
// reaches the browser, and to avoid relying on Discogs' CORS behavior which
// has a history of intermittent breakage for direct client-side requests.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const DISCOGS_USER_AGENT = 'VinylVenue/1.0 +https://vinyl-venue-app.vercel.app'

// Discogs "descriptions" that say something about the edition rather than
// the shape of the record.
const EDITION_TERMS = [
  'Reissue', 'Remastered', 'Repress', 'Limited Edition', 'Special Edition', 'Deluxe Edition',
  'Numbered', 'Club Edition', 'Promo', 'Test Pressing', 'Unofficial Release', 'Misprint',
  '180 Gram', '200 Gram', 'Gatefold', 'Mono', 'Picture Disc', 'Colored Vinyl'
]

// Maps Discogs' format block onto the format options the app offers.
function formatOption(format: any): string {
  if (!format) return ''
  const d: string[] = format.descriptions || []
  const qty = Number(format.qty) || 1
  if (d.includes('Box Set')) return 'Box set'
  if (d.includes('Picture Disc')) return 'Picture disc'
  if (d.includes('7"')) return 'Single, 7"'
  if (d.includes('10"')) return '10"'
  if (d.includes('EP')) return 'EP, 12"'
  if (d.includes('Single') || d.includes('Maxi-Single')) return 'Single, 12"'
  if (d.includes('LP') || d.includes('Album')) return qty === 2 ? '2xLP' : qty > 2 ? '3xLP+' : 'LP, 12"'
  return ''
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const token = Deno.env.get('DISCOGS_TOKEN')
  if (!token) {
    return new Response(JSON.stringify({ error: 'Discogs token not configured on the server.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const discogsHeaders = { 'User-Agent': DISCOGS_USER_AGENT }

  try {
    if (action === 'search') {
      const title = url.searchParams.get('title') || ''
      const artist = url.searchParams.get('artist') || ''
      // Structured fields, matched to Discogs' actual search API params
      // (release_title, artist, label, year, country, format) instead of
      // fuzzy full-text search. Discogs' structured matching is
      // meaningfully more precise once you actually know these values.
      const label = url.searchParams.get('label') || ''
      const year = url.searchParams.get('year') || ''
      const country = url.searchParams.get('country') || ''
      const barcode = (url.searchParams.get('barcode') || '').replace(/\D/g, '')

      // format defaults to Vinyl when the caller doesn't specify one at
      // all — this is a vinyl-only platform, so unfiltered Discogs search
      // was surfacing CD/cassette/etc pressings ahead of the vinyl one
      // someone actually owns. A caller can still pass format= (empty)
      // to explicitly search all formats, or a specific format to
      // override the default.
      const format = url.searchParams.has('format') ? url.searchParams.get('format') : 'Vinyl'

      if (!title && !artist && !barcode) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const params = new URLSearchParams()
      params.set('type', 'release')
      params.set('token', token)
      params.set('per_page', '25')
      if (title) params.set('release_title', title)
      if (artist) params.set('artist', artist)
      if (label) params.set('label', label)
      if (year) params.set('year', year)
      if (country) params.set('country', country)
      if (barcode) params.set('barcode', barcode)
      if (format) params.set('format', format)

      const searchUrl = `https://api.discogs.com/database/search?${params.toString()}`
      const res = await fetch(searchUrl, { headers: discogsHeaders })

      if (!res.ok) {
        return new Response(JSON.stringify({ error: `Discogs search failed (${res.status})` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const data = await res.json()
      const results = (data.results || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        year: r.year,
        thumb: r.thumb,
        format: (r.format || []).join(', '),
        country: r.country,
        label: (r.label || [])[0] || '',
        catno: r.catno || '',
        masterId: r.master_id || null
      }))

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'release') {
      const id = url.searchParams.get('id')
      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing release id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const releaseUrl = `https://api.discogs.com/releases/${id}?token=${token}`
      const res = await fetch(releaseUrl, { headers: discogsHeaders })

      if (!res.ok) {
        return new Response(JSON.stringify({ error: `Discogs release lookup failed (${res.status})` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const data = await res.json()

      // Discogs disambiguates same-named artists with a trailing " (2)" etc. — strip it for display/storage.
      const artistNames = (data.artists || []).map((a: any) => (a.name || '').replace(/\s\(\d+\)$/, ''))

      const matrixIdentifier = (data.identifiers || []).find(
        (i: any) => i.type && i.type.toLowerCase().includes('matrix')
      )
      const barcodeIdentifier = (data.identifiers || []).find(
        (i: any) => i.type && i.type.toLowerCase() === 'barcode'
      )

      // Tracklist: position, title, duration as Discogs provides them directly.
      const tracklist = (data.tracklist || [])
        .filter((t: any) => t.type_ === 'track' || !t.type_)
        .map((t: any) => ({
          position: t.position || '',
          title: t.title || '',
          duration: t.duration || ''
        }))

      // Release-level credits (producers, engineers, mastering, etc.) — not
      // per-track, since most releases only credit at the release level anyway.
      const credits = (data.extraartists || []).map((a: any) => ({
        name: (a.name || '').replace(/\s\(\d+\)$/, ''),
        role: a.role || ''
      }))

      // Pressing identification: catalog number, format, colour, edition.
      const format0 = (data.formats || [])[0]
      const edition = ((format0?.descriptions as string[]) || []).filter((d) => EDITION_TERMS.includes(d)).join(', ')

      const release = {
        title: data.title || '',
        artist: artistNames.join(', '),
        year: data.year || null,
        genre: (data.genres || [])[0] || '',
        label: (data.labels || [])[0]?.name || '',
        pressingCountry: data.country || '',
        matrixNumber: matrixIdentifier ? matrixIdentifier.value : '',
        coverImageUrl: (data.images || [])[0]?.uri || '',
        catalogNumber: (data.labels || [])[0]?.catno || '',
        format: formatOption(format0),
        vinylColor: format0?.text || '',
        edition,
        pressingYear: data.year || null,
        barcode: barcodeIdentifier ? barcodeIdentifier.value : '',
        discogsReleaseId: data.id || null,
        discogsMasterId: data.master_id || null,
        styles: (data.styles || []).join(', '),
        discogsHave: data.community?.have ?? null,
        discogsWant: data.community?.want ?? null,
        tracklist,
        credits
      }

      return new Response(JSON.stringify({ release }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action — use action=search or action=release' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
