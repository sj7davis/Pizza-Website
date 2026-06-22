import { useState, type FormEvent } from 'react'
import { trpc } from '../lib/trpc'
import './EmailSignup.css'

export function EmailSignup({ prompt = 'Get specials & new drops in your inbox.' }: { prompt?: string }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const subscribe = trpc.emails.subscribe.useMutation()
  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await subscribe.mutateAsync({ email })
      setDone(true)
    } catch {
      setDone(true) // treat as success (idempotent); never discourage signups
    }
  }
  if (done) return <p className="email-signup__done">Thanks — you're on the list. 🍕</p>
  return (
    <form className="email-signup" onSubmit={submit}>
      <label className="email-signup__label" htmlFor="pbb-email">{prompt}</label>
      <div className="email-signup__row">
        <input id="pbb-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" aria-label="Email" />
        <button type="submit" disabled={subscribe.isPending}>Notify me</button>
      </div>
    </form>
  )
}
