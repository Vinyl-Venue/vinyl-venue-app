import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    if (!agreed) {
      setErrorMessage('Please confirm you are 18 or older and agree to the terms.')
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.auth.signUp({
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-5">
      <h2 className="text-2xl m-0">Sign up</h2>
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
        <label className="flex items-start gap-2 font-sans text-xs text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            I am 18 or older and agree to the{' '}
            <Link to="/terms" target="_blank" className="text-accent">Terms</Link>,{' '}
            <Link to="/privacy" target="_blank" className="text-accent">Privacy Policy</Link> and{' '}
            <Link to="/rules" target="_blank" className="text-accent">Marketplace Rules</Link>.
          </span>
        </label>
        {errorMessage && <p className="text-[#d97757] text-sm m-0">{errorMessage}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-accent text-bg border-0 px-2.5 py-2.5 rounded font-sans text-sm cursor-pointer"
        >
          {isSubmitting ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      <Link to="/" className="text-accent">Back to home</Link>
    </div>
  )
}

export default SignUpPage