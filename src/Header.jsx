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
    <header>
      <div className="nav-bar">
        <Link to="/" className="logo-link"><h1>Vinyl Venue</h1></Link>
        <nav className="nav-links">
          {user ? (
            <>
              <Link to="/dashboard">Shelf</Link>
              <Link to="/wishlist">Wishlist</Link>
              <Link to="/stats">Stats</Link>
              <span className="user-email">{user.email}</span>
              <button className="signout-button" onClick={handleSignOut}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/signin">Sign in</Link>
              <Link to="/signup">Sign up</Link>
            </>
          )}
        </nav>
      </div>
      <p>Your collection. Your marketplace. Your bandmates.</p>
    </header>
  )
}

export default Header