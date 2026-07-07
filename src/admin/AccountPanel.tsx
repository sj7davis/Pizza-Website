import { useState, type FormEvent } from 'react'
import { trpc } from '../lib/trpc'
import { SaveStatus, type SaveState } from './SaveStatus'

export function AccountPanel() {
  const utils = trpc.useUtils()
  const owners = trpc.owners.list.useQuery()
  const changePassword = trpc.owners.changePassword.useMutation()
  const addOwner = trpc.owners.add.useMutation({ onSuccess: () => utils.owners.list.invalidate() })
  const removeOwner = trpc.owners.remove.useMutation({ onSuccess: () => utils.owners.list.invalidate() })
  const resetOwner = trpc.owners.resetPassword.useMutation()

  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [pwSave, setPwSave] = useState<SaveState>({ status: 'idle' })

  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [ownerSave, setOwnerSave] = useState<SaveState>({ status: 'idle' })

  // Which owner row is currently being reset, and the new password being typed.
  const [resetId, setResetId] = useState<string | null>(null)
  const [resetPw, setResetPw] = useState('')
  const [resetSave, setResetSave] = useState<SaveState>({ status: 'idle' })

  async function submitReset(e?: FormEvent) {
    e?.preventDefault()
    if (!resetId) return
    setResetSave({ status: 'saving' })
    try {
      await resetOwner.mutateAsync({ id: resetId, newPassword: resetPw })
      setResetSave({ status: 'saved' })
      setResetPw(''); setResetId(null)
    } catch {
      setResetSave({ status: 'error', message: 'Could not reset (password must be at least 8 characters).' })
    }
  }

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
            <li className="admin-row admin-row--stack" key={o.id}>
              <div className="admin-row-main">
                <span className="admin-row-name">{o.email}</span>
                <span className="admin-actions">
                  <button
                    type="button"
                    onClick={() => { setResetId(resetId === o.id ? null : o.id); setResetPw(''); setResetSave({ status: 'idle' }) }}
                    aria-label={`Reset password for ${o.email}`}
                  >
                    {resetId === o.id ? 'Cancel' : 'Reset password'}
                  </button>
                  <button type="button" onClick={() => { if (confirm(`Remove ${o.email}?`)) removeOwner.mutate({ id: o.id }) }}>Remove</button>
                </span>
              </div>
              {resetId === o.id && (
                <div className="admin-actions">
                  <input
                    type="text"
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitReset() } }}
                    placeholder="New password (min 8)"
                    aria-label={`New password for ${o.email}`}
                  />
                  <button type="button" onClick={() => submitReset()} disabled={resetSave.status === 'saving'}>Set password</button>
                  <SaveStatus state={resetSave} />
                </div>
              )}
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
