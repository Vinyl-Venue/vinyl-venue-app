import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { avatarPlaceholder } from './utils'
import useSearchSuggestions from './useSearchSuggestions'

function SearchIcon({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M18 18L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// Phone search: a magnifier button in the header that opens a full-screen
// sheet with the same suggestions as the desktop dropdown. Hidden on lg+,
// where the inline search field takes over.
function MobileSearch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef(null)
  const { items, loading } = useSearchSuggestions(value, user)
  const trimmed = value.trim()

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Lock page scroll behind the sheet while it's open.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  function close() {
    setOpen(false)
    setValue('')
  }

  function go(to) {
    close()
    navigate(to)
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!trimmed) return
    close()
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  const groups = ['Listings', 'On shelves', 'People']

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="lg:hidden bg-transparent border-0 p-0 text-text-muted cursor-pointer flex items-center"
      >
        <SearchIcon />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-bg flex flex-col font-sans" role="dialog" aria-label="Search">
          <form onSubmit={onSubmit} className="flex items-center gap-3 px-4 py-3 border-b border-border" role="search">
            <span className="text-text-faint flex-shrink-0"><SearchIcon size={16} /></span>
            <input
              ref={inputRef}
              type="search"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Search records, people, or listings..."
              autoComplete="off"
              enterKeyHint="search"
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-text text-base font-sans"
            />
            <button type="button" onClick={close} className="bg-transparent border-0 text-xs text-text-muted cursor-pointer flex-shrink-0">
              Cancel
            </button>
          </form>

          <div className="flex-1 overflow-y-auto pb-8">
            {trimmed.length < 2 && (
              <p className="m-0 px-4 py-6 text-sm text-text-muted">Type a record, artist, collector or listing.</p>
            )}

            {trimmed.length >= 2 && items.length === 0 && (
              <p className="m-0 px-4 py-6 text-sm text-text-muted">
                {loading ? 'Searching…' : `No quick matches for “${trimmed}”.`}
              </p>
            )}

            {groups.map((g) => {
              const rows = items.filter((it) => it.group === g)
              if (rows.length === 0) return null
              return (
                <div key={g}>
                  <div className="px-4 pt-4 pb-1">
                    <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-text-faint">{g}</span>
                  </div>
                  {rows.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => go(it.to)}
                      className="w-full flex items-center gap-3 px-4 py-3 border-0 bg-transparent text-left cursor-pointer"
                    >
                      <img
                        src={it.image || avatarPlaceholder(40)}
                        alt=""
                        className={`w-10 h-10 object-cover flex-shrink-0 ${it.round ? 'rounded-full' : 'rounded'}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-text truncate">{it.title}</span>
                        <span className="block text-xs text-text-muted truncate">{it.sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )
            })}

            {trimmed.length >= 2 && (
              <button
                type="button"
                onClick={onSubmit}
                className="w-full px-4 py-4 border-0 border-t border-border mt-2 bg-transparent text-left cursor-pointer text-sm text-accent"
              >
                See all results for “{trimmed}” →
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default MobileSearch