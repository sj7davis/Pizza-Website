# PBB Slice 3 — Hardening + Accounts + Image Optimization Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Harden the admin (security headers + login rate-limiting), let owners change their password and add/remove other owners in-app, and optimize uploaded images.

**Architecture:** Hono security-headers middleware + an in-memory login rate-limiter keyed by client IP. New `owners` tRPC router (admin-guarded) for password change + owner CRUD, surfaced in a new admin "Account" tab. `sharp` compresses/resizes uploads to web-friendly WebP.

**Tech Stack:** Hono, tRPC v11, Prisma, @node-rs/argon2, sharp, React, Vitest.

**Project root:** `C:\Users\Main PC\Documents\PBV`, branch `feat/admin-backend`. Server tests `// @vitest-environment node`. Checks: `npm run test`, `npm run build`, `npx tsc -p tsconfig.server.json`.

---

### Task 1: Security headers + login rate-limiting

**Files:**
- Create: `server/security.ts`, `server/auth/rateLimit.ts`, `server/auth/__tests__/rateLimit.test.ts`
- Modify: `server/index.ts`, `server/trpc/routers/auth.ts`

- [ ] **Step 1: Write the failing test** `server/auth/__tests__/rateLimit.test.ts`

```ts
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, resetRateLimits, MAX_ATTEMPTS } from '../rateLimit'

beforeEach(() => resetRateLimits())

describe('checkRateLimit', () => {
  it('allows up to MAX_ATTEMPTS then blocks', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(checkRateLimit('1.2.3.4').ok).toBe(true)
    }
    const blocked = checkRateLimit('1.2.3.4')
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })
  it('tracks IPs independently', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) checkRateLimit('a')
    expect(checkRateLimit('a').ok).toBe(false)
    expect(checkRateLimit('b').ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run it (FAIL), implement `server/auth/rateLimit.ts`, run (PASS)**

```ts
export const MAX_ATTEMPTS = 8
export const WINDOW_MS = 10 * 60 * 1000

interface Bucket {
  count: number
  resetAt: number
}
const buckets = new Map<string, Bucket>()

export function resetRateLimits(): void {
  buckets.clear()
}

export function checkRateLimit(key: string): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, retryAfterSeconds: 0 }
  }
  if (b.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) }
  }
  b.count += 1
  return { ok: true, retryAfterSeconds: 0 }
}
```

Run: `npx vitest run server/auth/__tests__/rateLimit.test.ts` → PASS.

- [ ] **Step 3: Create `server/security.ts`**

```ts
import type { MiddlewareHandler } from 'hono'

/** Conservative security headers that don't break the SPA, Google Fonts, or the API. */
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next()
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'SAMEORIGIN')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
}
```

- [ ] **Step 4: Wire into `server/index.ts`** — add the import and `app.use('*', securityHeaders)` as the FIRST middleware (before the tRPC mount):

```ts
import { securityHeaders } from './security'
```
and immediately after `export const app = new Hono()`:
```ts
app.use('*', securityHeaders)
```

- [ ] **Step 5: Apply rate-limiting in `auth.login`** — `server/trpc/routers/auth.ts`

Add import: `import { checkRateLimit } from '../../auth/rateLimit'`. At the very start of the `login` mutation handler (before the db lookup), add:
```ts
      const ip =
        ctx.c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
        ctx.c.req.header('x-real-ip') ||
        'unknown'
      const rl = checkRateLimit(ip)
      if (!rl.ok) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Too many attempts. Try again in ${rl.retryAfterSeconds}s.`,
        })
      }
```

- [ ] **Step 6: Verify + commit**

Run: `npm run test`, `npx tsc -p tsconfig.server.json`, `npm run build` — all green.
```bash
git add server/security.ts server/auth/rateLimit.ts server/auth/__tests__/rateLimit.test.ts server/index.ts server/trpc/routers/auth.ts
git commit -m "feat(server): security headers + login rate-limiting"
```

---

### Task 2: Owners router (password change + owner CRUD)

**Files:**
- Create: `server/trpc/routers/owners.ts`, `server/__tests__/owners.router.test.ts`
- Modify: `server/trpc/routers/app.ts`, `server/validation.ts`

- [ ] **Step 1: Add validation schemas** to `server/validation.ts`:

```ts
export const changePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})
export const addOwnerInput = z.object({
  email: z.string().email({ pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ }),
  password: z.string().min(8),
})
```

- [ ] **Step 2: Write the failing test** `server/__tests__/owners.router.test.ts`

```ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'
import { hashPassword } from '../auth/password'

const user = { id: 'u1', email: 'owner@pbb.co' }
function caller(db: unknown, u: typeof user | null = user) {
  return appRouter.createCaller({ db: db as never, c: {} as never, user: u, resHeaders: new Headers() })
}

describe('owners router', () => {
  it('rejects unauthenticated', async () => {
    await expect(caller({}, null).owners.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('lists owners (id + email only)', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'u1', email: 'a@b.co' }])
    const res = await caller({ adminUser: { findMany } }).owners.list()
    expect(res).toEqual([{ id: 'u1', email: 'a@b.co' }])
    expect(findMany).toHaveBeenCalledWith({ select: { id: true, email: true }, orderBy: { createdAt: 'asc' } })
  })

  it('changePassword verifies the current password then updates', async () => {
    const passwordHash = await hashPassword('oldpass1')
    const update = vi.fn().mockResolvedValue({})
    const db = {
      adminUser: { findUnique: vi.fn().mockResolvedValue({ id: 'u1', passwordHash }), update },
    }
    await caller(db).owners.changePassword({ currentPassword: 'oldpass1', newPassword: 'newpass123' })
    expect(update).toHaveBeenCalled()
    expect(update.mock.calls[0][0].where).toEqual({ id: 'u1' })
  })

  it('changePassword rejects a wrong current password', async () => {
    const passwordHash = await hashPassword('oldpass1')
    const db = { adminUser: { findUnique: vi.fn().mockResolvedValue({ id: 'u1', passwordHash }), update: vi.fn() } }
    await expect(
      caller(db).owners.changePassword({ currentPassword: 'WRONG', newPassword: 'newpass123' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('remove refuses to delete the last owner', async () => {
    const db = { adminUser: { count: vi.fn().mockResolvedValue(1), delete: vi.fn() } }
    await expect(caller(db).owners.remove({ id: 'u1' })).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
})
```

- [ ] **Step 3: Implement `server/trpc/routers/owners.ts`**

```ts
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, adminProcedure } from '../trpc'
import { hashPassword, verifyPassword } from '../../auth/password'
import { changePasswordInput, addOwnerInput } from '../../validation'

export const ownersRouter = router({
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.adminUser.findMany({ select: { id: true, email: true }, orderBy: { createdAt: 'asc' } }),
  ),

  changePassword: adminProcedure.input(changePasswordInput).mutation(async ({ ctx, input }) => {
    const me = await ctx.db.adminUser.findUnique({ where: { id: ctx.user.id } })
    if (!me || !(await verifyPassword(me.passwordHash, input.currentPassword))) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Current password is incorrect' })
    }
    await ctx.db.adminUser.update({
      where: { id: ctx.user.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    })
    return { ok: true }
  }),

  add: adminProcedure.input(addOwnerInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.adminUser.findUnique({ where: { email: input.email } })
    if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'That email already has an account' })
    const created = await ctx.db.adminUser.create({
      data: { email: input.email, passwordHash: await hashPassword(input.password) },
      select: { id: true, email: true },
    })
    return created
  }),

  remove: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const count = await ctx.db.adminUser.count()
    if (count <= 1) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot remove the last owner' })
    await ctx.db.adminUser.delete({ where: { id: input.id } })
    return { ok: true }
  }),
})
```

- [ ] **Step 4: Mount it** in `server/trpc/routers/app.ts` — add `import { ownersRouter } from './owners'` and `owners: ownersRouter,` to the router object.

- [ ] **Step 5: Verify + commit**

Run the owners test (PASS), `npm run test`, `npx tsc -p tsconfig.server.json`, `npm run build`.
```bash
git add server/trpc/routers/owners.ts server/__tests__/owners.router.test.ts server/trpc/routers/app.ts server/validation.ts
git commit -m "feat(server): owners router (change password, add/remove owners)"
```

---

### Task 3: Admin Account tab

**Files:**
- Create: `src/admin/AccountPanel.tsx`, `src/admin/__tests__/AccountPanel.test.tsx`
- Modify: `src/admin/Dashboard.tsx`

- [ ] **Step 1: Write the failing test** `src/admin/__tests__/AccountPanel.test.tsx`

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const ownersList = { data: [{ id: 'u1', email: 'owner@pbb.co' }], isLoading: false }
const changePw = vi.fn().mockResolvedValue({ ok: true })
const addOwner = vi.fn().mockResolvedValue({ id: 'u2', email: 'new@pbb.co' })
const removeOwner = vi.fn().mockResolvedValue({ ok: true })
const invalidate = vi.fn()

vi.mock('../../lib/trpc', () => ({
  trpc: {
    useUtils: () => ({ owners: { list: { invalidate } } }),
    owners: {
      list: { useQuery: () => ownersList },
      changePassword: { useMutation: () => ({ mutateAsync: changePw, isPending: false }) },
      add: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutateAsync: async (v: unknown) => { const r = await addOwner(v); o?.onSuccess?.(); return r }, isPending: false }) },
      remove: { useMutation: (o?: { onSuccess?: () => void }) => ({ mutate: (v: unknown) => { removeOwner(v); o?.onSuccess?.() }, isPending: false }) },
    },
  },
}))

import { AccountPanel } from '../AccountPanel'

beforeEach(() => { changePw.mockClear(); addOwner.mockClear() })

