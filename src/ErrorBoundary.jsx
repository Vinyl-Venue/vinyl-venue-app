import { Component } from 'react'
import { reportError } from './errorReporter'

// Catches unexpected rendering errors so one broken page shows a friendly
// message and a way back, instead of the whole app going blank.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unexpected error:', error, info?.componentStack)
    reportError('render', error, `${error?.stack || ''}\n${info?.componentStack || ''}`)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-5 text-center">
        <h1 className="font-serif italic font-normal text-3xl m-0">Something skipped</h1>
        <p className="font-sans text-sm text-text-muted m-0">
          Something went wrong loading this page. Reloading usually fixes it.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="bg-accent text-bg border-0 px-5 py-2 rounded font-sans text-sm cursor-pointer"
          >
            Reload
          </button>
          <a href="/" className="px-5 py-2 rounded font-sans text-sm no-underline border border-border text-text-muted">
            Go home
          </a>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary