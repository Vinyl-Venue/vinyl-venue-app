import { supabase } from './supabaseClient'

const MAX_REPORTS_PER_PAGE_LOAD = 10
const reported = new Set()

// Records an unexpected error in the client_errors table so it can be reviewed
// at /admin/errors. Deliberately forgiving: it only reports for signed-in
// users, sends each distinct message once per page load, caps the total, and
// never throws, so error reporting can't itself cause errors.
export async function reportError(kind, error, stack) {
  try {
    const message = String(error?.message || error || 'Unknown error').slice(0, 500)
    const key = `${kind}:${message}`
    if (reported.has(key) || reported.size >= MAX_REPORTS_PER_PAGE_LOAD) return
    reported.add(key)

    const { data } = await supabase.auth.getSession()
    if (!data.session) return

    await supabase.from('client_errors').insert({
      kind,
      message,
      stack: String(stack || error?.stack || '').slice(0, 4000) || null,
      url: window.location.href.slice(0, 500),
      user_agent: navigator.userAgent.slice(0, 300)
    })
  } catch {
    // Nothing useful to do if reporting itself fails.
  }
}

// Browsers raise this harmless notification routinely; it is not a bug.
function isBenign(message) {
  return /ResizeObserver loop/i.test(String(message))
}

export function installErrorReporting() {
  window.addEventListener('error', (event) => {
    if (isBenign(event.message)) return
    // Skip errors thrown by browser extensions or other sites' scripts.
    if (event.filename && !event.filename.startsWith(window.location.origin)) return
    reportError('runtime', event.error || event.message, event.error?.stack)
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (isBenign(event.reason?.message)) return
    reportError('promise', event.reason)
  })
}