describe('AccountPanel', () => {
  it('lists owners', () => {
    render(<AccountPanel />)
    expect(screen.getByText('owner@pbb.co')).toBeInTheDocument()
  })
  it('changes password', async () => {
    render(<AccountPanel />)
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'oldpass1' } })
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'newpass123' } })
    fireEvent.click(screen.getByRole('button', { name: /change password/i }))
    await waitFor(() => expect(changePw).toHaveBeenCalledWith({ currentPassword: 'oldpass1', newPassword: 'newpass123' }))
  })
  it('adds an owner', async () => {
    render(<AccountPanel />)
    fireEvent.change(screen.getByLabelText(/new owner email/i), { target: { value: 'new@pbb.co' } })
    fireEvent.change(screen.getByLabelText(/new owner password/i), { target: { value: 'welcome123' } })
    fireEvent.click(screen.getByRole('button', { name: /add owner/i }))
    await waitFor(() => expect(addOwner).toHaveBeenCalledWith({ email: 'new@pbb.co', password: 'welcome123' }))
  })
})
```

- [ ] **Step 2: Run it (FAIL), implement `src/admin/AccountPanel.tsx`, run (PASS)**

```tsx
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
```

- [ ] **Step 3: Add the tab to `src/admin/Dashboard.tsx`**

Change the tab state type to include `'account'`, import `AccountPanel`, add a nav button and render it:
```tsx
  const [tab, setTab] = useState<'menu' | 'brand' | 'account'>('menu')
```
Add `import { AccountPanel } from './AccountPanel'`. In `<nav>`, add after the Brand button:
```tsx
          <button onClick={() => setTab('account')} aria-pressed={tab === 'account'}>Account</button>
```
And change the body render:
```tsx
      {tab === 'menu' && <MenuManager />}
      {tab === 'brand' && <BrandEditor />}
      {tab === 'account' && <AccountPanel />}
```

- [ ] **Step 4: Verify + commit**

Run AccountPanel test (PASS), `npm run test`, `npm run build`.
```bash
git add src/admin/AccountPanel.tsx src/admin/__tests__/AccountPanel.test.tsx src/admin/Dashboard.tsx
git commit -m "feat(admin): Account tab — change password + manage owners"
```

---

### Task 4: Image optimization on upload

**Files:**
- Modify: `server/upload.ts`, `package.json`
- Test: `server/__tests__/upload.test.ts` (unchanged behaviour of `validateUpload`; add nothing required)

- [ ] **Step 1: Install sharp**

```bash
npm install sharp
```

- [ ] **Step 2: Update `server/upload.ts`** — compress/resize to WebP. Replace the body of `handleUpload` AFTER validation (the buffer/write part) with:

```ts
  const input = Buffer.from(await file.arrayBuffer())
  let out = input
  let ext = ALLOWED[file.type] ?? '.bin'
  try {
    const sharp = (await import('sharp')).default
    out = await sharp(input).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
    ext = '.webp'
  } catch {
    // sharp unavailable or unsupported input — fall back to the original bytes.
  }
  const hash = createHash('sha256').update(out).digest('hex').slice(0, 16)
  const filename = `${hash}${ext}`

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, filename), out)

  return c.json({ url: `/uploads/${filename}` })
```
(Keep the existing imports: `mkdir`, `writeFile`, `createHash`, `join`. The `extname` import may now be unused — remove it to satisfy build if needed.)

- [ ] **Step 3: Verify + commit**

Run: `npx vitest run server/__tests__/upload.test.ts` (validateUpload still passes), `npm run test`, `npx tsc -p tsconfig.server.json`, `npm run build`.
```bash
git add server/upload.ts package.json package-lock.json
git commit -m "feat(server): optimize uploaded images to WebP via sharp"
```

---

### Task 5: Verify + deploy

- [ ] **Step 1:** `npm run test` (all pass), `npm run build` (clean), `npx tsc -p tsconfig.server.json` (no errors).
- [ ] **Step 2:** `git push origin feat/admin-backend && railway up --detach --service pbb-app`
- [ ] **Step 3:** After deploy SUCCESS: confirm response headers include `x-content-type-options: nosniff` (`curl -sI https://pbb-app-production.up.railway.app/ | grep -i content-type-options`); log in → Account tab → change password works; (optional) add a 2nd owner.

> Note: `sharp` ships prebuilt Linux binaries, so the Railway build should pick them up. If the deploy fails on sharp's native build, the `handleUpload` try/catch already falls back to original bytes — but if the *build* itself fails, set `npm_config_sharp_binary_host` is not needed; instead confirm sharp installed as a normal dep (it ships prebuilt for linux-x64). Report any build failure.

---

## Self-Review

**Spec coverage (Slice 3):**
- Login rate-limiting → Task 1. ✓  Security headers → Task 1. ✓
- Change password in-app → Tasks 2 (router) + 3 (UI). ✓
- Add/remove a 2nd owner → Tasks 2 + 3. ✓
- Image optimization → Task 4. ✓

**Placeholder scan:** complete code each step; no TBDs. ✓

**Type consistency:** `checkRateLimit`/`MAX_ATTEMPTS`/`resetRateLimits` consistent (Task 1). `owners` router procedures (`list`/`changePassword`/`add`/`remove`) match the AccountPanel calls and the test mocks (Tasks 2–3). `changePasswordInput`/`addOwnerInput` defined in validation, used in owners router. `adminProcedure` ctx has `user` (non-null) — used by changePassword. ✓

No gaps for Slice 3.
