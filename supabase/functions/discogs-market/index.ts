// Pressing-level market data from Discogs, cached for 24 hours.
//   GET ?id=<discogs release id>[&refresh=1]
// Returns { market: { lowest_price, currency, num_for_sale, have, want, suggested, fetched_at } }
// "suggested" is Discogs' price suggestion per media grade, or null when the
// token's account has no seller settings (Discogs only gives suggestions to sellers).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}
const UA = 'VinylVenue/1.0 +https://vinyl-venue-app.vercel.app'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const token = Deno.env.get('DISCOGS_TOKEN')
  const sbUrl = Deno.env.get('SUPABASE_URL')
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !sbUrl || !sbKey) return json({ error: 'Server is missing configuration.' }, 500)

  const url = new URL(req.url)
  const id = Number(url.searchParams.get('id'))
  const refresh = url.searchParams.get('refresh') === '1'
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'Missing or invalid release id.' }, 400)

  const rest = (path: string, init: RequestInit = {}) =>
    fetch(`${sbUrl}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, 'Content-Type': 'application/json', ...(init.headers || {}) }
    })
  const dg = (path: string) => fetch(`https://api.discogs.com${path}${path.includes('?') ? '&' : '?'}token=${token}`, { headers: { 'User-Agent': UA } })

  try {
    // 1) Serve the cached snapshot while it is fresh.
    let cached: any = null
    const cres = await rest(`pressing_market?discogs_release_id=eq.${id}&select=*`)
    if (cres.ok) cached = (await cres.json())[0] || null
    if (cached && !refresh && Date.now() - new Date(cached.fetched_at).getTime() < MAX_AGE_MS) {
      return json({ market: cached, cached: true })
    }

    // 2) Otherwise ask Discogs: the release (have/want), marketplace stats, and price suggestions.
    const [relRes, statRes, sugRes] = await Promise.all([
      dg(`/releases/${id}`),
      dg(`/marketplace/stats/${id}?curr_abbr=USD`),
      dg(`/marketplace/price_suggestions/${id}`)
    ])
    if (!relRes.ok && !statRes.ok) {
      if (cached) return json({ market: cached, cached: true, stale: true })
      return json({ error: `Discogs market lookup failed (${relRes.status})` }, 502)
    }
    const rel = relRes.ok ? await relRes.json() : {}
    const stat = statRes.ok ? await statRes.json() : {}

    let suggested: Record<string, number> | null = null
    if (sugRes.ok) {
      const raw = await sugRes.json()
      const out: Record<string, number> = {}
      for (const [grade, v] of Object.entries(raw || {})) {
        const value = Number((v as any)?.value)
        if (Number.isFinite(value)) out[grade] = Math.round(value * 100) / 100
      }
      suggested = Object.keys(out).length ? out : null
    }

    const lowest = Number(stat?.lowest_price?.value ?? rel?.lowest_price)
    const row = {
      discogs_release_id: id,
      lowest_price: Number.isFinite(lowest) ? lowest : null,
      currency: stat?.lowest_price?.currency || 'USD',
      num_for_sale: Number.isFinite(Number(stat?.num_for_sale ?? rel?.num_for_sale)) ? Number(stat?.num_for_sale ?? rel?.num_for_sale) : null,
      have: Number.isFinite(Number(rel?.community?.have)) ? Number(rel.community.have) : null,
      want: Number.isFinite(Number(rel?.community?.want)) ? Number(rel.community.want) : null,
      suggested,
      fetched_at: new Date().toISOString()
    }

    // 3) Cache it (best effort; the response doesn't depend on the write).
    await rest('pressing_market', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row)
    }).catch(() => null)

    return json({ market: row, cached: false })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unknown error' }, 500)
  }
})
