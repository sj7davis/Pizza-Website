# PBB Order Moments · Plan B — Admin Editing + Save UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin full editing of the new fields (order-links list, open/close hours, timezone, sold-out toggle + message), and add clear "Saved ✓ / error / saving…" feedback across the menu and brand editors.

**Architecture:** Extend `BrandEditor`'s form (which already round-trips the new fields) with real inputs + an order-links list editor. Add a tiny shared `SaveStatus` component and a `SaveState` type; both `BrandEditor` and `MenuManager` track save status and surface success/failure. Tests mock the `trpc` module.

**Tech Stack:** React 18, TypeScript, Vitest + RTL.

**Project root:** `C:\Users\Main PC\Documents\PBV`, branch `feat/admin-backend`. Git Bash on Windows. Client tests jsdom. Single-file test: `npx vitest run <path>`; full: `npm run test`; build: `npm run build`.

**Spec:** `docs/superpowers/specs/2026-06-21-pbb-slice-order-moments-design.md` §5.

---

## File Structure

```
src/admin/
  SaveStatus.tsx                 # CREATE: presentational save state + SaveState type
  BrandEditor.tsx                # MODIFY: order-links editor + hours/timezone/sold-out inputs + save feedback
  MenuManager.tsx                # MODIFY: save feedback (saved/error) across create/update/delete
  admin.css                      # MODIFY: .admin-saved colour
  __tests__/SaveStatus.test.tsx  # CREATE
  __tests__/BrandEditor.test.tsx # MODIFY: assert new fields + save feedback
  __tests__/MenuManager.test.tsx # MODIFY: assert save feedback after create
```

---

### Task 1: SaveStatus component

**Files:**
- Create: `src/admin/SaveStatus.tsx`, `src/admin/__tests__/SaveStatus.test.tsx`
- Modify: `src/admin/admin.css`

- [ ] **Step 1: Write the failing test** `src/admin/__tests__/SaveStatus.test.tsx`

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SaveStatus } from '../SaveStatus'

