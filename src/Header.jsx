import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'
import NotificationBell from './NotificationBell'
import MessagesLink from './MessagesLink'
import CartLink from './CartLink'
import TickerBar from './TickerBar'
import { avatarPlaceholder } from './utils'

// "Orders" now covers /orders, /purchases, and /trade-offers — all three
// converge on TransactionsPage, which picks its default tab (Selling,
// Buying, or Trade Offers) from whichever path you actually landed on.
// This mirrors the mobile bottom tab bar, so desktop and mobile share
// one nav shape with one fewer destination than before.
const NAV_LINKS = [
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/orders', label: 'Orders', matchPaths: ['/orders', '/purchases', '/trade-offers'] },
  { to: '/discover', label: 'Discover' }
]

// Mobile bottom tab bar — four thumb-reachable destinations now that
// Trade Offers folds into Orders (all three of /orders, /purchases,
// and /trade-offers converge on TransactionsPage — see NAV_LINKS above).
const BOTTOM_TABS = [
  { key: 'shelf', label: 'Shelf', icon: ShelfIcon },
  { key: 'marketplace', label: 'Market', to: '/marketplace', icon: MarketplaceIcon },
  { key: 'orders', label: 'Orders', to: '/orders', icon: OrdersIcon, matchPaths: ['/orders', '/purchases', '/trade-offers'] },
  { key: 'discover', label: 'Discover', to: '/discover', icon: DiscoverIcon }
]

function ShelfIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function MarketplaceIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 7L4.5 3H15.5L17 7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M3 7V16H17V7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 16V11H12V16" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function OrdersIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 6.5L10 3L17 6.5L10 10L3 6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M3 6.5V14L10 17.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M17 6.5V14L10 17.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function DiscoverIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13 7L11 11L7 13L9 9L13 7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M18 18L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function Header() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [ownProfile, setOwnProfile] = useState(null)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    if (!user) return

    async function fetchOwnProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      setOwnProfile(data)
    }

    fetchOwnProfile()
  }, [user])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  function isActive(link) {
    if (link.matchPaths) return link.matchPaths.some((p) => location.pathname.startsWith(p))
    return location.pathname === link.to
  }

  function isBottomTabActive(tab) {
    // Exact match, not startsWith — /profile/{id}/marketplace shares the
    // same prefix as /profile/{id} and would otherwise incorrectly light
    // up "Shelf" while viewing your own marketplace.
    if (tab.key === 'shelf') return user && location.pathname === `/profile/${user.id}`
    // Covers both /marketplace and /profile/{id}/marketplace, so "My
    // marketplace" correctly lights up "Market" instead of "Shelf".
    if (tab.key === 'marketplace') return location.pathname.includes('/marketplace')
    if (tab.matchPaths) return tab.matchPaths.some((p) => location.pathname.startsWith(p))
    return location.pathname.startsWith(tab.to)
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    const trimmed = searchInput.trim()
    if (!trimmed) return
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <>
      {user && <TickerBar />}
      <header className="px-5 md:px-10 py-5 border-b border-border">
        <div className="flex justify-between items-center">
          <Link to="/" className="no-underline flex-shrink-0">
            <h1 className="m-0 text-2xl font-serif italic text-text">Vinyl Venue</h1>
          </Link>

          {user ? (
            <div className="flex items-center gap-3 lg:gap-6 flex-1 justify-end">
              {/* Global search — desktop only for now. Covers people and
                  active listings; searches your own shelf separately
                  since that's personal inventory, not something anyone
                  else should be able to search into. */}
              <form onSubmit={handleSearchSubmit} className="hidden lg:block relative flex-1 max-w-xs">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search records, people, or listings..."
                  className="w-full bg-surface border border-border text-text pl-8 pr-3 py-1.5 rounded-full text-xs font-sans"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none">
                  <SearchIcon />
                </span>
              </form>

              {/* Desktop-only labeled nav — mobile gets the same four
                  (plus Shelf, which only exists as a mobile tab since
                  desktop reaches it via Profile) via the fixed bottom
                  tab bar instead, so this block simply doesn't render
                  below lg. */}
              <nav className="hidden lg:flex gap-6 items-center font-sans flex-shrink-0">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`no-underline text-xs uppercase tracking-wider pb-1 transition-colors ${
                      isActive(link)
                        ? 'text-text border-b-2 border-accent'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to={`/profile/${user.id}`}
                  className={`no-underline text-xs uppercase tracking-wider pb-1 transition-colors ${
                    location.pathname === `/profile/${user.id}`
                      ? 'text-text border-b-2 border-accent'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Profile
                </Link>
              </nav>

              {/* Icons — mounted exactly once regardless of breakpoint.
                  Each of these opens its own realtime subscription keyed
                  by a fixed channel name, so this row must never be
                  duplicated across a desktop/mobile split. */}
              <div className="flex items-center gap-3 lg:pl-4 lg:border-l lg:border-border flex-shrink-0">
                <CartLink />
                <MessagesLink />
                <NotificationBell />

                <img
                  src={ownProfile?.avatar_url || avatarPlaceholder(30)}
                  alt=""
                  className="hidden lg:block w-[30px] h-[30px] object-cover rounded-full"
                />
                <button
                  onClick={handleSignOut}
                  className="hidden lg:block bg-transparent border border-border text-text-muted px-3 py-1.5 rounded font-sans text-xs cursor-pointer hover:border-accent hover:text-accent transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <nav className="flex gap-5 items-center font-sans">
              <Link to="/signin" className="text-text-muted no-underline text-sm hover:text-accent transition-colors">Sign in</Link>
              <Link to="/signup" className="text-text-muted no-underline text-sm hover:text-accent transition-colors">Sign up</Link>
            </nav>
          )}
        </div>
      </header>

      {/* Mobile bottom tab bar — fixed, thumb-reachable, no menu to open.
          IMPORTANT: because this is fixed, every page needs bottom
          padding on mobile (e.g. `pb-20 lg:pb-0` on its outermost
          scrollable container) or its last section will render behind
          this bar. */}
      {user && (
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg border-t border-border flex font-sans"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon
            const active = isBottomTabActive(tab)
            const to = tab.key === 'shelf' ? `/profile/${user.id}` : tab.to
            return (
              <Link
                key={tab.key}
                to={to}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 no-underline transition-colors ${
                  active ? 'text-accent' : 'text-text-muted'
                }`}
              >
                <Icon />
                <span className="text-[9px] uppercase tracking-wider">{tab.label}</span>
              </Link>
            )
          })}
        </nav>
      )}
    </>
  )
}

export default Header