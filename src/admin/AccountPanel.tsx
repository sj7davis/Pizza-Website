import { useState, type FormEvent } from 'react'
import { trpc } from '../lib/trpc'
import { SaveStatus, type SaveState } from './SaveStatus'

export function AccountPanel() {
  const utils = trpc.useUtils()
  const owners = trpc.owners.list.useQuery()
  const changePassword = trpc.owners.changePassword.useMutation()
  const addOwner = trpc.owners.add.useMutation({ onSuccess: () => utils.owners.list.invalidate() })
  const removeOwner = trpc.owners.remove.useMutation({ onSuccess: () => utils.owners.list.invalidate() })

  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [pwSave, setPwSave] = useState<SaveState>({ status: 'idle' })

  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [ownerSave, setOwnerSave] = useState<SaveState>({ status: 'idle' })

  async function submitPw(e: FormEvent) {
    e.preventDefault()
    setPwSave({ status: 'saving' })
    try {
      await changePassword.mutateAsync({ currentPassword: cur, newPassword: next })
      setPwSave({ status: 'saved' })
      setCur(''); setNext('')
    } catch {
      setPwSave({ status: 'error', message: 'Could not change password — check your current password.' })
    }
  }

  async function submitOwner(e: FormEvent) {
    e.preventDefault()
    setOwnerSave({ status: 'saving' })
    try {
      await addOwner.mutateAsync({ email, password: pw })
      setOwnerSave({ status: 'saved' })
      setEmail(''); setPw('')
    } catch {
      setOwnerSave({ status: 'error', message: 'Could not add owner (email may already exist).' })
    }
  }

  return (
    <section className="admin-panel">
      <h2>Account</h2>

      <form className="admin-form" onSubmit={submitPw}>
        <h3>Change your password</h3>
        <label>Current password<input type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></label>
        <label>New password (min 8)<input type="password" value={next} onChange={(e) => setNext(e.target.value)} /></label>
        <div className="admin-actions">
          <button type="submit" disabled={pwSave.status === 'saving'}>Change password</button>
          <SaveStatus state={pwSave} />
        </div>
      </form>

      <form className="admin-form" onSubmit={submitOwner}>
        <h3>Owners</h3>
        <ul className="admin-list">
          {(owners.data ?? []).map((o) => (
            <li className="admin-row" key={o.id}>
              <span className="admin-row-name">{o.email}</span>
              <button type="button" onClick={() => { if (confirm(`Remove ${o.email}?`)) removeOwner.mutate({ id: o.id }) }}>Remove</button>
            </li>
          ))}
        </ul>
        <label>New owner email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="new owner email" /></label>
        <label>New owner password (min 8)<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} aria-label="new owner password" /></label>
        <div className="admin-actions">
          <button type="submit" disabled={ownerSave.status === 'saving'}>Add owner</button>
          <SaveStatus state={ownerSave} />
        </div>
      </form>
    </section>
  )
}