describe('SaveStatus', () => {
  it('shows nothing when idle', () => {
    const { container } = render(<SaveStatus state={{ status: 'idle' }} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('shows saving / saved / error', () => {
    const { rerender } = render(<SaveStatus state={{ status: 'saving' }} />)
    expect(screen.getByText(/saving/i)).toBeInTheDocument()
    rerender(<SaveStatus state={{ status: 'saved' }} />)
    expect(screen.getByText(/saved/i)).toBeInTheDocument()
    rerender(<SaveStatus state={{ status: 'error', message: 'Could not save' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save')
  })
})
```

- [ ] **Step 2: Run it (FAIL), implement `src/admin/SaveStatus.tsx`, run (PASS)**

```tsx
export type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'error'; message: string }

export function SaveStatus({ state }: { state: SaveState }) {
  if (state.status === 'saving') return <span className="admin-muted">Saving…</span>
  if (state.status === 'saved') return <span className="admin-saved">Saved ✓</span>
  if (state.status === 'error') return <span className="admin-error" role="alert">{state.message}</span>
  return null
}
```
Run: `npx vitest run src/admin/__tests__/SaveStatus.test.tsx` → PASS.

- [ ] **Step 3: Add to `src/admin/admin.css`**

```css
.admin-saved { color: #2e7d46; font-size: 13px; }
```

- [ ] **Step 4: Commit**

```bash
git add src/admin/SaveStatus.tsx src/admin/__tests__/SaveStatus.test.tsx src/admin/admin.css
git commit -m "feat(admin): shared SaveStatus feedback component"
```

---

### Task 2: BrandEditor — order-links editor + hours/timezone/sold-out + save feedback

**Files:**
- Modify: `src/admin/BrandEditor.tsx`, `src/admin/__tests__/BrandEditor.test.tsx`

- [ ] **Step 1: Replace `src/admin/BrandEditor.tsx`** with the full version below

```tsx
import { useState, type FormEvent } from 'react'
import { trpc } from '../lib/trpc'
import { SaveStatus, type SaveState } from './SaveStatus'

interface SocialRow { label: string; href: string }
interface OrderRow { label: string; url: string }

interface BrandForm {
  brandName: string
  tagline: string
  orderLinks: OrderRow[]
  openTime: string
  closeTime: string
  timezone: string
  soldOut: boolean
  soldOutMessage: string
  eyebrow: string
  heading: string
  paragraphs: string
  pullquote: string
  established: string
  area: string
  hours: string
  socials: SocialRow[]
}

interface SiteRow {
  brandName: string
  tagline: string
  orderLinks: OrderRow[]
  openTime: string
  closeTime: string
  timezone: string
  soldOut: boolean
  soldOutMessage: string
  storyEyebrow: string
  storyHeading: string
  storyParagraphs: string[]
  storyPullquote: string
  storyEstablished: string
  deliveryArea: string
  deliveryHours: string
  socials: SocialRow[]
}

function rowToForm(r: SiteRow): BrandForm {
  return {
    brandName: r.brandName,
    tagline: r.tagline,
    orderLinks: r.orderLinks.length ? r.orderLinks : [{ label: '', url: '' }],
    openTime: r.openTime,
    closeTime: r.closeTime,
    timezone: r.timezone,
    soldOut: r.soldOut,
    soldOutMessage: r.soldOutMessage,
    eyebrow: r.storyEyebrow,
    heading: r.storyHeading,
    paragraphs: r.storyParagraphs.join('\n\n'),
    pullquote: r.storyPullquote,
    established: r.storyEstablished,
    area: r.deliveryArea,
    hours: r.deliveryHours,
    socials: r.socials.length ? r.socials : [{ label: '', href: '' }],
  }
}

function formToInput(f: BrandForm) {
  return {
    brandName: f.brandName,
    tagline: f.tagline,
    orderLinks: f.orderLinks.filter((l) => l.label && l.url),
    openTime: f.openTime,
    closeTime: f.closeTime,
    timezone: f.timezone,
    soldOut: f.soldOut,
    soldOutMessage: f.soldOutMessage,
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
  const [save, setSave] = useState<SaveState>({ status: 'idle' })

  if (get.isLoading) return <p>Loading…</p>
  const data = form ?? (get.data ? rowToForm(get.data as unknown as SiteRow) : null)
  if (!data) return <p>No site content yet — seed the database first.</p>

  function set<K extends keyof BrandForm>(k: K, val: BrandForm[K]) {
    setForm({ ...data!, [k]: val })
    setSave({ status: 'idle' })
  }
  function setSocial(i: number, key: keyof SocialRow, val: string) {
    set('socials', data!.socials.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)))
  }
  function setOrder(i: number, key: keyof OrderRow, val: string) {
    set('orderLinks', data!.orderLinks.map((l, idx) => (idx === i ? { ...l, [key]: val } : l)))
  }
  function moveOrder(i: number, dir: -1 | 1) {
    const next = [...data!.orderLinks]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    set('orderLinks', next)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSave({ status: 'saving' })
    try {
      await update.mutateAsync(formToInput(data!))
      setSave({ status: 'saved' })
    } catch {
      setSave({ status: 'error', message: 'Could not save — check the fields and try again.' })
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <h2>Brand</h2>
      <label>Brand name<input value={data.brandName} onChange={(e) => set('brandName', e.target.value)} /></label>
      <label>Hero tagline<input value={data.tagline} onChange={(e) => set('tagline', e.target.value)} /></label>

      <fieldset className="admin-fieldset">
        <legend>Order links</legend>
        {data.orderLinks.map((l, i) => (
          <div className="admin-actions" key={i}>
            <input placeholder="Label (e.g. Uber Eats)" value={l.label} onChange={(e) => setOrder(i, 'label', e.target.value)} aria-label={`Order link ${i + 1} label`} />
            <input placeholder="https://…" value={l.url} onChange={(e) => setOrder(i, 'url', e.target.value)} aria-label={`Order link ${i + 1} url`} />
            <button type="button" onClick={() => moveOrder(i, -1)} aria-label={`Move order link ${i + 1} up`}>↑</button>
            <button type="button" onClick={() => moveOrder(i, 1)} aria-label={`Move order link ${i + 1} down`}>↓</button>
            <button type="button" onClick={() => set('orderLinks', data.orderLinks.filter((_, idx) => idx !== i))} aria-label={`Remove order link ${i + 1}`}>✕</button>
          </div>
        ))}
        <button type="button" onClick={() => set('orderLinks', [...data.orderLinks, { label: '', url: '' }])}>+ Add order link</button>
      </fieldset>

      <fieldset className="admin-fieldset">
        <legend>Hours &amp; availability</legend>
        <label>Opens (24h HH:MM)<input value={data.openTime} onChange={(e) => set('openTime', e.target.value)} placeholder="17:00" /></label>
        <label>Closes (24h HH:MM)<input value={data.closeTime} onChange={(e) => set('closeTime', e.target.value)} placeholder="21:00" /></label>
        <label>Timezone<input value={data.timezone} onChange={(e) => set('timezone', e.target.value)} placeholder="Australia/Melbourne" /></label>
        <label className="admin-check"><input type="checkbox" checked={data.soldOut} onChange={(e) => set('soldOut', e.target.checked)} /> Sold out / paused tonight</label>
        <label>Sold-out message<input value={data.soldOutMessage} onChange={(e) => set('soldOutMessage', e.target.value)} /></label>
      </fieldset>

      <label>Story eyebrow<input value={data.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} /></label>
      <label>Story heading<input value={data.heading} onChange={(e) => set('heading', e.target.value)} /></label>
      <label>Story paragraphs (blank line between)<textarea value={data.paragraphs} onChange={(e) => set('paragraphs', e.target.value)} /></label>
      <label>Pull-quote<input value={data.pullquote} onChange={(e) => set('pullquote', e.target.value)} /></label>
      <label>Established line<input value={data.established} onChange={(e) => set('established', e.target.value)} /></label>
      <label>Delivery area<input value={data.area} onChange={(e) => set('area', e.target.value)} /></label>
      <label>Delivery hours (display text)<input value={data.hours} onChange={(e) => set('hours', e.target.value)} /></label>

      {data.socials.map((s, i) => (
        <div className="admin-actions" key={i}>
          <input placeholder="Label" value={s.label} onChange={(e) => setSocial(i, 'label', e.target.value)} aria-label={`Social ${i + 1} label`} />
          <input placeholder="Link" value={s.href} onChange={(e) => setSocial(i, 'href', e.target.value)} aria-label={`Social ${i + 1} link`} />
        </div>
      ))}
      <button type="button" onClick={() => set('socials', [...data.socials, { label: '', href: '' }])}>+ Add social</button>

      <div className="admin-actions">
        <button type="submit" disabled={save.status === 'saving'}>Save</button>
        <SaveStatus state={save} />
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Add to `src/admin/admin.css`**

```css
.admin-fieldset { border: 1px solid var(--hairline, #e0ddd3); border-radius: 6px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.admin-fieldset legend { font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted, #888); padding: 0 6px; }
```

- [ ] **Step 3: Replace `src/admin/__tests__/BrandEditor.test.tsx`**

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
  updateMutate.mockReset().mockResolvedValue({})
  getState.data = {
    brandName: 'PBB', tagline: 'tag',
    orderLinks: [{ label: 'Uber Eats', url: '#ue' }],
    openTime: '17:00', closeTime: '21:00', timezone: 'Australia/Melbourne',
    soldOut: false, soldOutMessage: 'Sold out tonight',
    storyEyebrow: 'Our story', storyHeading: 'Heading', storyParagraphs: ['Para one.', 'Para two.'],
    storyPullquote: 'Quote', storyEstablished: 'est',
    deliveryArea: 'Airport West', deliveryHours: '5-9pm',
    socials: [{ label: 'Instagram', href: '#ig' }],
  }
})

describe('BrandEditor', () => {
  it('prefills order link, hours and sold-out fields', () => {
    render(<BrandEditor />)
    expect(screen.getByLabelText(/order link 1 label/i)).toHaveValue('Uber Eats')
    expect(screen.getByLabelText(/order link 1 url/i)).toHaveValue('#ue')
    expect(screen.getByLabelText(/opens \(24h/i)).toHaveValue('17:00')
    expect(screen.getByLabelText(/sold out/i)).not.toBeChecked()
  })

  it('saves the assembled input and shows Saved', async () => {
    render(<BrandEditor />)
    fireEvent.change(screen.getByLabelText(/order link 1 url/i), { target: { value: 'https://ubereats.com/pbb' } })
    fireEvent.click(screen.getByLabelText(/sold out/i))
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalled())
    const arg = updateMutate.mock.calls[0][0]
    expect(arg.orderLinks[0]).toEqual({ label: 'Uber Eats', url: 'https://ubereats.com/pbb' })
    expect(arg.soldOut).toBe(true)
    expect(arg.openTime).toBe('17:00')
    expect(await screen.findByText(/saved/i)).toBeInTheDocument()
  })

  it('shows an error when saving fails', async () => {
    updateMutate.mockRejectedValue(new Error('bad'))
    render(<BrandEditor />)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not save/i)
  })
})
```

- [ ] **Step 4: Run + verify**

Run: `npx vitest run src/admin/__tests__/BrandEditor.test.tsx` → PASS. Then `npm run test` (all pass) and `npm run build` (clean).

- [ ] **Step 5: Commit**

```bash
git add src/admin/BrandEditor.tsx src/admin/__tests__/BrandEditor.test.tsx src/admin/admin.css
git commit -m "feat(admin): edit order links, hours, timezone, sold-out + save feedback"
```

---

### Task 3: MenuManager save feedback

**Files:**
- Modify: `src/admin/MenuManager.tsx`, `src/admin/__tests__/MenuManager.test.tsx`

- [ ] **Step 1: Update `src/admin/MenuManager.tsx`** — add a shared save state shown in the header, set on create/update/delete success/error.

At the top of the component add:
```tsx
  const [save, setSave] = useState<SaveState>({ status: 'idle' })
```
Add the import: `import { SaveStatus, type SaveState } from './SaveStatus'`.

Change the mutations to set save state. Replace the `create`/`update`/`del` declarations with:
```tsx
  const onErr = () => setSave({ status: 'error', message: 'Could not save — try again.' })
  const onOk = () => { invalidate(); setSave({ status: 'saved' }) }
  const create = trpc.menu.create.useMutation({ onSuccess: onOk, onError: onErr })
  const update = trpc.menu.update.useMutation({ onSuccess: onOk, onError: onErr })
  const del = trpc.menu.delete.useMutation({ onSuccess: onOk, onError: onErr })
  const reorder = trpc.menu.reorder.useMutation({ onSuccess: onOk, onError: onErr })
```
(Keep the existing `invalidate` definition above these; `onOk` calls it.)

In the create/update `onSubmit` handlers, set `setSave({ status: 'saving' })` before `await … mutateAsync(...)`. E.g. the add form's `onSubmit`:
```tsx
          onSubmit={async (v) => {
            setSave({ status: 'saving' })
            await create.mutateAsync(v)
            setEditing(null)
          }}
```
and the edit form's `onSubmit`:
```tsx
                onSubmit={async (v) => {
                  setSave({ status: 'saving' })
                  await update.mutateAsync({ id: it.id, ...v })
                  setEditing(null)
                }}
```

In the header (`admin-panel-head`), add the status next to the title:
```tsx
      <div className="admin-panel-head">
        <h2>Menu</h2>
        <div className="admin-actions">
          <SaveStatus state={save} />
          <button onClick={() => { setEditing('new'); setSave({ status: 'idle' }) }}>+ Add pizza</button>
        </div>
      </div>
```

- [ ] **Step 2: Update `src/admin/__tests__/MenuManager.test.tsx`** — assert "Saved ✓" after a create.

The existing mock returns `create.useMutation` as `{ mutateAsync, isPending }`. Update the mock so mutations accept the options object and invoke `onSuccess` (so the manager's `onOk` runs and sets saved). Replace the `menu.create/update/delete/reorder` mock entries with versions that call the passed `onSuccess`:
```tsx
    menu: {
      list: { useQuery: () => listState },
      create: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutateAsync: async (v: unknown) => { const r = await createMutate(v); o?.onSuccess?.(); return r }, isPending: false }) },
      update: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutateAsync: async (v: unknown) => { o?.onSuccess?.(); return v }, isPending: false }) },
      delete: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutate: (v: unknown) => { deleteMutate(v); o?.onSuccess?.() }, isPending: false }) },
      reorder: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutate: () => o?.onSuccess?.(), isPending: false }) },
    },
