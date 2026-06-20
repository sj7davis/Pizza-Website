# PBV Slice 2 · Phase C — Admin Console UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/admin` console — owner login, a menu manager (add/edit/delete/reorder/availability/image), and a brand-text editor — talking to the Phase B tRPC admin routers.

**Architecture:** A second React route (`/admin/*`) in the existing SPA. `AdminApp` gates on `trpc.auth.me`: shows `Login` when signed out, `Dashboard` (Menu + Brand tabs) when signed in. Components call the typed `trpc` admin procedures and invalidate queries via `trpc.useUtils()`. Image upload posts multipart to `/api/admin/upload`. Tests mock the `trpc` module so components are unit-tested without a server.

**Tech Stack:** React 18, react-router-dom, @trpc/react-query, Vitest + RTL.

**Project root:** `C:\Users\Main PC\Documents\PBV`, branch `feat/admin-backend`. Git Bash on Windows. Client tests run under jsdom by default. Single-file test: `npx vitest run <path>`; full suite: `npm run test`.

**Spec:** `docs/superpowers/specs/2026-06-20-pbv-admin-backend-design.md` §8.

---

## File Structure (Phase C)

```
src/admin/
  AdminApp.tsx            # CREATE: auth gate (me query → Login | Dashboard)
  Login.tsx              # CREATE: email+password form
  Dashboard.tsx          # CREATE: top bar (tabs + logout) + Menu/Brand panels
  MenuManager.tsx        # CREATE: list + add/edit/delete/reorder/availability
  MenuItemForm.tsx       # CREATE: controlled form for one item
  ImageUploadField.tsx   # CREATE: file → POST /api/admin/upload → url
  BrandEditor.tsx        # CREATE: site content form (row<->nested mapping)
  admin.css              # CREATE: functional admin styling
  __tests__/Login.test.tsx
  __tests__/ImageUploadField.test.tsx
  __tests__/MenuManager.test.tsx
  __tests__/BrandEditor.test.tsx
  __tests__/AdminApp.test.tsx
src/main.tsx             # MODIFY: add <Route path="/admin/*" element={<AdminApp/>} />
```

**Mocking convention (all admin tests):** each test file calls `vi.mock('../../lib/trpc', () => ({ trpc: {...} }))` providing only the hooks that component uses. Hooks return plain objects (e.g. `useQuery → { data, isLoading }`, `useMutation → { mutateAsync, mutate, isPending }`, `useUtils → { ... invalidate: vi.fn() }`). This keeps components server-free in tests.

---

### Task 1: Login + admin route + AdminApp shell

**Files:**
- Create: `src/admin/Login.tsx`, `src/admin/AdminApp.tsx`, `src/admin/admin.css`, `src/admin/__tests__/Login.test.tsx`, `src/admin/__tests__/AdminApp.test.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Write the failing test** `src/admin/__tests__/Login.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const loginMutate = vi.fn()
vi.mock('../../lib/trpc', () => ({
  trpc: { auth: { login: { useMutation: () => ({ mutateAsync: loginMutate, isPending: false }) } } },
}))

import { Login } from '../Login'

beforeEach(() => loginMutate.mockReset())

