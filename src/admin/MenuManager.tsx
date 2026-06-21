import { useState } from 'react'
import { trpc } from '../lib/trpc'
import { MenuItemForm } from './MenuItemForm'
import { SaveStatus, type SaveState } from './SaveStatus'

export function MenuManager() {
  const utils = trpc.useUtils()
  const list = trpc.menu.list.useQuery()
  const invalidate = () => utils.menu.list.invalidate()
  const [save, setSave] = useState<SaveState>({ status: 'idle' })
  const onErr = () => setSave({ status: 'error', message: 'Could not save — try again.' })
  const onOk = () => { invalidate(); setSave({ status: 'saved' }) }
  const create = trpc.menu.create.useMutation({ onSuccess: onOk, onError: onErr })
  const update = trpc.menu.update.useMutation({ onSuccess: onOk, onError: onErr })
  const del = trpc.menu.delete.useMutation({ onSuccess: onOk, onError: onErr })
  const reorder = trpc.menu.reorder.useMutation({ onSuccess: onOk, onError: onErr })
  const [editing, setEditing] = useState<string | 'new' | null>(null)

  if (list.isLoading) return <p>Loading menu…</p>
  const items = list.data ?? []

  function move(index: number, dir: -1 | 1) {
    const ids = items.map((i) => i.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    const tmp = ids[index]
    ids[index] = ids[j]
    ids[j] = tmp
    reorder.mutate({ ids })
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2>Menu</h2>
        <div className="admin-actions">
          <SaveStatus state={save} />
          <button onClick={() => { setEditing('new'); setSave({ status: 'idle' }) }}>+ Add pizza</button>
        </div>
      </div>

      {editing === 'new' && (
        <MenuItemForm
          submitting={create.isPending}
          onSubmit={async (v) => {
            setSave({ status: 'saving' })
            await create.mutateAsync(v)
            setEditing(null)
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <ul className="admin-list">
        {items.map((it, index) => (
          <li key={it.id}>
            {editing === it.id ? (
              <MenuItemForm
                initial={it}
                submitting={update.isPending}
                onSubmit={async (v) => {
                  setSave({ status: 'saving' })
                  await update.mutateAsync({ id: it.id, ...v })
                  setEditing(null)
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="admin-row">
                <span className="admin-row-name">{it.name}</span>
                <span className="admin-row-price">{it.price}</span>
                {!it.available && <span className="admin-muted">hidden</span>}
                <button onClick={() => move(index, -1)} aria-label={`Move ${it.name} up`}>↑</button>
                <button onClick={() => move(index, 1)} aria-label={`Move ${it.name} down`}>↓</button>
                <button onClick={() => setEditing(it.id)}>Edit</button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${it.name}?`)) del.mutate({ id: it.id })
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
