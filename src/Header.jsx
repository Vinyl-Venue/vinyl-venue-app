import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabase } from './supabaseClient'

function Header() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <header className="p-10">
      <div className="flex justify-between items-center">
        <Link to="/" className="no-underline">
          <h1 className="m-0 text-4xl text-text">Vinyl Venue</h1>
        </Link>
        <nav className="flex gap-5 items-center font-sans">
          {user ? (
            <>
              <Link to="/dashboard" className="text-text-muted no-underline text-sm hover:text-accent transition-colors">Shelf</Link>
              <Link to="/wishlist" className="text-text-muted no-underline text-sm hover:text-accent transition-colors">Wishlist</Link>
              <Link to="/marketplace" className="text-text-muted no-underline text-sm hover:text-accent transition-colors">Marketplace</Link>
              <Link to="/stats" className="text-text-muted no-underline text-sm hover:text-accent transition-colors">Stats</Link>
              <span className="text-text-muted text-sm font-sans">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-transparent border border-border text-text-muted px-3.5 py-1.5 rounded font-sans text-sm cursor-pointer hover:border-accent hover:text-accent transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="text-text-muted no-underline text-sm hover:text-accent transition-colors">Sign in</Link>
              <Link to="/signup" className="text-text-muted no-underline text-sm hover:text-accent transition-colors">Sign up</Link>
            </>
          )}
        </nav>
      </div>
      <p className="mt-2 text-lg text-text-muted">Your collection. Your marketplace. Your bandmates.</p>
    </header>
  )
}

export default Header