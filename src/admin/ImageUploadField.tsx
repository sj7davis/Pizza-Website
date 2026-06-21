import { useState, type ChangeEvent } from 'react'

export function ImageUploadField({
  value,
  onChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('upload failed')
      const data = (await res.json()) as { url: string }
      onChange(data.url)
    } catch {
      setError('Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-image">
      <span>Image</span>
      {value ? (
        <img src={value} alt="" className="admin-thumb" />
      ) : (
        <span className="admin-muted">No image yet</span>
      )}
      <input type="file" accept="image/*" aria-label="Upload image" onChange={pick} disabled={busy} />
      {value && (
        <button type="button" onClick={() => onChange(null)}>
          Remove
        </button>
      )}
      {error && <p className="admin-error" role="alert">{error}</p>}
    </div>
  )
}