```
Then add to the "creates a new item" test, after the `createMutate` assertion:
```tsx
    expect(await screen.findByText(/saved/i)).toBeInTheDocument()
```
(Add `findByText` via the existing `screen` import; the test is already `async`.)

- [ ] **Step 3: Run + verify**

Run: `npx vitest run src/admin/__tests__/MenuManager.test.tsx` → PASS. Then `npm run test` + `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add src/admin/MenuManager.tsx src/admin/__tests__/MenuManager.test.tsx
git commit -m "feat(admin): save feedback in the menu manager"
```

---

### Task 4: Verify + deploy

- [ ] **Step 1:** `npm run test` (all pass), `npm run build` (clean), `npx tsc -p tsconfig.server.json` (no errors — unchanged but confirm).
- [ ] **Step 2:** `git push origin feat/admin-backend && railway up --detach --service pbb-app`
- [ ] **Step 3:** After deploy SUCCESS, log in to `/admin` → Brand tab shows order-links list + hours + sold-out; editing + Save shows "Saved ✓"; toggling Sold-out and saving makes the public site show the sold-out banner.

---

## Self-Review

**Spec coverage (§5):**
- Brand editor gains open/close + timezone + sold-out toggle + message → Task 2. ✓
- Order-links editor (add/remove/reorder) → Task 2. ✓
- Save reliability + "Saved ✓" + errors + pending across menu & brand → Tasks 1–3. ✓

**Placeholder scan:** No TBDs; complete code each step. ✓

**Type consistency:** `SaveState` (discriminated union) defined in Task 1, consumed by `SaveStatus`, `BrandEditor`, `MenuManager`. `OrderRow {label,url}` in BrandEditor matches the server `orderLinks` shape and `formToInput` returns `orderLinks` matching `siteUpdateInput`. Field names (`openTime`/`closeTime`/`timezone`/`soldOut`/`soldOutMessage`) match the `SiteContent` type + server validation from Plan A. ✓

No gaps for Plan B.
