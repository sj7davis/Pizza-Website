# PBV Slice 2 · Phase B — Admin Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add owner authentication (sessions), the auth-guarded admin tRPC routers (menu CRUD + site content), and an image-upload route to the PBV backend — all testable without a database or browser.

**Architecture:** Extends the Phase A Hono + tRPC + Prisma backend. A cookie-based session (opaque token in DB) authenticates owners; `adminProcedure` guards admin routes. Passwords use `@node-rs/argon2` (prebuilt argon2 — no native build on Windows/Railway). Json columns gain zod validation at the boundary. Image upload is a plain Hono multipart route guarded by the same session. Tests mock Prisma via `createCaller`; pure functions (password, session expiry, validation) are unit-tested directly.

**Tech Stack:** @node-rs/argon2, zod, hono/cookie, @hono/trpc-server, @trpc/server v11, Prisma v6, Vitest.

**Project root:** `C:\Users\Main PC\Documents\PBV`, branch `feat/admin-backend`. Git Bash on Windows. Server tests begin with `// @vitest-environment node`. Single-file test: `npx vitest run <path>`; full suite: `npm run test`.

**Spec:** `docs/superpowers/specs/2026-06-20-pbv-admin-backend-design.md` (§5 auth, §6 API, §10 testing). Carries two Phase-A review follow-ups: tighten the tRPC-context cast (now resolved by a proper Context type) and add zod validation on Json fields (Task 5).

---

## File Structure (Phase B)

```
server/
  auth/
    password.ts            # CREATE: argon2 hash/verify
    session.ts             # CREATE: create/find/delete session, cookie name + expiry
    __tests__/password.test.ts   # CREATE
    __tests__/session.test.ts    # CREATE
  trpc/
    context.ts             # MODIFY: ctx = { db, c, user } resolved from cookie
    trpc.ts                # MODIFY: add adminProcedure (auth guard)
    routers/
      auth.ts              # CREATE: login, logout, me
      menu.ts              # CREATE: list, create, update, delete, reorder
      site.ts              # CREATE: get, update
      app.ts               # MODIFY: mount auth, menu, site
  validation.ts            # CREATE: zod schemas (menu input, site input, json parsers)
  __tests__/auth.router.test.ts   # CREATE
  __tests__/menu.router.test.ts   # CREATE
  __tests__/site.router.test.ts   # CREATE
  upload.ts                # CREATE: multipart validate + save to volume
  __tests__/upload.test.ts # CREATE
  mappers.ts               # MODIFY: validate Json via validation.ts
  index.ts                 # MODIFY: pass Hono ctx to createContext; mount upload route
```

---

### Task 1: Password hashing (argon2)

**Files:**
- Create: `server/auth/password.ts`, `server/auth/__tests__/password.test.ts`

- [ ] **Step 1: Install argon2 (prebuilt, no native build)**

Run: `npm install @node-rs/argon2`

- [ ] **Step 2: Write the failing test**

`server/auth/__tests__/password.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('password', () => {
  it('hashes to something other than the plaintext', async () => {
    const hash = await hashPassword('correct horse')
    expect(hash).not.toBe('correct horse')
    expect(hash.length).toBeGreaterThan(20)
  })
  it('verifies a correct password', async () => {
    const hash = await hashPassword('s3cret!')
    expect(await verifyPassword(hash, 's3cret!')).toBe(true)
  })
  it('rejects a wrong password', async () => {
    const hash = await hashPassword('s3cret!')
    expect(await verifyPassword(hash, 'nope')).toBe(false)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run server/auth/__tests__/password.test.ts`
Expected: FAIL — cannot find module `../password`.

- [ ] **Step 4: Implement `server/auth/password.ts`**

```ts
import { hash, verify } from '@node-rs/argon2'

export function hashPassword(plain: string): Promise<string> {
  return hash(plain)
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain)
  } catch {
    return false
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run server/auth/__tests__/password.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/auth/password.ts server/auth/__tests__/password.test.ts package.json package-lock.json
git commit -m "feat(server): argon2 password hashing"
```

---

### Task 2: Sessions

