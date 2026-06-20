import { useState } from 'react'
import { trpc } from '../lib/trpc'
import { MenuItemForm } from './MenuItemForm'

export function MenuManager() {
  const utils = trpc.useUtils()
  const list = trpc.menu.list.useQuery()
  const invalidate = () => utils.menu.list.invalidate()
  const create = trpc.menu.create.useMutation({ onSuccess: invalidate })
  const update = trpc.menu.update.useMutation({ onSuccess: invalidate })
  const del = trpc.menu.delete.useMutation({ onSuccess: invalidate })
  const reorder = trpc.menu.reorder.useMutation({ onSuccess: invalidate })
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
        <button onClick={() => setEditing('new')}>+ Add pizza</button>
      </div>

      {editing === 'new' && (
        <MenuItemForm
          submitting={create.isPending}
          onSubmit={async (v) => {
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
