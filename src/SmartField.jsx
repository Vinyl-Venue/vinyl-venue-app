import { useEffect, useRef, useState } from 'react'
import { discogsSuggest } from './utils'

const PLACEHOLDER = 'https://placehold.co/36x36/E4E2DC/E4E2DC'

// Text input with live suggestions from the Discogs catalogue, narrowed by the
// other field (typing an artist limits album titles, and a title limits artists).
// Also offers matches already on the user's own shelf.
function SmartField({ field, placeholder, value, onChange, otherValue, localSuggestions = [], onPickAlbum, onPickArtist }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const ticket = useRef(0)

  useEffect(() => {
    const text = value.trim()
    if (!open || text.length < 2) { setItems([]); setLoading(false); return undefined }
    const mine = ++ticket.current
    setLoading(true)
    const t = setTimeout(async () => {
      const { items: found } = await discogsSuggest(field, field === 'title' ? text : otherValue, field === 'artist' ? text : otherValue)
      if (ticket.current === mine) { setItems(found); setLoading(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [value, otherValue, field, open])

  const v = value.trim().toLowerCase()
  const mine = v.length >= 1
    ? localSuggestions.filter((s) => s.toLowerCase().includes(v) && s.toLowerCase() !== v).slice(0, 4)
    : []

  function pick(item) {
    setOpen(false)
    if (item.kind === 'album') onPickAlbum?.(item)
    else onPickArtist?.(item)
  }

  const show = open && v.length >= 1 && (items.length > 0 || mine.length > 0 || loading)

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        autoComplete="off"
        className="bg-surface border border-border text-text px-3 py-2 rounded font-sans text-sm"
      />
      {show && (
        <ul className="absolute top-full left-0 min-w-[280px] w-max max-w-[min(420px,90vw)] bg-surface border border-border rounded mt-1 py-1 list-none z-20 max-h-72 overflow-y-auto shadow-sm">
          {mine.map((s) => (
            <li key={`m-${s}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(s); setOpen(false) }} className="px-3 py-2 font-sans text-sm cursor-pointer hover:bg-bg">
              {s} <span className="text-text-faint text-xs">on your shelf</span>
            </li>
          ))}
          {items.map((it, i) => (
            <li key={`${it.kind}-${it.masterId || it.artist}-${i}`} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(it)} className="flex items-center gap-2.5 px-3 py-1.5 font-sans text-sm cursor-pointer hover:bg-bg">
              <img src={it.thumb || PLACEHOLDER} alt="" className="w-9 h-9 object-cover rounded flex-shrink-0 bg-border" />
              <span className="min-w-0">
                {it.kind === 'album' ? (
                  <>
                    <span className="block text-text truncate">{it.title}</span>
                    <span className="block text-text-muted text-xs truncate">{[it.artist, it.year].filter(Boolean).join(' · ')}</span>
                  </>
                ) : (
                  <>
                    <span className="block text-text truncate">{it.artist}</span>
                    {it.title && <span className="block text-text-muted text-xs truncate">{it.title}{it.year ? ` · ${it.year}` : ''}</span>}
                  </>
                )}
              </span>
            </li>
          ))}
          {loading && items.length === 0 && <li className="px-3 py-2 text-xs text-text-muted">Searching Discogs…</li>}
        </ul>
      )}
    </div>
  )
}

export default SmartField
