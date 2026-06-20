import { useState, type FormEvent } from 'react'
import { trpc } from '../lib/trpc'

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = trpc.auth.login.useMutation()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await login.mutateAsync({ email, password })
      onSuccess()
    } catch {
      setError('Invalid email or password')
    }
  }

  return (
    <form className="admin-login" onSubmit={submit}>
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
  )
}
