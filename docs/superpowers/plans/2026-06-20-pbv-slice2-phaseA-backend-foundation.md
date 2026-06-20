# PBV Slice 2 · Phase A — Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Hono + tRPC + Prisma/Postgres backend that serves the PBV site content from a database, and wire the public site to fetch it at runtime with the bundled `content.ts` as instant fallback.

**Architecture:** Single npm package. New `server/` (Hono + tRPC), `prisma/` (schema + seed), and `shared/` (re-exported content types). The public React app gains a tRPC + React Query client and a `useContent()` hook that returns live content or falls back to the bundled defaults. Tests are database-free: pure-function tests + tRPC routers exercised via `createCaller` with a mocked Prisma client.

**Tech Stack:** Hono, @hono/node-server, @hono/trpc-server, @trpc/server, @trpc/client, @trpc/react-query, @tanstack/react-query, zod, superjson, Prisma + @prisma/client (postgres), react-router-dom, Vitest, tsx.

**Project root:** `C:\Users\Main PC\Documents\PBV`, branch `feat/admin-backend` (created off `build/landing-page` by the controller before Task 1). Git Bash on Windows. Single-file test: `npx vitest run <path>`; full suite: `npm run test`.

**Spec:** `docs/superpowers/specs/2026-06-20-pbv-admin-backend-design.md`.

---

## File Structure (Phase A)

```
prisma/
  schema.prisma          # CREATE: MenuItem, SiteContent, AdminUser, Session
  seed.ts                # CREATE: seed SiteContent + menu from src/content.ts
shared/
  contract.ts            # CREATE: re-export content types for server use
server/
  index.ts               # CREATE: Hono app (health, tRPC mount, static/SPA in prod)
  db.ts                  # CREATE: Prisma client singleton
  mappers.ts             # CREATE: DB rows <-> SiteContent/MenuItem
  __tests__/mappers.test.ts        # CREATE
  trpc/
    context.ts           # CREATE: Context { db }
    trpc.ts              # CREATE: initTRPC, router, publicProcedure
    routers/
      content.ts         # CREATE: content.get
      app.ts             # CREATE: appRouter
  __tests__/content.router.test.ts # CREATE
src/
  lib/
    trpc.ts              # CREATE: createTRPCReact<AppRouter>
    useContent.ts        # CREATE: useContent() + pickContent()
  test/providers.tsx     # CREATE: test wrapper (trpc + react-query)
  main.tsx               # MODIFY: providers + router
  App.tsx                # MODIFY: const content = useContent()
  __tests__/App.test.tsx # MODIFY: wrap in TestProviders
  lib/__tests__/useContent.test.ts # CREATE
vite.config.ts           # MODIFY: dev proxy /api + /uploads -> :8787
package.json             # MODIFY: deps + scripts
.gitignore               # MODIFY: server/uploads, .env, prisma generated
```

---

### Task 1: Server tooling + health endpoint

**Files:**
- Modify: `package.json`, `.gitignore`
- Create: `server/index.ts`, `tsconfig.server.json`, `server/__tests__/health.test.ts`

- [ ] **Step 1: Install dependencies**

Run from project root:
```bash
npm install hono @hono/node-server @hono/trpc-server @trpc/server @trpc/client @trpc/react-query @tanstack/react-query zod superjson @prisma/client react-router-dom
npm install -D prisma tsx
```

- [ ] **Step 2: Add scripts to `package.json`**

In `"scripts"`, add (keep existing `dev`, `build`, `test`, `test:watch`):
```json
"dev:server": "tsx watch server/index.ts",
"start": "prisma migrate deploy && tsx server/index.ts",
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:deploy": "prisma migrate deploy",
"db:seed": "tsx prisma/seed.ts"
```

- [ ] **Step 3: Update `.gitignore`**

Append:
```
# backend
server/uploads/
.env
.env.*
```

- [ ] **Step 4: Write the failing test**

`server/__tests__/health.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { app } from '../index'

describe('health', () => {
  it('GET /api/health responds ok', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run server/__tests__/health.test.ts`
Expected: FAIL — cannot find module `../index`.

- [ ] **Step 6: Implement `server/index.ts`**

```ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

export const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))

// Only start a real listener outside the test runner.
if (!process.env.VITEST) {
  const port = Number(process.env.PORT ?? 8787)
  serve({ fetch: app.fetch, port })
  // eslint-disable-next-line no-console
  console.log(`PBV server listening on :${port}`)
}
```

