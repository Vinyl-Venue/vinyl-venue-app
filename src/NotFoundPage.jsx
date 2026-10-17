import { Link } from 'react-router-dom'

// Catch-all for URLs that don't match any route, so a mistyped or outdated
// link lands somewhere helpful instead of a blank screen.
function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-5 text-center">
      <svg width="48" height="48" viewBox="0 0 32 32" fill="none" className="opacity-40 text-text">
        <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <h1 className="font-serif italic font-normal text-3xl m-0">Nothing on this side</h1>
      <p className="font-sans text-sm text-text-muted m-0">
        We couldn&rsquo;t find the page you were looking for.
      </p>
      <Link to="/" className="text-accent font-sans text-sm">Back to home</Link>
    </div>
  )
}

export default NotFoundPage