**Files:**
- Create: `server/auth/session.ts`, `server/auth/__tests__/session.test.ts`

- [ ] **Step 1: Write the failing test**

`server/auth/__tests__/session.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { SESSION_COOKIE, SESSION_TTL_MS, createSession, findValidUser, deleteSession } from '../session'

describe('session', () => {
  it('exposes a cookie name and a positive TTL', () => {
    expect(SESSION_COOKIE).toBe('pbv_session')
    expect(SESSION_TTL_MS).toBeGreaterThan(0)
  })

  it('createSession stores a session with a future expiry and returns its id', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'sess_1' })
    const db = { session: { create } } as never
    const id = await createSession(db, 'user_1')
    expect(id).toBe('sess_1')
    const arg = create.mock.calls[0][0]
    expect(arg.data.userId).toBe('user_1')
    expect(arg.data.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('findValidUser returns the user for an unexpired session', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'sess_1', expiresAt: new Date(Date.now() + 10000), user: { id: 'u1', email: 'a@b.c' },
    })
    const db = { session: { findUnique } } as never
    const user = await findValidUser(db, 'sess_1')
    expect(user).toEqual({ id: 'u1', email: 'a@b.c' })
  })

  it('findValidUser returns null for an expired session', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'sess_1', expiresAt: new Date(Date.now() - 1000), user: { id: 'u1', email: 'a@b.c' },
    })
    const db = { session: { findUnique } } as never
    expect(await findValidUser(db, 'sess_1')).toBeNull()
  })

  it('findValidUser returns null when token is missing/unknown', async () => {
    const db = { session: { findUnique: vi.fn().mockResolvedValue(null) } } as never
    expect(await findValidUser(db, undefined)).toBeNull()
    expect(await findValidUser(db, 'nope')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/auth/__tests__/session.test.ts`
Expected: FAIL — cannot find module `../session`.

- [ ] **Step 3: Implement `server/auth/session.ts`**

```ts
import type { PrismaClient } from '@prisma/client'

export const SESSION_COOKIE = 'pbv_session'
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

export interface SessionUser {
  id: string
  email: string
}

export async function createSession(db: PrismaClient, userId: string): Promise<string> {
  const session = await db.session.create({
    data: { userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  })
  return session.id
}

export async function findValidUser(
  db: PrismaClient,
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null
  const session = await db.session.findUnique({ where: { id: token }, include: { user: true } })
  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) return null
  return { id: session.user.id, email: session.user.email }
}

export async function deleteSession(db: PrismaClient, token: string | undefined): Promise<void> {
  if (!token) return
  await db.session.deleteMany({ where: { id: token } })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/auth/__tests__/session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/auth/session.ts server/auth/__tests__/session.test.ts
git commit -m "feat(server): DB-backed sessions with expiry"
```

---

### Task 3: tRPC context + adminProcedure

**Files:**
- Modify: `server/trpc/context.ts`, `server/trpc/trpc.ts`, `server/index.ts`
- Create: `server/__tests__/admin.guard.test.ts`

- [ ] **Step 1: Replace `server/trpc/context.ts`**

```ts
import type { Context as HonoContext } from 'hono'
import { getCookie } from 'hono/cookie'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '../db'
import { SESSION_COOKIE, findValidUser, type SessionUser } from '../auth/session'

export interface Context {
  db: PrismaClient
  c: HonoContext
  user: SessionUser | null
}

export async function createContext(c: HonoContext): Promise<Context> {
  const token = getCookie(c, SESSION_COOKIE)
  const user = await findValidUser(prisma, token)
  return { db: prisma, c, user }
}
```

- [ ] **Step 2: Replace `server/trpc/trpc.ts`**

```ts
import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import type { Context } from './context'

const t = initTRPC.context<Context>().create({ transformer: superjson })

export const router = t.router
export const publicProcedure = t.procedure

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})
```

- [ ] **Step 3: Update `server/index.ts` to pass the Hono context**

Replace the `trpcServer({...})` block's `createContext` line. The full middleware call becomes:
```ts
app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createContext(c),
  }),
)
```
(`createContext` now takes the Hono context `c` and returns a `Promise<Context>`; the `@hono/trpc-server` adapter accepts this. Remove the previous `as unknown as Record<string, unknown>` cast — it is no longer needed because the adapter infers the context from the async return.)