- [ ] **Step 7: Create `tsconfig.server.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"],
    "noEmit": true
  },
  "include": ["server", "prisma", "shared"]
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run server/__tests__/health.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json .gitignore server/index.ts tsconfig.server.json server/__tests__/health.test.ts
git commit -m "feat(server): Hono app with health endpoint + backend tooling"
```

---

### Task 2: Prisma schema + client + mappers

**Files:**
- Create: `prisma/schema.prisma`, `server/db.ts`, `shared/contract.ts`, `server/mappers.ts`, `server/__tests__/mappers.test.ts`

- [ ] **Step 1: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model MenuItem {
  id          String   @id @default(cuid())
  name        String
  tagline     String
  description String
  price       String
  image       String?
  available   Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SiteContent {
  id               Int      @id @default(1)
  brandName        String
  tagline          String
  uberEatsUrl      String
  storyEyebrow     String
  storyHeading     String
  storyParagraphs  Json
  storyPullquote   String
  storyEstablished String
  deliveryArea     String
  deliveryHours    String
  socials          Json
  updatedAt        DateTime @updatedAt
}

model AdminUser {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  sessions     Session[]
}

model Session {
  id        String    @id @default(cuid())
  userId    String
  user      AdminUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime  @default(now())
}
```

- [ ] **Step 2: Generate the Prisma client (offline, no DB needed)**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" — this creates the typed client from the schema without connecting to a database.

- [ ] **Step 3: Create `server/db.ts`**

```ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

- [ ] **Step 4: Create `shared/contract.ts`**

```ts
export type { SiteContent, MenuItem, BrandStory, SocialLink } from '../src/types'
```

- [ ] **Step 5: Write the failing test**

`server/__tests__/mappers.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { rowToMenuItem, rowsToSiteContent } from '../mappers'

describe('mappers', () => {
  it('rowToMenuItem omits image when null', () => {
    const item = rowToMenuItem({ name: 'Margherita', tagline: 't', description: 'd', price: '$22', image: null })
    expect(item).toEqual({ name: 'Margherita', tagline: 't', description: 'd', price: '$22' })
    expect('image' in item).toBe(false)
  })

  it('rowToMenuItem keeps image when present', () => {
    const item = rowToMenuItem({ name: 'X', tagline: 't', description: 'd', price: '$1', image: '/u/p.jpg' })
    expect(item.image).toBe('/u/p.jpg')
  })

  it('rowsToSiteContent assembles story + delivery + socials', () => {
    const site = rowsToSiteContent(
      {
        brandName: 'PBV', tagline: 'tag', uberEatsUrl: '#',
        storyEyebrow: 'Our story', storyHeading: 'h', storyParagraphs: ['p1', 'p2'],
        storyPullquote: 'q', storyEstablished: 'est',
        deliveryArea: 'Airport West', deliveryHours: '5-9pm',
        socials: [{ label: 'Instagram', href: '#ig' }],
      },
      [{ name: 'Margherita', tagline: 't', description: 'd', price: '$22', image: null }],
    )
    expect(site.story.paragraphs).toEqual(['p1', 'p2'])
    expect(site.delivery).toEqual({ area: 'Airport West', hours: '5-9pm' })
    expect(site.socials[0]).toEqual({ label: 'Instagram', href: '#ig' })
    expect(site.menu).toHaveLength(1)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run server/__tests__/mappers.test.ts`
Expected: FAIL — cannot find module `../mappers`.

- [ ] **Step 7: Implement `server/mappers.ts`**

```ts
import type { SiteContent, MenuItem, SocialLink } from '../shared/contract'

export interface MenuItemRow {
  name: string
  tagline: string
  description: string
  price: string
  image: string | null
}

export interface SiteContentRow {
  brandName: string
  tagline: string
  uberEatsUrl: string
  storyEyebrow: string
  storyHeading: string
  storyParagraphs: unknown
  storyPullquote: string
  storyEstablished: string
  deliveryArea: string
  deliveryHours: string
  socials: unknown
}

export function rowToMenuItem(row: MenuItemRow): MenuItem {
  const item: MenuItem = {
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    price: row.price,
  }
  if (row.image) item.image = row.image
  return item
}

export function rowsToSiteContent(site: SiteContentRow, menuRows: MenuItemRow[]): SiteContent {
  return {
    brandName: site.brandName,
    tagline: site.tagline,
    uberEatsUrl: site.uberEatsUrl,
    story: {
      eyebrow: site.storyEyebrow,
      heading: site.storyHeading,
      paragraphs: site.storyParagraphs as string[],
      pullquote: site.storyPullquote,
      established: site.storyEstablished,
    },
    menu: menuRows.map(rowToMenuItem),
    delivery: { area: site.deliveryArea, hours: site.deliveryHours },
    socials: site.socials as SocialLink[],
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run server/__tests__/mappers.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma server/db.ts shared/contract.ts server/mappers.ts server/__tests__/mappers.test.ts
git commit -m "feat(server): Prisma schema, client, and row<->shape mappers"
```

---

### Task 3: tRPC core + content router

**Files:**
- Create: `server/trpc/context.ts`, `server/trpc/trpc.ts`, `server/trpc/routers/content.ts`, `server/trpc/routers/app.ts`, `server/__tests__/content.router.test.ts`

- [ ] **Step 1: Create `server/trpc/context.ts`**

```ts
import type { PrismaClient } from '@prisma/client'
import { prisma } from '../db'

export interface Context {
  db: PrismaClient
}

export function createContext(): Context {
  return { db: prisma }
}
```

- [ ] **Step 2: Create `server/trpc/trpc.ts`**

```ts
import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import type { Context } from './context'

const t = initTRPC.context<Context>().create({ transformer: superjson })

export const router = t.router
export const publicProcedure = t.procedure
```

- [ ] **Step 3: Create `server/trpc/routers/content.ts`**

```ts
import { router, publicProcedure } from '../trpc'
import { rowsToSiteContent } from '../../mappers'

export const contentRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    const [site, menu] = await Promise.all([
      ctx.db.siteContent.findUnique({ where: { id: 1 } }),
      ctx.db.menuItem.findMany({ where: { available: true }, orderBy: { sortOrder: 'asc' } }),
    ])
    if (!site) throw new Error('Site content not seeded')
    return { siteContent: rowsToSiteContent(site, menu) }
  }),
})
```

- [ ] **Step 4: Create `server/trpc/routers/app.ts`**

```ts
import { router } from '../trpc'
import { contentRouter } from './content'

export const appRouter = router({
  content: contentRouter,
})

export type AppRouter = typeof appRouter
```

- [ ] **Step 5: Write the failing test**

`server/__tests__/content.router.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'

function makeDb() {
  return {
    siteContent: {
      findUnique: vi.fn().mockResolvedValue({
        brandName: 'PBV', tagline: 'tag', uberEatsUrl: '#',
        storyEyebrow: 'Our story', storyHeading: 'h', storyParagraphs: ['p1'],
        storyPullquote: 'q', storyEstablished: 'est',
        deliveryArea: 'Airport West', deliveryHours: '5-9pm',
        socials: [{ label: 'Instagram', href: '#ig' }],
      }),
    },
    menuItem: {
      findMany: vi.fn().mockResolvedValue([
        { name: 'Margherita', tagline: 't', description: 'd', price: '$22', image: null },
      ]),
    },
  }
}

describe('content.get', () => {
  it('returns mapped site content and queries only available items in order', async () => {
    const db = makeDb()
    const caller = appRouter.createCaller({ db: db as never })
    const res = await caller.content.get()
    expect(res.siteContent.brandName).toBe('PBV')
    expect(res.siteContent.menu).toHaveLength(1)
    expect(db.menuItem.findMany).toHaveBeenCalledWith({
      where: { available: true },
      orderBy: { sortOrder: 'asc' },
    })
  })

  it('throws if site content is not seeded', async () => {
    const db = makeDb()
    db.siteContent.findUnique.mockResolvedValueOnce(null)
    const caller = appRouter.createCaller({ db: db as never })
    await expect(caller.content.get()).rejects.toThrow(/not seeded/)
  })
})
```

- [ ] **Step 6: Run test to verify it fails, then passes**

Run: `npx vitest run server/__tests__/content.router.test.ts`
First run before files exist: FAIL. After Steps 1–4 are in place, re-run.
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/trpc/context.ts server/trpc/trpc.ts server/trpc/routers/content.ts server/trpc/routers/app.ts server/__tests__/content.router.test.ts
git commit -m "feat(server): tRPC core + public content.get router"
```

---

### Task 4: Mount tRPC in Hono + static/SPA serving

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: Replace `server/index.ts`**

```ts
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './trpc/routers/app'
import { createContext } from './trpc/context'

export const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))

