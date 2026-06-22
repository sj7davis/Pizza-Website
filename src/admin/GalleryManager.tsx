import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { trpc } from '../lib/trpc'
import { ImageUploadField } from './ImageUploadField'
import { SaveStatus, type SaveState } from './SaveStatus'

interface GalleryRow {
  id: string
  url: string
  caption: string
  sortOrder: number
  createdAt: Date
}

function SortableRow({
  item,
  onDelete,
  onUpdate,
  saving,
}: {
  item: GalleryRow
  onDelete: (id: string) => void
  onUpdate: (id: string, caption: string) => void
  saving: boolean
}) {
  const [caption, setCaption] = useState(item.caption)
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li ref={setNodeRef} style={style} className="admin-row">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        style={{ cursor: 'grab', background: 'transparent', border: 'none', color: 'var(--muted)', padding: '0 8px', fontSize: '18px' }}
      >
        &#9776;
      </button>
      <img src={item.url} alt={item.caption || 'Gallery photo'} className="admin-thumb" />
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        aria-label="Caption"
        style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--hairline)', borderRadius: '4px', font: 'inherit', fontSize: '13px' }}
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => onUpdate(item.id, caption)}
        style={{ padding: '6px 10px', fontSize: '13px' }}
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm('Delete this photo?')) onDelete(item.id)
        }}
        style={{ padding: '6px 10px', fontSize: '13px' }}
      >
        Delete
      </button>
    </li>
  )
}

export function GalleryManager() {
  const utils = trpc.useUtils()
  const list = trpc.gallery.list.useQuery()
  const invalidate = () => utils.gallery.list.invalidate()
  const [save, setSave] = useState<SaveState>({ status: 'idle' })
  const onErr = () => setSave({ status: 'error', message: 'Could not save — try again.' })
  const onOk = () => { invalidate(); setSave({ status: 'saved' }) }

  const create = trpc.gallery.create.useMutation({ onSuccess: onOk, onError: onErr })
  const update = trpc.gallery.update.useMutation({ onSuccess: onOk, onError: onErr })
  const del = trpc.gallery.delete.useMutation({ onSuccess: onOk, onError: onErr })
  const reorder = trpc.gallery.reorder.useMutation({ onSuccess: onOk, onError: onErr })

  const [newUrl, setNewUrl] = useState<string | null>(null)
  const [newCaption, setNewCaption] = useState('')
  const [adding, setAdding] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (list.isLoading) return <p>Loading gallery…</p>
  const items = list.data ?? []

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex)
    reorder.mutate({ ids: reordered.map((i) => i.id) })
  }

  async function handleAdd() {
    if (!newUrl) return
    setSave({ status: 'saving' })
    await create.mutateAsync({ url: newUrl, caption: newCaption })
    setNewUrl(null)
    setNewCaption('')
    setAdding(false)
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <h2>Gallery</h2>
        <div className="admin-actions">
          <SaveStatus state={save} />
          <button onClick={() => { setAdding(true); setSave({ status: 'idle' }) }}>+ Add photo</button>
        </div>
      </div>

      {adding && (
        <div className="admin-form">
          <ImageUploadField value={newUrl} onChange={setNewUrl} />
          <label>
            Caption (optional)
            <input
              type="text"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="e.g. Margherita fresh from the stone deck"
              maxLength={200}
            />
          </label>
          <div className="admin-actions">
            <button type="button" disabled={!newUrl || create.isPending} onClick={handleAdd}>
              Save photo
            </button>
            <button type="button" onClick={() => { setAdding(false); setNewUrl(null); setNewCaption('') }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !adding && (
        <p className="admin-muted">No photos yet — add one above.</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="admin-list">
            {items.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
                saving={update.isPending}
                onDelete={(id) => del.mutate({ id })}
                onUpdate={(id, caption) => {
                  setSave({ status: 'saving' })
                  update.mutate({ id, url: item.url, caption })
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  )
}