- [ ] **Step 4: Write the failing test**

`server/__tests__/admin.guard.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { router, adminProcedure } from '../trpc/trpc'

const probe = router({
  secret: adminProcedure.query(({ ctx }) => ctx.user.email),
})

function caller(user: { id: string; email: string } | null) {
  return probe.createCaller({ db: {} as never, c: {} as never, user })
}

describe('adminProcedure', () => {
  it('rejects when there is no user', async () => {
    await expect(caller(null).secret()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
  it('passes through and exposes the user when authenticated', async () => {
    const email = await caller({ id: 'u1', email: 'owner@pbv.co' }).secret()
    expect(email).toBe('owner@pbv.co')
  })
})
```

- [ ] **Step 5: Run test to verify it fails, then implement (Steps 1–2 already do), then passes**

Run: `npx vitest run server/__tests__/admin.guard.test.ts`
Expected: PASS after Steps 1–2. Also run `npx tsc -p tsconfig.server.json` (no errors) and `npm run test` (all pass).

- [ ] **Step 6: Commit**

```bash
git add server/trpc/context.ts server/trpc/trpc.ts server/index.ts server/__tests__/admin.guard.test.ts
git commit -m "feat(server): session-resolving tRPC context + adminProcedure guard"
```

---

### Task 4: Auth router (login / logout / me)

**Files:**
- Create: `server/trpc/routers/auth.ts`, `server/__tests__/auth.router.test.ts`
- Modify: `server/trpc/routers/app.ts`

- [ ] **Step 1: Write the failing test**

`server/__tests__/auth.router.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'
import { hashPassword } from '../auth/password'

function fakeCookieJar() {
  const set: Record<string, string> = {}
  return {
    set,
    c: {
      // hono/cookie's setCookie/deleteCookie write via c.header; emulate enough for the router
      header: vi.fn(),
      req: { raw: new Request('http://x') },
      res: new Response(),
    } as never,
  }
}

describe('auth router', () => {
  it('me returns null when unauthenticated', async () => {
    const caller = appRouter.createCaller({ db: {} as never, c: {} as never, user: null })
    expect(await caller.auth.me()).toBeNull()
  })

  it('me returns the user when authenticated', async () => {
    const caller = appRouter.createCaller({ db: {} as never, c: {} as never, user: { id: 'u1', email: 'a@b.c' } })
    expect(await caller.auth.me()).toEqual({ id: 'u1', email: 'a@b.c' })
  })

  it('login rejects bad credentials', async () => {
    const db = {
      adminUser: { findUnique: vi.fn().mockResolvedValue(null) },
    } as never
    const { c } = fakeCookieJar()
    const caller = appRouter.createCaller({ db, c, user: null })
    await expect(caller.auth.login({ email: 'x@y.z', password: 'bad' }))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('login succeeds with a correct password and creates a session', async () => {
    const passwordHash = await hashPassword('rightpass')
    const create = vi.fn().mockResolvedValue({ id: 'sess_1' })
    const db = {
      adminUser: { findUnique: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.c', passwordHash }) },
      session: { create },
    } as never
    const { c } = fakeCookieJar()
    const caller = appRouter.createCaller({ db, c, user: null })
    const res = await caller.auth.login({ email: 'a@b.c', password: 'rightpass' })
    expect(res).toEqual({ id: 'u1', email: 'a@b.c' })
    expect(create).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/__tests__/auth.router.test.ts`
Expected: FAIL — `auth` router does not exist on appRouter.

- [ ] **Step 3: Implement `server/trpc/routers/auth.ts`**