app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: () => createContext(),
  }),
)

// Serve uploaded images and the built client (production). Skipped under tests.
if (!process.env.VITEST) {
  app.use('/uploads/*', serveStatic({ root: './server' }))
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

if (!process.env.VITEST) {
  const port = Number(process.env.PORT ?? 8787)
  serve({ fetch: app.fetch, port })
  // eslint-disable-next-line no-console
  console.log(`PBV server listening on :${port}`)
}
```

- [ ] **Step 2: Verify the health test still passes and types compile**

Run: `npx vitest run server/__tests__/health.test.ts`
Expected: PASS (tRPC mount does not break health).
Run: `npx tsc -p tsconfig.server.json`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "feat(server): mount tRPC + static/SPA serving in Hono"
```

---

### Task 5: Frontend tRPC client, providers, useContent, App wiring

**Files:**
- Create: `src/lib/trpc.ts`, `src/lib/useContent.ts`, `src/test/providers.tsx`, `src/lib/__tests__/useContent.test.ts`
- Modify: `src/main.tsx`, `src/App.tsx`, `src/__tests__/App.test.tsx`, `vite.config.ts`

- [ ] **Step 1: Create `src/lib/trpc.ts`**

```ts
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../../server/trpc/routers/app'

export const trpc = createTRPCReact<AppRouter>()
```

- [ ] **Step 2: Write the failing test for the pure picker**

`src/lib/__tests__/useContent.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { pickContent } from '../useContent'
import { content as fallback } from '../../content'

describe('pickContent', () => {
  it('returns the bundled fallback when there is no live data', () => {
    expect(pickContent(undefined, fallback)).toBe(fallback)
  })
  it('returns live site content when present', () => {
    const live = { siteContent: { ...fallback, brandName: 'LIVE' } }
    expect(pickContent(live, fallback).brandName).toBe('LIVE')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/useContent.test.ts`
Expected: FAIL — cannot find module `../useContent`.

- [ ] **Step 4: Create `src/lib/useContent.ts`**

```ts
import { trpc } from './trpc'
import { content as fallback } from '../content'
import type { SiteContent } from '../types'

export function pickContent(
  data: { siteContent: SiteContent } | undefined,
  fb: SiteContent,
): SiteContent {
  return data?.siteContent ?? fb
}

export function useContent(): SiteContent {
  const query = trpc.content.get.useQuery(undefined, {
    placeholderData: { siteContent: fallback },
    staleTime: 60_000,
    retry: false,
  })
  return pickContent(query.data, fallback)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/useContent.test.ts`
Expected: PASS.

- [ ] **Step 6: Create `src/test/providers.tsx`**

```tsx
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import { trpc } from '../lib/trpc'

export function TestProviders({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const trpcClient = trpc.createClient({
    links: [httpBatchLink({ url: '/api/trpc', transformer: superjson })],
  })
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
```

- [ ] **Step 7: Update `src/App.tsx`**

Replace the file with (reads from `useContent()` instead of importing `content` directly):
```tsx
import { useContent } from './lib/useContent'
import { Hero } from './components/Hero'
import { Menu } from './components/Menu'
import { Story } from './components/Story'
import { Delivery } from './components/Delivery'
import { Footer } from './components/Footer'

export default function App() {
  const content = useContent()
  return (
    <>
      <Hero
        brandName={content.brandName}
        tagline={content.tagline}
        uberEatsUrl={content.uberEatsUrl}
      />
      <Menu items={content.menu} />
      <Story story={content.story} />
      <Delivery area={content.delivery.area} hours={content.delivery.hours} />
      <Footer
        brandName={content.brandName}
        uberEatsUrl={content.uberEatsUrl}
        socials={content.socials}
      />
    </>
  )
}
```

- [ ] **Step 8: Update `src/__tests__/App.test.tsx`**

Replace with (wrap in providers; placeholder data renders the fallback content synchronously):
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'
import { TestProviders } from '../test/providers'

describe('App', () => {
  it('renders all key sections from content', () => {
    render(<App />, { wrapper: TestProviders })
    expect(screen.getAllByRole('img', { name: /PBV/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Margherita')).toBeInTheDocument()
    expect(screen.getByText(/Airport West/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /order on uber eats/i }).length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 9: Update `src/main.tsx`**

Replace with (adds providers + router; `/admin` route added in Phase B):
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { trpc } from './lib/trpc'
import App from './App'
import './theme.css'

const queryClient = new QueryClient()
const trpcClient = trpc.createClient({
  links: [httpBatchLink({ url: '/api/trpc', transformer: superjson })],
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  </StrictMode>,
)
```

- [ ] **Step 10: Add the dev proxy to `vite.config.ts`**

In the `defineConfig({ ... })` object, add a `server` key alongside `plugins` and `test`:
```ts
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/uploads': 'http://localhost:8787',
    },
  },
```

- [ ] **Step 11: Run the full suite + build**

Run: `npm run test`
Expected: ALL pass (App now wrapped in providers; useContent picker covered; existing components untouched).
Run: `npm run build`
Expected: clean build (client). Note: `import type { AppRouter }` is erased at build time, so the server is not bundled into the client.

- [ ] **Step 12: Commit**

```bash
git add src/lib/trpc.ts src/lib/useContent.ts src/lib/__tests__/useContent.test.ts src/test/providers.tsx src/main.tsx src/App.tsx src/__tests__/App.test.tsx vite.config.ts
git commit -m "feat(web): tRPC client + useContent (with bundled fallback) wiring"
```

---

### Task 6: Seed script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Create `prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client'
import { content } from '../src/content'

const prisma = new PrismaClient()

async function main() {
  await prisma.siteContent.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      brandName: content.brandName,
      tagline: content.tagline,
      uberEatsUrl: content.uberEatsUrl,
      storyEyebrow: content.story.eyebrow,
      storyHeading: content.story.heading,
      storyParagraphs: content.story.paragraphs,
      storyPullquote: content.story.pullquote,
      storyEstablished: content.story.established,
      deliveryArea: content.delivery.area,
      deliveryHours: content.delivery.hours,
      socials: content.socials,
    },
  })

  const count = await prisma.menuItem.count()
  if (count === 0) {
    await prisma.menuItem.createMany({
      data: content.menu.map((m, i) => ({
        name: m.name,
        tagline: m.tagline,
        description: m.description,
        price: m.price,
        image: m.image ?? null,
        sortOrder: i,
        available: true,
      })),
    })
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete')
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Verify it type-checks (no DB needed)**

Run: `npx tsc -p tsconfig.server.json`
Expected: no type errors. (Running the seed needs a real `DATABASE_URL`; that happens in Phase C, or locally if a Postgres is available via `npm run db:migrate` then `npm run db:seed`.)

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(db): seed SiteContent + menu from bundled content"
```

---

## Self-Review

**Spec coverage (Phase A scope only):**
- Single package with `server/`, `prisma/`, `shared/` → Tasks 1–3, 6. ✓
- Prisma/Postgres schema (MenuItem, SiteContent singleton, AdminUser, Session) → Task 2. ✓ (AdminUser/Session defined now; used in Phase B.)
- Public `content.get` returning available items ordered, mapped to `SiteContent` → Task 3. ✓
- Hono serves tRPC + static + SPA fallback → Task 4. ✓
- Frontend runtime fetch via tRPC + React Query with bundled fallback → Task 5. ✓
- DB seed from `content.ts` → Task 6. ✓
- Database-free tests (mocked Prisma via `createCaller`, pure mappers/picker) → Tasks 2, 3, 5. ✓
- Dev proxy `/api` + `/uploads` → Task 5. ✓

Deferred to later phases (correctly out of Phase A): auth/argon2/sessions usage, admin routers, `/admin` UI, image upload route, Railway deploy.

**Placeholder scan:** No "TBD"/"implement later". Every code step shows complete file content. The only `update: {}` (Task 6 upsert) is intentional idempotent seeding, not a placeholder. ✓

**Type consistency:** `Context = { db: PrismaClient }` defined in Task 3 and consumed by `createCaller({ db })` in the Task 3 test and `createContext` in Task 4. `AppRouter` exported in Task 3, imported as a type in Task 5 (`src/lib/trpc.ts`). `MenuItemRow`/`SiteContentRow` defined in Task 2 mappers and matched by the mocked DB rows in Task 3. `pickContent(data, fb)` defined and used consistently in Task 5. `content.get` shape `{ siteContent }` consistent across router (Task 3), picker (Task 5), and test mocks. ✓

No gaps found for Phase A.
