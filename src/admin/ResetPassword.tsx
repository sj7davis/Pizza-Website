import { useState, type FormEvent } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { trpc } from '../lib/trpc'

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (err) => setError(err.message || 'Something went wrong. Please try again.'),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!token) return
    resetPassword.mutate({ token, password })
  }

  if (!token) {
    return (
      <div className="admin-login">
        <h1>PBB Admin</h1>
        <p className="admin-error" role="alert">Invalid reset link.</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="admin-login">
        <h1>PBB Admin</h1>
        <p>Password updated — you can now sign in.</p>
        <Link to="/admin">Go to sign in</Link>
      </div>
    )
  }

  return (
    <form className="admin-login" onSubmit={submit}>
      <h1>Reset password</h1>
      <label>
        New password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button type="submit" disabled={resetPassword.isPending}>
        {resetPassword.isPending ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