```ts
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { setCookie, deleteCookie } from 'hono/cookie'
import { router, publicProcedure } from '../trpc'
import { verifyPassword } from '../../auth/password'
import { createSession, deleteSession, SESSION_COOKIE, SESSION_TTL_MS } from '../../auth/session'

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.adminUser.findUnique({ where: { email: input.email } })
      if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' })
      }
      const token = await createSession(ctx.db, user.id)
      setCookie(ctx.c, SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        path: '/',
        maxAge: Math.floor(SESSION_TTL_MS / 1000),
      })
      return { id: user.id, email: user.email }
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const { getCookie } = await import('hono/cookie')
    const token = getCookie(ctx.c, SESSION_COOKIE)
    await deleteSession(ctx.db, token)
    deleteCookie(ctx.c, SESSION_COOKIE, { path: '/' })
    return { ok: true }
  }),
})
```

- [ ] **Step 4: Mount it — update `server/trpc/routers/app.ts`**

```ts
import { router } from '../trpc'
import { contentRouter } from './content'
import { authRouter } from './auth'

export const appRouter = router({
  content: contentRouter,
  auth: authRouter,
})

export type AppRouter = typeof appRouter
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run server/__tests__/auth.router.test.ts`
Expected: PASS. Also `npx tsc -p tsconfig.server.json` and `npm run test` green.

- [ ] **Step 6: Commit**

```bash
git add server/trpc/routers/auth.ts server/trpc/routers/app.ts server/__tests__/auth.router.test.ts
git commit -m "feat(server): auth router (login/logout/me) with session cookies"
```

---

### Task 5: Validation schemas + menu router

**Files:**
- Create: `server/validation.ts`, `server/trpc/routers/menu.ts`, `server/__tests__/menu.router.test.ts`
- Modify: `server/trpc/routers/app.ts`, `server/mappers.ts`

- [ ] **Step 1: Create `server/validation.ts`**

```ts
import { z } from 'zod'

export const menuItemInput = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  price: z.string().min(1),
  image: z.string().nullable().optional(),
  available: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const menuUpdateInput = menuItemInput.partial().extend({ id: z.string().min(1) })

export const socialLinkSchema = z.object({ label: z.string().min(1), href: z.string().min(1) })

export const siteUpdateInput = z.object({
  brandName: z.string().min(1),
  tagline: z.string().min(1),
  uberEatsUrl: z.string().min(1),
  story: z.object({
    eyebrow: z.string().min(1),
    heading: z.string().min(1),
    paragraphs: z.array(z.string()),
    pullquote: z.string().min(1),
    established: z.string().min(1),
  }),
  delivery: z.object({ area: z.string().min(1), hours: z.string().min(1) }),
  socials: z.array(socialLinkSchema),
})

export const paragraphsSchema = z.array(z.string())
export const socialsSchema = z.array(socialLinkSchema)
```

- [ ] **Step 2: Harden `server/mappers.ts` Json fields (Phase A review follow-up)**

In `server/mappers.ts`, replace the two unchecked casts in `rowsToSiteContent` (the `storyParagraphs as string[]` and `socials as SocialLink[]`) with validated parses. Add at the top:
```ts
import { paragraphsSchema, socialsSchema } from './validation'
```
and change the `story.paragraphs` and `socials` lines to:
```ts
      paragraphs: paragraphsSchema.parse(site.storyParagraphs),
```
```ts
    socials: socialsSchema.parse(site.socials),
```
Leave the rest of the file unchanged. (The existing mappers test still passes — its inputs are valid.)

- [ ] **Step 3: Write the failing test**

