import { useState, type FormEvent } from 'react'
import { EmailSignup } from './EmailSignup'
import { MELBOURNE_SUBURBS } from '../admin/suburbsData'
import './DeliveryChecker.css'

export function DeliveryChecker({ suburbs }: { suburbs: string[] }) {
  const [q, setQ] = useState('')
  const [result, setResult] = useState<null | 'in' | 'out'>(null)
  function check(e: FormEvent) {
    e.preventDefault()
    const needle = q.trim().toLowerCase()
    if (!needle) return
    const hit = suburbs.some((s) => s.toLowerCase() === needle || s.toLowerCase().includes(needle))
    setResult(hit ? 'in' : 'out')
  }
  return (
    <div className="delivery-checker">
      <form onSubmit={check} className="delivery-checker__form">
        <label htmlFor="pbb-suburb" className="label">Do we deliver to you?</label>
        <div className="delivery-checker__row">
          <input id="pbb-suburb" list="pbb-delivery-suburbs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Your suburb" aria-label="Suburb" />
          <datalist id="pbb-delivery-suburbs">{MELBOURNE_SUBURBS.map((s) => <option key={s} value={s} />)}</datalist>
          <button type="submit">Check</button>
        </div>
      </form>
      {result === 'in' && <p className="delivery-checker__yes">Yes — we deliver to {q.trim()}. 🍕</p>}
      {result === 'out' && (
        <div className="delivery-checker__out">
          <p>Not yet — we don't deliver to {q.trim()} right now.</p>
          <EmailSignup prompt="Leave your email and we'll tell you when we reach your area." />
        </div>
      )}
    </div>
  )
}
