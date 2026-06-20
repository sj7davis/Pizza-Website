import { useState, type FormEvent } from 'react'
import { ImageUploadField } from './ImageUploadField'

export interface MenuFormValues {
  name: string
  tagline: string
  description: string
  price: string
  image: string | null
  available: boolean
}

export function MenuItemForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<MenuFormValues>
  submitting?: boolean
  onSubmit: (v: MenuFormValues) => void
  onCancel: () => void
}) {
  const [v, setV] = useState<MenuFormValues>({
    name: initial?.name ?? '',
    tagline: initial?.tagline ?? '',
    description: initial?.description ?? '',
    price: initial?.price ?? '',
    image: initial?.image ?? null,
    available: initial?.available ?? true,
  })

  function set<K extends keyof MenuFormValues>(k: K, val: MenuFormValues[K]) {
    setV((prev) => ({ ...prev, [k]: val }))
  }
  function submit(e: FormEvent) {
    e.preventDefault()
    onSubmit(v)
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label>Name<input value={v.name} onChange={(e) => set('name', e.target.value)} required /></label>
      <label>Tagline<input value={v.tagline} onChange={(e) => set('tagline', e.target.value)} required /></label>
      <label>Description<textarea value={v.description} onChange={(e) => set('description', e.target.value)} required /></label>
      <label>Price<input value={v.price} onChange={(e) => set('price', e.target.value)} required /></label>
      <ImageUploadField value={v.image} onChange={(url) => set('image', url)} />
      <label className="admin-check">
        <input type="checkbox" checked={v.available} onChange={(e) => set('available', e.target.checked)} /> Available
      </label>
      <div className="admin-actions">
        <button type="submit" disabled={submitting}>Save</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}
