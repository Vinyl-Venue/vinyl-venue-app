import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setErrorMessage('')
    setIsSubmitting(true)

    const { error } = await supabase.auth.updateUser({ password: password })

    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setMessage('Password updated! Redirecting...')
    setTimeout(() => navigate('/dashboard'), 1500)
  }

  const inputClass = "bg-surface border border-border text-text px-3 py-2.5 rounded font-sans text-sm"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <h2 className="text-2xl m-0">Set a new password</h2>
      <form className="flex flex-col gap-2.5 w-72" onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={6}
          className={inputClass}
        />
        {message && <p className="text-accent text-sm m-0">{message}</p>}
        {errorMessage && <p className="text-[#d97757] text-sm m-0">{errorMessage}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent text-bg border-0 px-2.5 py-2.5 rounded font-sans text-sm cursor-pointer"
        >
          {isSubmitting ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

export default ResetPasswordPage