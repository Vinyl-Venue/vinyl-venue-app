import { Link } from 'react-router-dom'

function LandingPage() {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1>Vinyl Venue</h1>
        <p>Your collection. Your marketplace. Your bandmates.</p>
        <div className="landing-actions">
          <Link to="/signup" className="landing-button primary">Get started</Link>
          <Link to="/signin" className="landing-button secondary">Sign in</Link>
        </div>
      </div>
    </div>
  )
}

export default LandingPage