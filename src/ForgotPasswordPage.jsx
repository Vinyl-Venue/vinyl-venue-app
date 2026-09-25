import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')
    setIsSubmitting(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setMessage('Check your email for a password reset link.')
  }

  const inputClass = "bg-surface border border-border text-text px-3 py-2.5 rounded font-sans text-sm"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <h2 className="text-2xl m-0">Reset your password</h2>
      <p className="text-text-muted font-sans text-sm max-w-xs text-center">
        Enter your email and we'll send you a link to reset your password.
      </p>
      <form className="flex flex-col gap-2.5 w-72" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className={inputClass}
        />
        {message && <p className="text-accent text-sm m-0">{message}</p>}
        {errorMessage && <p className="text-[#d97757] text-sm m-0">{errorMessage}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent text-bg border-0 px-2.5 py-2.5 rounded font-sans text-sm cursor-pointer"
        >
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
      <Link to="/signin" className="text-accent">Back to sign in</Link>
    </div>
  )
}

export default ForgotPasswordPage