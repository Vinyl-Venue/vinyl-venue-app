import { Link } from 'react-router-dom'

function Header() {
  return (
    <header>
      <div className="nav-bar">
        <Link to="/" className="logo-link"><h1>Vinyl Venue</h1></Link>
        <nav className="nav-links">
          <Link to="/signin">Sign in</Link>
          <Link to="/signup">Sign up</Link>
        </nav>
      </div>
      <p>Your collection. Your marketplace. Your bandmates.</p>
    </header>
  )
}

export default Header