describe('Login', () => {
  it('submits the entered credentials and calls onSuccess', async () => {
    loginMutate.mockResolvedValue({ id: 'u1', email: 'owner@pbv.co' })
    const onSuccess = vi.fn()
    render(<Login onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'owner@pbv.co' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(loginMutate).toHaveBeenCalledWith({ email: 'owner@pbv.co', password: 'pw' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('shows an error when login fails', async () => {
    loginMutate.mockRejectedValue(new Error('bad'))
    render(<Login onSuccess={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'x@y.co' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'no' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/admin/__tests__/Login.test.tsx`
Expected: FAIL — cannot find module `../Login`.

- [ ] **Step 3: Implement `src/admin/Login.tsx`**

```tsx
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
      <h1>PBV Admin</h1>
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/admin/__tests__/Login.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing test** `src/admin/__tests__/AdminApp.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const meState = { data: undefined as unknown, isLoading: false }
vi.mock('../../lib/trpc', () => ({
  trpc: {
    auth: { me: { useQuery: () => meState }, login: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) }, logout: { useMutation: () => ({ mutateAsync: vi.fn() }) } },
    useUtils: () => ({ auth: { me: { invalidate: vi.fn() } } }),
  },
}))
vi.mock('../Dashboard', () => ({ Dashboard: () => <div>DASHBOARD</div> }))

import { AdminApp } from '../AdminApp'

describe('AdminApp', () => {
  it('shows Login when signed out', () => {
    meState.data = null
    meState.isLoading = false
    render(<AdminApp />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
  it('shows the Dashboard when signed in', () => {
    meState.data = { id: 'u1', email: 'owner@pbv.co' }
    meState.isLoading = false
    render(<AdminApp />)
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run it (FAIL), implement `src/admin/AdminApp.tsx`, run again (PASS)**

`src/admin/AdminApp.tsx`:
```tsx
import { trpc } from '../lib/trpc'
import { Login } from './Login'
import { Dashboard } from './Dashboard'
import './admin.css'

export function AdminApp() {
  const me = trpc.auth.me.useQuery()
  const utils = trpc.useUtils()
  if (me.isLoading) return <div className="admin-shell">Loading…</div>
  if (!me.data) return <Login onSuccess={() => utils.auth.me.invalidate()} />
  return <Dashboard user={me.data} />
}
```

Run: `npx vitest run src/admin/__tests__/AdminApp.test.tsx`
Expected: PASS (the `Dashboard` is mocked in this test, so it need not exist yet — but `import './Dashboard'` must resolve. Create a minimal placeholder `src/admin/Dashboard.tsx` now to satisfy the import; Task 5 replaces it):
```tsx
export function Dashboard({ user }: { user: { email: string } }) {
  return <div className="admin-shell">Signed in as {user.email}</div>
}
```

- [ ] **Step 7: Create `src/admin/admin.css`**

```css
.admin-shell { max-width: 880px; margin: 0 auto; padding: 32px 20px; font-family: var(--font-ui, system-ui, sans-serif); color: var(--ink, #15140f); }
.admin-login { max-width: 360px; margin: 12vh auto; display: flex; flex-direction: column; gap: 14px; }
.admin-login h1 { font-family: var(--font-display, serif); margin: 0 0 8px; }
.admin-login label, .admin-form label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.admin-login input, .admin-form input, .admin-form textarea { padding: 9px 11px; border: 1px solid var(--hairline, #ccc); border-radius: 4px; font: inherit; }
.admin-form textarea { min-height: 84px; resize: vertical; }
button { font: inherit; cursor: pointer; padding: 9px 16px; border: 1px solid var(--ink, #15140f); background: var(--ink, #15140f); color: var(--paper, #f6f5f1); border-radius: 3px; }
button[disabled] { opacity: 0.5; cursor: default; }
.admin-error { color: #a3271d; font-size: 13px; margin: 0; }
.admin-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--hairline, #ddd); padding-bottom: 14px; margin-bottom: 22px; }
.admin-top nav { display: flex; gap: 8px; }
.admin-top button { background: transparent; color: var(--ink, #15140f); }
.admin-top button[aria-pressed="true"] { background: var(--ink, #15140f); color: var(--paper, #f6f5f1); }
.admin-panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.admin-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.admin-row { display: flex; align-items: center; gap: 12px; border: 1px solid var(--hairline, #e0ddd3); border-radius: 6px; padding: 10px 12px; }
.admin-row-name { font-weight: 600; flex: 1; }
.admin-row-price { font-family: var(--font-mono, monospace); }
.admin-row button, .admin-actions button { padding: 6px 10px; font-size: 13px; }
.admin-form { display: flex; flex-direction: column; gap: 12px; border: 1px solid var(--hairline, #e0ddd3); border-radius: 6px; padding: 16px; margin: 8px 0; }
.admin-actions { display: flex; gap: 8px; }
.admin-image { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.admin-thumb { width: 120px; height: 90px; object-fit: cover; border-radius: 4px; }
.admin-muted { color: #888; }
.admin-check { flex-direction: row !important; align-items: center; gap: 8px; }
```

- [ ] **Step 8: Wire the route in `src/main.tsx`**

Add the import near the top:
```tsx
import { AdminApp } from './admin/AdminApp'
```
And add a route inside `<Routes>` BEFORE the catch-all `/*` route:
```tsx
            <Route path="/admin/*" element={<AdminApp />} />
```
(So `<Routes>` contains the `/admin/*` route, then the existing `<Route path="/*" element={<App />} />`.)

- [ ] **Step 9: Run full suite + build**

Run: `npm run test` — expect all pass (existing + Login + AdminApp).
Run: `npm run build` — expect clean.

- [ ] **Step 10: Commit**

```bash
git add src/admin/Login.tsx src/admin/AdminApp.tsx src/admin/Dashboard.tsx src/admin/admin.css src/admin/__tests__/Login.test.tsx src/admin/__tests__/AdminApp.test.tsx src/main.tsx
git commit -m "feat(admin): /admin route, auth-gated AdminApp, Login"
```

---

### Task 2: ImageUploadField

**Files:**
- Create: `src/admin/ImageUploadField.tsx`, `src/admin/__tests__/ImageUploadField.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/admin/__tests__/ImageUploadField.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImageUploadField } from '../ImageUploadField'

beforeEach(() => { vi.restoreAllMocks() })

describe('ImageUploadField', () => {
  it('uploads the chosen file and reports the returned url', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: () => Promise.resolve({ url: '/uploads/abc.jpg' }),
    }))
    const onChange = vi.fn()
    render(<ImageUploadField value={null} onChange={onChange} />)
    const file = new File(['x'], 'pizza.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText(/upload image/i), { target: { files: [file] } })
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/uploads/abc.jpg'))
    expect(fetch).toHaveBeenCalledWith('/api/admin/upload', expect.objectContaining({ method: 'POST' }))
  })

  it('shows an error when the upload fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'nope' }) }))
    render(<ImageUploadField value={null} onChange={vi.fn()} />)
    const file = new File(['x'], 'p.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText(/upload image/i), { target: { files: [file] } })
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed/i)
  })

  it('clears the image when Remove is clicked', () => {
    const onChange = vi.fn()
    render(<ImageUploadField value="/uploads/x.jpg" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /remove/i }))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/admin/__tests__/ImageUploadField.test.tsx`
Expected: FAIL — cannot find module `../ImageUploadField`.

- [ ] **Step 3: Implement `src/admin/ImageUploadField.tsx`**

```tsx
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
      {value ? <img src={value} alt="" className="admin-thumb" /> : <span className="admin-muted">No image yet</span>}
      <input type="file" accept="image/*" aria-label="Upload image" onChange={pick} disabled={busy} />
      {value && (
        <button type="button" onClick={() => onChange(null)}>Remove</button>
      )}
      {error && <p className="admin-error" role="alert">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/admin/__tests__/ImageUploadField.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/ImageUploadField.tsx src/admin/__tests__/ImageUploadField.test.tsx
git commit -m "feat(admin): image upload field"
```

---

### Task 3: MenuManager + MenuItemForm

**Files:**
- Create: `src/admin/MenuItemForm.tsx`, `src/admin/MenuManager.tsx`, `src/admin/__tests__/MenuManager.test.tsx`

- [ ] **Step 1: Implement `src/admin/MenuItemForm.tsx`** (no separate test — exercised via MenuManager test)

```tsx
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
```

- [ ] **Step 2: Write the failing test** `src/admin/__tests__/MenuManager.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const listState = { data: [] as unknown[], isLoading: false }
const createMutate = vi.fn().mockResolvedValue({ id: 'new' })
const deleteMutate = vi.fn()
const invalidate = vi.fn()

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ menu: { list: { invalidate } } }),
    menu: {
      list: { useQuery: () => listState },
      create: { useMutation: () => ({ mutateAsync: createMutate, isPending: false }) },
      update: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      delete: { useMutation: () => ({ mutate: deleteMutate, mutateAsync: deleteMutate, isPending: false }) },
      reorder: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}))
vi.mock('../ImageUploadField', () => ({ ImageUploadField: () => <div>image-field</div> }))

import { MenuManager } from '../MenuManager'

beforeEach(() => {
  listState.data = [
    { id: '1', name: 'Margherita', tagline: 't', description: 'd', price: '$22', image: null, available: true },
    { id: '2', name: 'Nduja', tagline: 't', description: 'd', price: '$26', image: null, available: false },
  ]
  createMutate.mockClear()
  deleteMutate.mockClear()
})

describe('MenuManager', () => {
  it('lists items with names and prices', () => {
    render(<MenuManager />)
    expect(screen.getByText('Margherita')).toBeInTheDocument()
    expect(screen.getByText('$26')).toBeInTheDocument()
  })

  it('opens the add form and creates a new item', async () => {
    render(<MenuManager />)
    fireEvent.click(screen.getByRole('button', { name: /add pizza/i }))
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Capricciosa' } })
    fireEvent.change(screen.getByLabelText(/tagline/i), { target: { value: 'four corners' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'ham etc' } })
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: '$28' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() =>
      expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Capricciosa', price: '$28' })),
    )
  })

  it('deletes an item after confirmation', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    render(<MenuManager />)
    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    expect(deleteMutate).toHaveBeenCalledWith({ id: '1' })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/admin/__tests__/MenuManager.test.tsx`
Expected: FAIL — cannot find module `../MenuManager`.

- [ ] **Step 4: Implement `src/admin/MenuManager.tsx`**

```tsx
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
```

> Note: `list.data` items are Prisma rows typed via `AppRouter`, so `it.id`, `it.name`, `it.price`, `it.available`, `it.image` are all present and typed. `MenuItemForm`'s `initial` accepts a `Partial<MenuFormValues>`; the row is structurally compatible (extra `id`/`sortOrder`/timestamps are ignored).

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/admin/__tests__/MenuManager.test.tsx`
Expected: PASS. Also `npm run build` (clean).

- [ ] **Step 6: Commit**

```bash
git add src/admin/MenuItemForm.tsx src/admin/MenuManager.tsx src/admin/__tests__/MenuManager.test.tsx
git commit -m "feat(admin): menu manager (CRUD, reorder, availability)"
```

---

### Task 4: BrandEditor

**Files:**
- Create: `src/admin/BrandEditor.tsx`, `src/admin/__tests__/BrandEditor.test.tsx`

- [ ] **Step 1: Write the failing test** `src/admin/__tests__/BrandEditor.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const getState = { data: undefined as unknown, isLoading: false }
const updateMutate = vi.fn().mockResolvedValue({})
const invalidate = vi.fn()

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ site: { get: { invalidate } } }),
    site: {
      get: { useQuery: () => getState },
      update: { useMutation: () => ({ mutateAsync: updateMutate, isPending: false }) },
    },
  },
}))

import { BrandEditor } from '../BrandEditor'

beforeEach(() => {
  updateMutate.mockClear()
  getState.data = {
    brandName: 'PBV', tagline: 'tag', uberEatsUrl: '#',
    storyEyebrow: 'Our story', storyHeading: 'Heading', storyParagraphs: ['Para one.', 'Para two.'],
    storyPullquote: 'Quote', storyEstablished: 'est',
    deliveryArea: 'Airport West', deliveryHours: '5-9pm',
    socials: [{ label: 'Instagram', href: '#ig' }],
  }
})

describe('BrandEditor', () => {
  it('prefills the form from site content', () => {
    render(<BrandEditor />)
    expect(screen.getByLabelText(/brand name/i)).toHaveValue('PBV')
    expect(screen.getByLabelText(/heading/i)).toHaveValue('Heading')
  })

  it('saves the assembled nested input', async () => {
    render(<BrandEditor />)
    fireEvent.change(screen.getByLabelText(/heading/i), { target: { value: 'New heading' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    const arg = updateMutate.mock.calls[0][0]
    expect(arg.story.heading).toBe('New heading')
    expect(arg.story.paragraphs).toEqual(['Para one.', 'Para two.'])
    expect(arg.delivery.area).toBe('Airport West')
    expect(arg.socials[0]).toEqual({ label: 'Instagram', href: '#ig' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/admin/__tests__/BrandEditor.test.tsx`
Expected: FAIL — cannot find module `../BrandEditor`.

- [ ] **Step 3: Implement `src/admin/BrandEditor.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { trpc } from '../lib/trpc'

interface SocialRow { label: string; href: string }
interface BrandForm {
  brandName: string
  tagline: string
  uberEatsUrl: string
  eyebrow: string
  heading: string
  paragraphs: string // blank-line separated
  pullquote: string
  established: string
  area: string
  hours: string
  socials: SocialRow[]
}

interface SiteRow {
  brandName: string; tagline: string; uberEatsUrl: string
  storyEyebrow: string; storyHeading: string; storyParagraphs: string[]
  storyPullquote: string; storyEstablished: string
  deliveryArea: string; deliveryHours: string; socials: SocialRow[]
}

function rowToForm(r: SiteRow): BrandForm {
  return {
    brandName: r.brandName, tagline: r.tagline, uberEatsUrl: r.uberEatsUrl,
    eyebrow: r.storyEyebrow, heading: r.storyHeading,
    paragraphs: r.storyParagraphs.join('\n\n'),
    pullquote: r.storyPullquote, established: r.storyEstablished,
    area: r.deliveryArea, hours: r.deliveryHours,
    socials: r.socials.length ? r.socials : [{ label: '', href: '' }],
  }
}

function formToInput(f: BrandForm) {
  return {
    brandName: f.brandName,
    tagline: f.tagline,
    uberEatsUrl: f.uberEatsUrl,
    story: {
      eyebrow: f.eyebrow,
      heading: f.heading,
      paragraphs: f.paragraphs.split(/\n\n+/).map((s) => s.trim()).filter(Boolean),
      pullquote: f.pullquote,
      established: f.established,
    },
    delivery: { area: f.area, hours: f.hours },
    socials: f.socials.filter((s) => s.label && s.href),
  }
}

export function BrandEditor() {
  const utils = trpc.useUtils()
  const get = trpc.site.get.useQuery()
  const update = trpc.site.update.useMutation({ onSuccess: () => utils.site.get.invalidate() })
  const [form, setForm] = useState<BrandForm | null>(null)
  const [saved, setSaved] = useState(false)

  if (get.isLoading) return <p>Loading…</p>
  const data = (form ?? (get.data ? rowToForm(get.data as SiteRow) : null))
  if (!data) return <p>No site content yet — seed the database first.</p>

  function set<K extends keyof BrandForm>(k: K, val: BrandForm[K]) {
    setForm({ ...data!, [k]: val })
  }
  function setSocial(i: number, key: keyof SocialRow, val: string) {
    const socials = data!.socials.map((s, idx) => (idx === i ? { ...s, [key]: val } : s))
    setForm({ ...data!, socials })
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    await update.mutateAsync(formToInput(data!))
    setSaved(true)
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <h2>Brand</h2>
      <label>Brand name<input value={data.brandName} onChange={(e) => set('brandName', e.target.value)} /></label>
      <label>Hero tagline<input value={data.tagline} onChange={(e) => set('tagline', e.target.value)} /></label>
      <label>Uber Eats URL<input value={data.uberEatsUrl} onChange={(e) => set('uberEatsUrl', e.target.value)} /></label>
      <label>Story eyebrow<input value={data.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></label>
      <label>Story heading<input value={data.heading} onChange={(e) => set('heading', e.target.value)} /></label>
      <label>Story paragraphs (blank line between)<textarea value={data.paragraphs} onChange={(e) => set('paragraphs', e.target.value)} /></label>
      <label>Pull-quote<input value={data.pullquote} onChange={(e) => set('pullquote', e.target.value)} /></label>
      <label>Established line<input value={data.established} onChange={(e) => set('established', e.target.value)} /></label>
      <label>Delivery area<input value={data.area} onChange={(e) => set('area', e.target.value)} /></label>
      <label>Delivery hours<input value={data.hours} onChange={(e) => set('hours', e.target.value)} /></label>
      {data.socials.map((s, i) => (
        <div className="admin-actions" key={i}>
          <input placeholder="Label" value={s.label} onChange={(e) => setSocial(i, 'label', e.target.value)} aria-label={`Social ${i + 1} label`} />
          <input placeholder="Link" value={s.href} onChange={(e) => setSocial(i, 'href', e.target.value)} aria-label={`Social ${i + 1} link`} />
        </div>
      ))}
      <button type="button" onClick={() => setForm({ ...data, socials: [...data.socials, { label: '', href: '' }] })}>+ Add social</button>
      <div className="admin-actions">
        <button type="submit" disabled={update.isPending}>Save</button>
        {saved && <span className="admin-muted">Saved ✓</span>}
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/admin/__tests__/BrandEditor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/admin/BrandEditor.tsx src/admin/__tests__/BrandEditor.test.tsx
git commit -m "feat(admin): brand content editor"
```

---

### Task 5: Dashboard composition + final verification

**Files:**
- Modify: `src/admin/Dashboard.tsx`

- [ ] **Step 1: Replace `src/admin/Dashboard.tsx`**

```tsx
import { useState } from 'react'
import { trpc } from '../lib/trpc'
import { MenuManager } from './MenuManager'
import { BrandEditor } from './BrandEditor'

export function Dashboard({ user }: { user: { email: string } }) {
  const [tab, setTab] = useState<'menu' | 'brand'>('menu')
  const utils = trpc.useUtils()
  const logout = trpc.auth.logout.useMutation()

  async function signOut() {
    await logout.mutateAsync()
    utils.auth.me.invalidate()
  }

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <span>PBV Admin — {user.email}</span>
        <nav>
          <button onClick={() => setTab('menu')} aria-pressed={tab === 'menu'}>Menu</button>
          <button onClick={() => setTab('brand')} aria-pressed={tab === 'brand'}>Brand</button>
          <button onClick={signOut}>Log out</button>
        </nav>
      </header>
      {tab === 'menu' ? <MenuManager /> : <BrandEditor />}
    </div>
  )
}
```

- [ ] **Step 2: Update the AdminApp test's Dashboard mock expectation is unaffected** (the AdminApp test mocks `../Dashboard`, so the real Dashboard is not imported there). No test change needed.

- [ ] **Step 3: Run the full suite + build**

Run: `npm run test`
Expected: ALL pass (Login, AdminApp, ImageUploadField, MenuManager, BrandEditor + all existing client/server tests).
Run: `npm run build`
Expected: clean (`tsc -b && vite build`).
Run: `npx tsc -p tsconfig.server.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/admin/Dashboard.tsx
git commit -m "feat(admin): dashboard with menu/brand tabs + logout"
```

---

## Self-Review

**Spec coverage (§8 admin console):**
- `/admin` route + login screen when unauthenticated → Task 1 (route, AdminApp, Login). ✓
- Dashboard with Menu + Brand + logout → Task 5. ✓
- Menu manager: list, add, edit, delete, reorder, availability toggle, image upload → Tasks 2 (upload field) + 3 (manager/form). ✓
- Brand editor: story, tagline, delivery, socials, Uber Eats URL → Task 4. ✓
- Functional, lightly on-brand styling reusing theme tokens → Task 1 (admin.css). ✓
- Talks to Phase B routers (auth/menu/site) + upload route via typed trpc → all tasks. ✓
- Tests mock trpc so components are server-free → all tasks. ✓

**Placeholder scan:** No "TBD"/"implement later". Every code step is complete. The temporary `Dashboard` placeholder in Task 1 is explicitly replaced in Task 5 (and exists only so the AdminApp import resolves). ✓

**Type consistency:** `MenuFormValues` defined in Task 3, used by `MenuManager` (create/update calls spread it; `update` adds `id`). `trpc.auth/menu/site` hook names match the Phase B routers exactly (`auth.me/login/logout`, `menu.list/create/update/delete/reorder`, `site.get/update`). `trpc.useUtils()` invalidations target `auth.me`, `menu.list`, `site.get`. `Login` takes `onSuccess`; `Dashboard` takes `user`. `ImageUploadField` takes `{ value, onChange }`. `BrandEditor`'s `rowToForm`/`formToInput` round-trip matches the `SiteContent` row columns (Task B6) and the `siteUpdateInput` nested shape (Task B5). ✓

No gaps found for Phase C.
