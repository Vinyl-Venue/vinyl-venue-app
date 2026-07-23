import { Link } from 'react-router-dom'

function SignInPage() {
  return (
    <div className="auth-page">
      <h2>Sign in</h2>
      <p>Real authentication is coming in a future lesson.</p>
      <Link to="/">Back to home</Link>
    </div>
  )
}

export default SignInPage