`server/__tests__/menu.router.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'

const authed = { db: undefined as never, c: {} as never, user: { id: 'u1', email: 'a@b.c' } }

function withDb(db: unknown) {
  return appRouter.createCaller({ ...authed, db: db as never })
}

describe('menu router', () => {
  it('rejects unauthenticated callers', async () => {
    const caller = appRouter.createCaller({ db: {} as never, c: {} as never, user: null })
    await expect(caller.menu.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('list returns all items ordered', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: '1', name: 'Margherita' }])
    const res = await withDb({ menuItem: { findMany } }).menu.list()
    expect(res).toHaveLength(1)
    expect(findMany).toHaveBeenCalledWith({ orderBy: { sortOrder: 'asc' } })
  })

  it('create inserts a new item', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'new' })
    const res = await withDb({ menuItem: { create } }).menu.create({
      name: 'Capricciosa', tagline: 'four corners', description: 'ham, mushroom, artichoke, olive', price: '$28',
    })
    expect(res).toEqual({ id: 'new' })
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Capricciosa', price: '$28' }),
    })
  })

  it('update writes the provided fields by id', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'x' })
    await withDb({ menuItem: { update } }).menu.update({ id: 'x', price: '$30' })
    expect(update).toHaveBeenCalledWith({ where: { id: 'x' }, data: { price: '$30' } })
  })

  it('delete removes by id', async () => {
    const del = vi.fn().mockResolvedValue({ id: 'x' })
    await withDb({ menuItem: { delete: del } }).menu.delete({ id: 'x' })
    expect(del).toHaveBeenCalledWith({ where: { id: 'x' } })
  })

  it('reorder sets sortOrder by array position in a transaction', async () => {
    const update = vi.fn().mockResolvedValue({})
    const $transaction = vi.fn().mockImplementation((ops) => Promise.all(ops))
    await withDb({ menuItem: { update }, $transaction }).menu.reorder({ ids: ['a', 'b'] })
    expect($transaction).toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { sortOrder: 0 } })
    expect(update).toHaveBeenCalledWith({ where: { id: 'b' }, data: { sortOrder: 1 } })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run server/__tests__/menu.router.test.ts`
Expected: FAIL — `menu` router does not exist.

- [ ] **Step 5: Implement `server/trpc/routers/menu.ts`**

```ts
import { z } from 'zod'
import { router, adminProcedure } from '../trpc'
import { menuItemInput, menuUpdateInput } from '../../validation'

export const menuRouter = router({
  list: adminProcedure.query(({ ctx }) =>
    ctx.db.menuItem.findMany({ orderBy: { sortOrder: 'asc' } }),
  ),

  create: adminProcedure.input(menuItemInput).mutation(({ ctx, input }) =>
    ctx.db.menuItem.create({ data: input }),
  ),

  update: adminProcedure.input(menuUpdateInput).mutation(({ ctx, input }) => {
    const { id, ...data } = input
    return ctx.db.menuItem.update({ where: { id }, data })
  }),

  delete: adminProcedure.input(z.object({ id: z.string().min(1) })).mutation(({ ctx, input }) =>
    ctx.db.menuItem.delete({ where: { id: input.id } }),
  ),

  reorder: adminProcedure.input(z.object({ ids: z.array(z.string().min(1)) })).mutation(({ ctx, input }) =>
    ctx.db.$transaction(
      input.ids.map((id, sortOrder) => ctx.db.menuItem.update({ where: { id }, data: { sortOrder } })),
    ),
  ),
})
```

- [ ] **Step 6: Mount it — update `server/trpc/routers/app.ts`**

```ts
import { router } from '../trpc'
import { contentRouter } from './content'
import { authRouter } from './auth'
import { menuRouter } from './menu'

export const appRouter = router({
  content: contentRouter,
  auth: authRouter,
  menu: menuRouter,
})

export type AppRouter = typeof appRouter
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run server/__tests__/menu.router.test.ts server/__tests__/mappers.test.ts`
Expected: PASS (menu router + mappers still green). Also `npx tsc -p tsconfig.server.json` and `npm run test`.

- [ ] **Step 8: Commit**

```bash
git add server/validation.ts server/trpc/routers/menu.ts server/trpc/routers/app.ts server/mappers.ts server/__tests__/menu.router.test.ts
git commit -m "feat(server): menu admin router + zod validation (incl. Json fields)"
```

---

### Task 6: Site content router

**Files:**
- Create: `server/trpc/routers/site.ts`, `server/__tests__/site.router.test.ts`
- Modify: `server/trpc/routers/app.ts`

- [ ] **Step 1: Write the failing test**

