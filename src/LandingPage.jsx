import { Link } from 'react-router-dom'
import SiteFooter from './SiteFooter'

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl m-0">Vinyl Venue</h1>
          <p className="mt-2 text-lg text-text-muted">Your collection. Your marketplace. Your bandmates.</p>
          <div className="flex gap-3 justify-center mt-6">
            <Link
              to="/signup"
              className="px-6 py-2.5 rounded font-sans text-sm no-underline bg-accent text-bg"
            >
              Get started
            </Link>
            <Link
              to="/signin"
              className="px-6 py-2.5 rounded font-sans text-sm no-underline border border-border text-text-muted"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}

export default LandingPage