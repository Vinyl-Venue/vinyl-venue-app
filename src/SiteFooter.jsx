import { Link } from 'react-router-dom'

// Small footer with the legal links. Drop <SiteFooter /> at the bottom of
// the landing page and sign-up page (and anywhere else it is wanted).
function SiteFooter() {
  return (
    <footer className="border-t border-border mt-10 px-5 lg:px-10 py-5 flex gap-4 flex-wrap text-xs font-sans text-text-faint">
      <span>&copy; Vinyl Venue</span>
      <Link to="/terms" className="text-text-faint no-underline hover:underline">Terms</Link>
      <Link to="/privacy" className="text-text-faint no-underline hover:underline">Privacy</Link>
      <Link to="/rules" className="text-text-faint no-underline hover:underline">Marketplace rules</Link>
    </footer>
  )
}

export default SiteFooter