`server/__tests__/site.router.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'

const validInput = {
  brandName: 'PBV', tagline: 'tag', uberEatsUrl: 'https://ubereats.com/pbv',
  story: { eyebrow: 'Our story', heading: 'h', paragraphs: ['p1', 'p2'], pullquote: 'q', established: 'est' },
  delivery: { area: 'Airport West', hours: '5-9pm' },
  socials: [{ label: 'Instagram', href: '#ig' }],
}

function caller(db: unknown, user: { id: string; email: string } | null = { id: 'u1', email: 'a@b.c' }) {
  return appRouter.createCaller({ db: db as never, c: {} as never, user })
}

describe('site router', () => {
  it('rejects unauthenticated update', async () => {
    await expect(caller({}, null).site.update(validInput)).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('update upserts the singleton with flattened columns', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 1 })
    await caller({ siteContent: { upsert } }).site.update(validInput)
    const arg = upsert.mock.calls[0][0]
    expect(arg.where).toEqual({ id: 1 })
    expect(arg.create.storyParagraphs).toEqual(['p1', 'p2'])
    expect(arg.create.deliveryArea).toBe('Airport West')
    expect(arg.update.storyHeading).toBe('h')
  })

  it('rejects invalid input (empty brandName)', async () => {
    await expect(
      caller({ siteContent: { upsert: vi.fn() } }).site.update({ ...validInput, brandName: '' }),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/__tests__/site.router.test.ts`
Expected: FAIL — `site` router does not exist.

- [ ] **Step 3: Implement `server/trpc/routers/site.ts`**

```ts
import { router, adminProcedure } from '../trpc'
import { siteUpdateInput } from '../../validation'

function toColumns(input: typeof siteUpdateInput._type) {
  return {
    brandName: input.brandName,
    tagline: input.tagline,
    uberEatsUrl: input.uberEatsUrl,
    storyEyebrow: input.story.eyebrow,
    storyHeading: input.story.heading,
    storyParagraphs: input.story.paragraphs,
    storyPullquote: input.story.pullquote,
    storyEstablished: input.story.established,
    deliveryArea: input.delivery.area,
    deliveryHours: input.delivery.hours,
    socials: input.socials,
  }
}

export const siteRouter = router({
  get: adminProcedure.query(({ ctx }) => ctx.db.siteContent.findUnique({ where: { id: 1 } })),

  update: adminProcedure.input(siteUpdateInput).mutation(({ ctx, input }) => {
    const cols = toColumns(input)
    return ctx.db.siteContent.upsert({
      where: { id: 1 },
      create: { id: 1, ...cols },
      update: cols,
    })
  }),
})
```

- [ ] **Step 4: Mount it — update `server/trpc/routers/app.ts`**

```ts
import { router } from '../trpc'
import { contentRouter } from './content'
import { authRouter } from './auth'
import { menuRouter } from './menu'
import { siteRouter } from './site'

export const appRouter = router({
  content: contentRouter,
  auth: authRouter,
  menu: menuRouter,
  site: siteRouter,
})

export type AppRouter = typeof appRouter
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run server/__tests__/site.router.test.ts`
Expected: PASS. Also `npx tsc -p tsconfig.server.json` and `npm run test` green.

- [ ] **Step 6: Commit**

```bash
git add server/trpc/routers/site.ts server/trpc/routers/app.ts server/__tests__/site.router.test.ts
git commit -m "feat(server): site content admin router (get/update singleton)"
```

---

### Task 7: Image upload route

**Files:**
- Create: `server/upload.ts`, `server/__tests__/upload.test.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: Write the failing test**

`server/__tests__/upload.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { validateUpload, UPLOAD_DIR, MAX_UPLOAD_BYTES } from '../upload'

