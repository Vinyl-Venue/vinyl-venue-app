import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    })

    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    navigate('/dashboard')
  }

  const inputClass = "bg-surface border border-border text-text px-3 py-2.5 rounded font-sans text-sm"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <h2 className="text-2xl m-0">Sign in</h2>
      <form className="flex flex-col gap-2.5 w-72" onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className={inputClass}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className={inputClass}
        />
        {errorMessage && <p className="text-[#d97757] text-sm m-0">{errorMessage}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent text-bg border-0 px-2.5 py-2.5 rounded font-sans text-sm cursor-pointer"
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <Link to="/" className="text-accent">Back to home</Link>
    </div>
  )
}

export default SignInPage