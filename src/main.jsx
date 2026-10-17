import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const root = createRoot(document.getElementById('root'))

// Without these two keys Supabase can't be reached and the app would render
// a blank page. Checking up front turns that into a readable message, and
// loading App afterwards means nothing touches Supabase until the keys exist.
const missingKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter(
  (name) => !import.meta.env[name]
)

if (missingKeys.length > 0) {
  root.render(
    <div className="min-h-screen flex items-center justify-center px-6 font-sans">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-serif italic mb-3">Vinyl Venue can't start</h1>
        <p className="text-sm text-text-muted mb-3">
          The site is missing its connection settings, so nothing can load right now.
        </p>
        <p className="text-xs text-text-faint">Missing: {missingKeys.join(', ')}</p>
      </div>
    </div>
  )
} else {
  import('./App.jsx').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
}