describe('validateUpload', () => {
  it('accepts a small jpeg/png/webp', () => {
    expect(validateUpload('image/jpeg', 1000).ok).toBe(true)
    expect(validateUpload('image/png', 1000).ok).toBe(true)
    expect(validateUpload('image/webp', 1000).ok).toBe(true)
  })
  it('rejects a non-image type', () => {
    const r = validateUpload('application/pdf', 1000)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/type/i)
  })
  it('rejects files over the size limit', () => {
    const r = validateUpload('image/jpeg', MAX_UPLOAD_BYTES + 1)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/large|size/i)
  })
  it('exposes an uploads directory under server/', () => {
    expect(UPLOAD_DIR).toMatch(/uploads/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/__tests__/upload.test.ts`
Expected: FAIL — cannot find module `../upload`.

- [ ] **Step 3: Implement `server/upload.ts`**

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { extname, join } from 'node:path'
import type { Context as HonoContext } from 'hono'
import { getCookie } from 'hono/cookie'
import { prisma } from './db'
import { SESSION_COOKIE, findValidUser } from './auth/session'

export const UPLOAD_DIR = join(process.cwd(), 'server', 'uploads')
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export function validateUpload(type: string, size: number): { ok: boolean; reason?: string } {
  if (!ALLOWED[type]) return { ok: false, reason: `Unsupported image type: ${type}` }
  if (size > MAX_UPLOAD_BYTES) return { ok: false, reason: 'File too large (max 5 MB)' }
  return { ok: true }
}

export async function handleUpload(c: HonoContext): Promise<Response> {
  const user = await findValidUser(prisma, getCookie(c, SESSION_COOKIE))
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.parseBody()
  const file = body['file']
  if (!(file instanceof File)) return c.json({ error: 'No file provided' }, 400)

  const check = validateUpload(file.type, file.size)
  if (!check.ok) return c.json({ error: check.reason }, 400)

  const buf = Buffer.from(await file.arrayBuffer())
  const ext = ALLOWED[file.type] ?? extname(file.name) ?? '.bin'
  const hash = createHash('sha256').update(buf).digest('hex').slice(0, 16)
  const filename = `${hash}${ext}`

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, filename), buf)

  return c.json({ url: `/uploads/${filename}` })
}
```

- [ ] **Step 4: Wire the route into `server/index.ts`**

Add this import near the others:
```ts
import { handleUpload } from './upload'
```
And add this route after the tRPC middleware (before the static-serving block):
```ts
app.post('/api/admin/upload', (c) => handleUpload(c))
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run server/__tests__/upload.test.ts`
Expected: PASS. Also `npx tsc -p tsconfig.server.json` and `npm run test` green.

- [ ] **Step 6: Commit**

```bash
git add server/upload.ts server/index.ts server/__tests__/upload.test.ts
git commit -m "feat(server): session-guarded image upload route"
```

---

## Self-Review

**Spec coverage (Phase B = admin backend):**
- argon2 password hashing → Task 1 (via @node-rs/argon2 prebuilt; deviation from `argon2` package noted to avoid native builds). ✓
- DB-backed sessions w/ expiry, cookie name/TTL → Task 2. ✓
- Session-resolving context + `adminProcedure` guard; removes the Phase-A `as unknown` cast → Task 3. ✓
- auth.login/logout/me with httpOnly secure cookie → Task 4. ✓
- menu.list/create/update/delete/reorder, zod-validated → Task 5. ✓
- site.get/update (singleton upsert, flattened columns) → Task 6. ✓
- Image upload: multipart, type+size validation, session-guarded, saved to volume dir, returns `/uploads/<file>` → Task 7. ✓
- Json-field validation at mapper boundary (Phase A review item) → Task 5 Step 2. ✓
- Tests DB-free (mocked Prisma via createCaller; pure validate/session/password) → all tasks. ✓

Deferred to later phases (correct): admin UI/`/admin` route + components (Phase C), Railway deploy (Phase D).

**Placeholder scan:** No "TBD"/"implement later". Every code step is complete. `update: {}`-style stubs absent (site.update writes real columns; the only partial is `menuUpdateInput.partial()`, which is intentional for PATCH semantics). ✓

**Type consistency:** `Context = { db, c, user }` defined in Task 3, consumed identically by every router test's `createCaller({ db, c, user })` and by `adminProcedure`. `SessionUser = { id, email }` from Task 2 used in context + auth. `menuItemInput`/`menuUpdateInput`/`siteUpdateInput` defined in Task 5 used by Tasks 5–6. `SESSION_COOKIE`/`SESSION_TTL_MS`/`createSession`/`findValidUser`/`deleteSession` defined in Task 2, used in Tasks 3, 4, 7. `validateUpload`/`UPLOAD_DIR`/`MAX_UPLOAD_BYTES` defined and tested in Task 7. `appRouter` grows content→+auth→+menu→+site consistently. ✓

No gaps found for Phase B.
