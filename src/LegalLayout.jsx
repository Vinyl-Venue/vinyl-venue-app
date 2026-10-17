import { Link } from 'react-router-dom'

// Shared shell for the legal pages. Deliberately independent of Header and
// auth so the pages work for signed-out visitors (e.g. from the sign-up page).
export function LegalLayout({ title, updated, children }) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border px-5 lg:px-10 py-4 flex items-center justify-between">
        <Link to="/" className="font-serif italic text-2xl text-text no-underline">Vinyl Venue</Link>
        <nav className="flex gap-4 text-xs font-sans text-text-muted">
          <Link to="/terms" className="text-text-muted no-underline hover:underline">Terms</Link>
          <Link to="/privacy" className="text-text-muted no-underline hover:underline">Privacy</Link>
          <Link to="/rules" className="text-text-muted no-underline hover:underline">Marketplace rules</Link>
        </nav>
      </header>
      <main className="max-w-[720px] mx-auto px-5 py-8 pb-24 font-sans text-sm leading-relaxed">
        <div className="bg-surface border border-border rounded-lg px-4 py-3 mb-6 text-xs text-text-muted">
          <strong className="text-text">Draft.</strong> This is a starting draft and has not been reviewed by a lawyer.
          Items in [square brackets] must be filled in before launch.
        </div>
        <h1 className="font-serif italic font-normal text-3xl m-0 mb-1">{title}</h1>
        <p className="text-xs text-text-faint mt-0 mb-8">Last updated: {updated}</p>
        {children}
      </main>
    </div>
  )
}

export function Section({ title, children }) {
  return (
    <section className="mb-7">
      <h2 className="font-serif italic font-normal text-xl m-0 mb-2">{title}</h2>
      <div className="flex flex-col gap-2 text-text-muted">{children}</div>
    </section>
  )
}