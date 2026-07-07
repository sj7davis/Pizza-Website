import { useState, type FormEvent } from 'react'
import { trpc } from '../lib/trpc'

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMessage, setForgotMessage] = useState('')

  const login = trpc.auth.login.useMutation({
    onSuccess: () => onSuccess(),
    onError: (err) => setError(err?.message || 'Invalid email or password'),
  })

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setForgotMessage('If that email is registered, a reset link has been sent. Check your inbox.')
    },
    onError: () => {
      setForgotMessage('If that email is registered, a reset link has been sent. Check your inbox.')
    },
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    login.mutate({ email: email.trim().toLowerCase(), password: password.trim() })
  }

  function submitForgot(e: FormEvent) {
    e.preventDefault()
    setForgotMessage('')
    requestReset.mutate({ email: forgotEmail })
  }

  return (
    <div className="admin-login">
      <form onSubmit={submit}>
        <h1>PBB Admin</h1>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="admin-error" role="alert">{error}</p>}
        <button type="submit" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <button
        type="button"
        className="admin-link-button"
        onClick={() => {
          setShowForgot((v) => !v)
          setForgotMessage('')
        }}
      >
        Forgot password?
      </button>

      {showForgot && (
        <form className="admin-form" onSubmit={submitForgot}>
          <label>
            Email
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
          </label>
          {forgotMessage && <p role="status">{forgotMessage}</p>}
          <button type="submit" disabled={requestReset.isPending}>
            {requestReset.isPending ? 'Sending…' : 'Submit'}
          </button>
        </form>
      )}
    </div>
  )
}
