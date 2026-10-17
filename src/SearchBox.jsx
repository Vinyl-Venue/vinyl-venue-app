import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { avatarPlaceholder } from './utils'
import useSearchSuggestions from './useSearchSuggestions'

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M18 18L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function Group({ label, children }) {
  return (
    <div>
      <div className="px-3 pt-2.5 pb-1">
        <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-text-faint">{label}</span>
      </div>
      {children}
    </div>
  )
}

// Desktop header search with a suggestions dropdown. Enter without
// picking a suggestion goes to the full results page, as before.
function SearchBox() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef(null)
  const { items, loading } = useSearchSuggestions(value, user)
  const trimmed = value.trim()

  useEffect(() => { setActive(-1) }, [items])

  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function go(to) {
    setOpen(false)
    setValue('')
    navigate(to)
  }

  function seeAll() {
    if (!trimmed) return
    setOpen(false)
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  function onSubmit(e) {
    e.preventDefault()
    if (active >= 0 && items[active]) go(items[active].to)
    else seeAll()
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown' && items.length > 0) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % items.length)
    } else if (e.key === 'ArrowUp' && items.length > 0) {
      e.preventDefault()
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1))
    }
  }

  const showPanel = open && trimmed.length >= 2
  const groups = ['Listings', 'On shelves', 'People']

  return (
    <form onSubmit={onSubmit} className="hidden lg:block relative flex-1 max-w-xs" ref={wrapRef} role="search">
      <input
        type="text"
        value={value}
        onChange={(e) => { setValue(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search records, people, or listings..."
        autoComplete="off"
        aria-label="Search"
        className="w-full bg-surface border border-border text-text pl-8 pr-3 py-1.5 rounded-full text-xs font-sans"
      />
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none">
        <SearchIcon />
      </span>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-bg border border-border rounded-lg shadow-lg overflow-hidden font-sans" style={{ minWidth: 300 }}>
          {items.length === 0 && (
            <p className="m-0 px-3 py-3 text-xs text-text-muted">
              {loading ? 'Searching…' : `No quick matches for “${trimmed}”.`}
            </p>
          )}

          {groups.map((g) => {
            const rows = items.filter((it) => it.group === g)
            if (rows.length === 0) return null
            return (
              <Group key={g} label={g}>
                {rows.map((it) => {
                  const idx = items.indexOf(it)
                  return (
                    <button
                      key={it.key}
                      type="button"
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(it.to)}
                      className={`w-full flex items-center gap-3 px-3 py-2 border-0 text-left cursor-pointer ${active === idx ? 'bg-surface' : 'bg-transparent'}`}
                    >
                      <img
                        src={it.image || avatarPlaceholder(32)}
                        alt=""
                        className={`w-8 h-8 object-cover flex-shrink-0 ${it.round ? 'rounded-full' : 'rounded'}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-text truncate">{it.title}</span>
                        <span className="block text-[11px] text-text-muted truncate">{it.sub}</span>
                      </span>
                    </button>
                  )
                })}
              </Group>
            )
          })}

          <button
            type="button"
            onClick={seeAll}
            className="w-full px-3 py-2.5 border-0 border-t border-border bg-transparent text-left cursor-pointer text-xs text-accent hover:bg-surface"
          >
            See all results for “{trimmed}” →
          </button>
        </div>
      )}
    </form>
  )
}

export default SearchBox