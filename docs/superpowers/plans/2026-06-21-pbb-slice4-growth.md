# PBB Slice 4 — Email Capture + Order Analytics + Delivery Checker Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Collect customer emails (with an optional Resend welcome), track "Order on …" click-throughs, and let visitors check if PBB delivers to their suburb.

**Architecture:** Two new additive Prisma tables (`EmailSignup`, `OrderClick`) and a `deliverySuburbs` array on `SiteContent`. Public tRPC mutations (`emails.subscribe`, `analytics.orderClick`) + admin queries (`emails.list`, `analytics.summary`). A public email form + delivery-area checker; order buttons fire a fire-and-forget click event. A Resend welcome email sends only when `RESEND_API_KEY` is set (graceful no-op otherwise). New admin "Insights" tab.

**Tech Stack:** Hono+tRPC+Prisma, resend (optional), React, Vitest.

**Project root:** `C:\Users\Main PC\Documents\PBV`, branch `feat/admin-backend`. Checks: `npm run test`, `npm run build`, `npx tsc -p tsconfig.server.json`. All new DB changes are ADDITIVE (safe `db push`).

---

### Task 1: Data model — EmailSignup, OrderClick, deliverySuburbs

**Files:**
- Modify: `prisma/schema.prisma`, `src/types.ts`, `src/content.ts`, `server/mappers.ts`, `server/validation.ts`, `server/trpc/routers/site.ts`, `prisma/seed.ts`
- Modify tests as the compiler requires (site.router/mappers/content fixtures gain `deliverySuburbs`).

- [ ] **Step 1: `prisma/schema.prisma`** — add two models and one column (all additive, with defaults):

Add the column to `SiteContent`:
```prisma
  deliverySuburbs  String[] @default([])
```
Add two new models:
```prisma
model EmailSignup {
  id        String   @id @default(cuid())
  email     String   @unique
  source    String   @default("site")
  createdAt DateTime @default(now())
}

model OrderClick {
  id        String   @id @default(cuid())
  platform  String
  createdAt DateTime @default(now())
}
```
Run `npx prisma generate`.

- [ ] **Step 2: `src/types.ts`** — add `deliverySuburbs: string[]` to `SiteContent` (after `socials`):
```ts
  deliverySuburbs: string[]
```

- [ ] **Step 3: `src/content.ts`** — add a default suburb list (Airport West + neighbours) after `socials`:
```ts
  deliverySuburbs: ['Airport West', 'Niddrie', 'Essendon', 'Keilor East', 'Strathmore', 'Avondale Heights', 'Aberfeldie', 'Moonee Ponds'],
```

- [ ] **Step 4: `server/mappers.ts`** — add `deliverySuburbs: unknown` to `SiteContentRow`; in `rowsToSiteContent`, add `deliverySuburbs: suburbsSchema.parse(site.deliverySuburbs),` (import `suburbsSchema` from `./validation`).

- [ ] **Step 5: `server/validation.ts`** — add:
```ts
export const suburbsSchema = z.array(z.string())
```
and in `siteUpdateInput` add `deliverySuburbs: z.array(z.string()),`.

- [ ] **Step 6: `server/trpc/routers/site.ts`** — in `toColumns`, add `deliverySuburbs: input.deliverySuburbs,`.

- [ ] **Step 7: `prisma/seed.ts`** — in the `siteContent.create` data, add `deliverySuburbs: content.deliverySuburbs,`. (Create-only; non-destructive seed stays intact.)

- [ ] **Step 8: Update fixtures** the compiler flags — `server/__tests__/mappers.test.ts`, `server/__tests__/content.router.test.ts`, `server/__tests__/site.router.test.ts` `SiteContentRow`/input fixtures gain `deliverySuburbs: ['Airport West']`. `src/__tests__/types.test.ts` sample gains `deliverySuburbs: []`. `src/admin/__tests__/BrandEditor.test.tsx` `getState.data` gains `deliverySuburbs: ['Airport West']`. `BrandEditor.tsx`'s `SiteRow`/`BrandForm`/`rowToForm`/`formToInput` gain `deliverySuburbs` (string[]) so site.update still validates — wire a textarea later (Task 5); for now carry it through: in `BrandForm` add `deliverySuburbs: string[]`, in `rowToForm` `deliverySuburbs: r.deliverySuburbs`, in `formToInput` `deliverySuburbs: f.deliverySuburbs`.

- [ ] **Step 9: Verify (all green) + commit**

`npx prisma generate`; `npm run test`; `npx tsc -p tsconfig.server.json`; `npm run build`.
```bash
git add -A
git commit -m "feat: EmailSignup + OrderClick models + deliverySuburbs on SiteContent"
```

---

### Task 2: emails router (+ optional Resend) and analytics router

**Files:**
- Create: `server/email.ts`, `server/trpc/routers/emails.ts`, `server/trpc/routers/analytics.ts`, `server/__tests__/emails.router.test.ts`, `server/__tests__/analytics.router.test.ts`
- Modify: `server/trpc/routers/app.ts`, `server/validation.ts`

- [ ] **Step 1: `server/email.ts`** — optional Resend welcome (no-op without a key)

```ts
/** Sends a welcome email via Resend if RESEND_API_KEY is set; otherwise a no-op. */
export async function sendWelcomeEmail(to: string): Promise<void> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM // e.g. "PBB <hello@yourdomain.com>"
  if (!key || !from) return
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(key)
    await resend.emails.send({
      from,
      to,
      subject: 'Welcome to PBB — Pizza by Backhaus',
      html: '<p>Thanks for joining the list — we\'ll let you know about specials and new drops. 🍕</p>',
    })
  } catch {
    // Never let email delivery break signup.
  }
}
```

- [ ] **Step 2: `server/validation.ts`** — add:
```ts
export const emailInput = z.object({ email: z.string().email({ pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ }) })
export const orderClickInput = z.object({ platform: z.string().min(1).max(60) })
```

- [ ] **Step 3: Write failing tests**

`server/__tests__/emails.router.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'

function caller(db: unknown, user: { id: string; email: string } | null = null) {
  return appRouter.createCaller({ db: db as never, c: {} as never, user, resHeaders: new Headers() })
}

describe('emails router', () => {
  it('subscribe stores a new email (public)', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'e1' })
    const db = { emailSignup: { create } }
    const res = await caller(db).emails.subscribe({ email: 'a@b.co' })
    expect(res).toEqual({ ok: true })
    expect(create).toHaveBeenCalledWith({ data: { email: 'a@b.co' } })
  })
  it('subscribe is idempotent on duplicates', async () => {
    const create = vi.fn().mockRejectedValue(Object.assign(new Error('dup'), { code: 'P2002' }))
    const res = await caller({ emailSignup: { create } }).emails.subscribe({ email: 'a@b.co' })
    expect(res).toEqual({ ok: true })
  })
  it('list requires auth', async () => {
    await expect(caller({}, null).emails.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
  it('list returns signups for an owner', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'e1', email: 'a@b.co', createdAt: new Date() }])
    const res = await caller({ emailSignup: { findMany } }, { id: 'u', email: 'o@p.co' }).emails.list()
    expect(res).toHaveLength(1)
  })
})
```

`server/__tests__/analytics.router.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import { appRouter } from '../trpc/routers/app'

function caller(db: unknown, user: { id: string; email: string } | null = null) {
  return appRouter.createCaller({ db: db as never, c: {} as never, user, resHeaders: new Headers() })
}

describe('analytics router', () => {
  it('orderClick logs a click (public)', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'c1' })
    const res = await caller({ orderClick: { create } }).analytics.orderClick({ platform: 'Uber Eats' })
    expect(res).toEqual({ ok: true })
    expect(create).toHaveBeenCalledWith({ data: { platform: 'Uber Eats' } })
  })
  it('summary requires auth', async () => {
    await expect(caller({}, null).analytics.summary()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
  it('summary returns totals per platform', async () => {
    const groupBy = vi.fn().mockResolvedValue([{ platform: 'Uber Eats', _count: { _all: 3 } }])
    const count = vi.fn().mockResolvedValue(3)
    const res = await caller({ orderClick: { groupBy, count } }, { id: 'u', email: 'o@p.co' }).analytics.summary()
    expect(res.total).toBe(3)
    expect(res.byPlatform[0]).toEqual({ platform: 'Uber Eats', count: 3 })
  })
})
```

- [ ] **Step 4: Implement `server/trpc/routers/emails.ts`**

```ts
import { router, publicProcedure, adminProcedure } from '../trpc'
import { emailInput } from '../../validation'
import { sendWelcomeEmail } from '../../email'

export const emailsRouter = router({
  subscribe: publicProcedure.input(emailInput).mutation(async ({ ctx, input }) => {
    try {
      await ctx.db.emailSignup.create({ data: { email: input.email } })
      await sendWelcomeEmail(input.email)
    } catch (e: unknown) {
      // Unique-constraint (already subscribed) is fine; swallow it.
      if (!(typeof e === 'object' && e && 'code' in e && (e as { code?: string }).code === 'P2002')) throw e
    }
    return { ok: true }
  }),

  list: adminProcedure.query(({ ctx }) =>
    ctx.db.emailSignup.findMany({ orderBy: { createdAt: 'desc' } }),
  ),
})
```

- [ ] **Step 5: Implement `server/trpc/routers/analytics.ts`**

```ts
import { router, publicProcedure, adminProcedure } from '../trpc'
import { orderClickInput } from '../../validation'

export const analyticsRouter = router({
  orderClick: publicProcedure.input(orderClickInput).mutation(async ({ ctx, input }) => {
    await ctx.db.orderClick.create({ data: { platform: input.platform } })
    return { ok: true }
  }),

  summary: adminProcedure.query(async ({ ctx }) => {
    const [grouped, total] = await Promise.all([
      ctx.db.orderClick.groupBy({ by: ['platform'], _count: { _all: true } }),
      ctx.db.orderClick.count(),
    ])
    const byPlatform = grouped
      .map((g) => ({ platform: g.platform, count: g._count._all }))
      .sort((a, b) => b.count - a.count)
    return { total, byPlatform }
  }),
})
```

- [ ] **Step 6: Mount** in `server/trpc/routers/app.ts` — add `emails: emailsRouter,` and `analytics: analyticsRouter,` (with imports).

- [ ] **Step 7: Verify + commit**

Run both new tests (PASS), `npm run test`, `npx tsc -p tsconfig.server.json`, `npm run build`.
```bash
git add server/email.ts server/trpc/routers/emails.ts server/trpc/routers/analytics.ts server/__tests__/emails.router.test.ts server/__tests__/analytics.router.test.ts server/trpc/routers/app.ts server/validation.ts
git commit -m "feat(server): email signup + order-click analytics routers"
```

---

### Task 3: Public — email signup, order-click tracking, delivery checker

**Files:**
- Create: `src/components/EmailSignup.tsx` + `.css`, `src/components/DeliveryChecker.tsx` + `.css`, tests for each
- Modify: `src/components/OrderButton.tsx` (fire click event), `src/components/Delivery.tsx` (add the checker), `src/components/Footer.tsx` (add EmailSignup)

- [ ] **Step 1: Order-click tracking in `OrderButton.tsx`** — add an `onClick` that logs via a tiny helper that posts to the API. Add a prop-free fire-and-forget using fetch to the tRPC mutation is awkward; instead, accept an optional `onOrder?: () => void` prop and call it on click. The caller (Hero/Footer) passes a handler that calls `trpc.analytics.orderClick`. Update `OrderButton` to call `onOrder?.()` in the anchor's `onClick`:
```tsx
interface OrderButtonProps {
  label: string
  url: string
  variant?: 'solid' | 'ghost'
  disabled?: boolean
  onOrder?: () => void
}
```
In the active `<a>`, add `onClick={() => onOrder?.()}`. (Disabled span unchanged.)

- [ ] **Step 2: Wire tracking in Hero + Footer** — they already render `OrderButton`. Add `const orderClick = trpc.analytics.orderClick.useMutation()` and pass `onOrder={() => orderClick.mutate({ platform: link.label })}` to each `OrderButton`. (Import `trpc`.) This requires Hero/Footer to be inside the tRPC provider — they already are.

- [ ] **Step 3: `EmailSignup.tsx`** (TDD)

Test `src/components/__tests__/EmailSignup.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const subscribe = vi.fn().mockResolvedValue({ ok: true })
vi.mock('../../lib/trpc', () => ({
  trpc: { emails: { subscribe: { useMutation: () => ({ mutateAsync: subscribe, isPending: false }) } } },
}))
import { EmailSignup } from '../EmailSignup'
beforeEach(() => subscribe.mockClear())

describe('EmailSignup', () => {
  it('submits the email and confirms', async () => {
    render(<EmailSignup />)
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.co' } })
    fireEvent.click(screen.getByRole('button', { name: /notify me|sign up|join/i }))
    await waitFor(() => expect(subscribe).toHaveBeenCalledWith({ email: 'a@b.co' }))
    expect(await screen.findByText(/thanks|you're on the list/i)).toBeInTheDocument()
  })
})
```
Implement `src/components/EmailSignup.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { trpc } from '../lib/trpc'
import './EmailSignup.css'

export function EmailSignup({ prompt = 'Get specials & new drops in your inbox.' }: { prompt?: string }) {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const subscribe = trpc.emails.subscribe.useMutation()
  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await subscribe.mutateAsync({ email })
      setDone(true)
    } catch {
      setDone(true) // treat as success (idempotent); never discourage signups
    }
  }
  if (done) return <p className="email-signup__done">Thanks — you're on the list. 🍕</p>
  return (
    <form className="email-signup" onSubmit={submit}>
      <label className="email-signup__label" htmlFor="pbb-email">{prompt}</label>
      <div className="email-signup__row">
        <input id="pbb-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" aria-label="Email" />
        <button type="submit" disabled={subscribe.isPending}>Notify me</button>
      </div>
    </form>
  )
}
```
`src/components/EmailSignup.css`:
```css
.email-signup { display: flex; flex-direction: column; gap: 8px; max-width: 420px; }
.email-signup__label { font-family: var(--font-ui); font-size: 12px; letter-spacing: 1px; color: var(--muted); }
.email-signup__row { display: flex; gap: 8px; }
.email-signup input { flex: 1; padding: 11px 12px; border: 1px solid var(--hairline); border-radius: 2px; font: inherit; background: var(--paper); }
.email-signup button { padding: 11px 18px; border: none; background: var(--ink); color: var(--paper); border-radius: 2px; font-family: var(--font-ui); font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; }
.email-signup__done { font-family: var(--font-italic); font-style: italic; color: var(--gold); }
```

- [ ] **Step 4: `DeliveryChecker.tsx`** (TDD)

Test `src/components/__tests__/DeliveryChecker.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeliveryChecker } from '../DeliveryChecker'

const suburbs = ['Airport West', 'Niddrie', 'Essendon']

describe('DeliveryChecker', () => {
  it('confirms a covered suburb', () => {
    render(<DeliveryChecker suburbs={suburbs} />)
    fireEvent.change(screen.getByLabelText(/suburb/i), { target: { value: 'niddrie' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(screen.getByText(/yes/i)).toBeInTheDocument()
  })
  it('shows an out-of-area message + signup for an uncovered suburb', () => {
    render(<DeliveryChecker suburbs={suburbs} />)
    fireEvent.change(screen.getByLabelText(/suburb/i), { target: { value: 'Fitzroy' } })
    fireEvent.click(screen.getByRole('button', { name: /check/i }))
    expect(screen.getByText(/not yet|don.t deliver/i)).toBeInTheDocument()
  })
})
```
Implement `src/components/DeliveryChecker.tsx`:
```tsx
import { useState, type FormEvent } from 'react'
import { EmailSignup } from './EmailSignup'
import './DeliveryChecker.css'

export function DeliveryChecker({ suburbs }: { suburbs: string[] }) {
  const [q, setQ] = useState('')
  const [result, setResult] = useState<null | 'in' | 'out'>(null)
  function check(e: FormEvent) {
    e.preventDefault()
    const needle = q.trim().toLowerCase()
    if (!needle) return
    const hit = suburbs.some((s) => s.toLowerCase() === needle || s.toLowerCase().includes(needle))
    setResult(hit ? 'in' : 'out')
  }
  return (
    <div className="delivery-checker">
      <form onSubmit={check} className="delivery-checker__form">
        <label htmlFor="pbb-suburb" className="label">Do we deliver to you?</label>
        <div className="delivery-checker__row">
          <input id="pbb-suburb" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Your suburb" aria-label="Suburb" />
          <button type="submit">Check</button>
        </div>
      </form>
      {result === 'in' && <p className="delivery-checker__yes">Yes — we deliver to {q.trim()}. 🍕</p>}
      {result === 'out' && (
        <div className="delivery-checker__out">
          <p>Not yet — we don't deliver to {q.trim()} right now.</p>
          <EmailSignup prompt="Leave your email and we'll tell you when we reach your area." />
        </div>
      )}
    </div>
  )
}
```
`src/components/DeliveryChecker.css`:
```css
.delivery-checker { margin-top: 24px; max-width: 460px; }
.delivery-checker__row { display: flex; gap: 8px; margin-top: 8px; }
.delivery-checker input { flex: 1; padding: 11px 12px; border: 1px solid var(--hairline); border-radius: 2px; font: inherit; }
.delivery-checker button { padding: 11px 18px; border: 1px solid var(--ink); background: transparent; color: var(--ink); border-radius: 2px; cursor: pointer; font-family: var(--font-ui); text-transform: uppercase; font-size: 12px; letter-spacing: 1.5px; }
.delivery-checker__yes { font-family: var(--font-italic); font-style: italic; color: var(--gold); margin-top: 12px; }
.delivery-checker__out { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
```

- [ ] **Step 5: Place them** — in `Delivery.tsx`, accept `suburbs: string[]` prop and render `<DeliveryChecker suburbs={suburbs} />` after the existing content; in `App.tsx` pass `suburbs={content.deliverySuburbs}` to `Delivery`. In `Footer.tsx`, render `<EmailSignup />` in the footer meta area (above socials). Update the `Delivery` test to pass `suburbs={[]}` (the existing assertions about area/hours stay).

- [ ] **Step 6: Verify + commit**

Run the new tests + `npm run test` + `npm run build`.
```bash
git add -A
git commit -m "feat(web): email signup, order-click tracking, delivery-area checker"
```

---

### Task 4: Admin Insights tab

**Files:**
- Create: `src/admin/InsightsPanel.tsx`, `src/admin/__tests__/InsightsPanel.test.tsx`
- Modify: `src/admin/Dashboard.tsx`

- [ ] **Step 1: Test** `src/admin/__tests__/InsightsPanel.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../lib/trpc', () => ({
  trpc: {
    analytics: { summary: { useQuery: () => ({ data: { total: 5, byPlatform: [{ platform: 'Uber Eats', count: 5 }] }, isLoading: false }) } },
    emails: { list: { useQuery: () => ({ data: [{ id: 'e1', email: 'a@b.co', createdAt: new Date().toISOString() }], isLoading: false }) } },
  },
}))
import { InsightsPanel } from '../InsightsPanel'

describe('InsightsPanel', () => {
  it('shows click totals and signups', () => {
    render(<InsightsPanel />)
    expect(screen.getByText(/5/)).toBeInTheDocument()
    expect(screen.getByText('Uber Eats')).toBeInTheDocument()
    expect(screen.getByText('a@b.co')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Implement `src/admin/InsightsPanel.tsx`**
```tsx
import { trpc } from '../lib/trpc'

export function InsightsPanel() {
  const summary = trpc.analytics.summary.useQuery()
  const emails = trpc.emails.list.useQuery()
  return (
    <section className="admin-panel">
      <h2>Insights</h2>
      <h3>Order clicks — total {summary.data?.total ?? 0}</h3>
      <ul className="admin-list">
        {(summary.data?.byPlatform ?? []).map((p) => (
          <li className="admin-row" key={p.platform}>
            <span className="admin-row-name">{p.platform}</span>
            <span className="admin-row-price">{p.count}</span>
          </li>
        ))}
      </ul>
      <h3>Email list — {emails.data?.length ?? 0} signups</h3>
      <ul className="admin-list">
        {(emails.data ?? []).map((e) => (
          <li className="admin-row" key={e.id}><span className="admin-row-name">{e.email}</span></li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 3: Add the tab** to `Dashboard.tsx` — add `'insights'` to the tab union, import `InsightsPanel`, add a nav button and `{tab === 'insights' && <InsightsPanel />}`.

- [ ] **Step 4: Verify + commit**

Run tests + build.
```bash
git add src/admin/InsightsPanel.tsx src/admin/__tests__/InsightsPanel.test.tsx src/admin/Dashboard.tsx
git commit -m "feat(admin): Insights tab — order clicks + email list"
```

---

### Task 5: Delivery suburbs editor in BrandEditor + verify + deploy

**Files:**
- Modify: `src/admin/BrandEditor.tsx` (add a suburbs textarea), `src/admin/__tests__/BrandEditor.test.tsx`

- [ ] **Step 1:** In `BrandEditor.tsx`, `BrandForm` already carries `deliverySuburbs: string[]` (Task 1). Render a textarea (one suburb per line) inside the "Hours & availability" or a new fieldset:
```tsx
      <label>Delivery suburbs (one per line)
        <textarea
          value={data.deliverySuburbs.join('\n')}
          onChange={(e) => set('deliverySuburbs', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
          aria-label="delivery suburbs"
        />
      </label>
```
Ensure `formToInput` includes `deliverySuburbs: f.deliverySuburbs` (added in Task 1).

- [ ] **Step 2:** Add to the BrandEditor test's `getState.data`: `deliverySuburbs: ['Airport West', 'Niddrie']`, and a quick assertion the textarea prefills (optional). Run tests.

- [ ] **Step 3: Verify all + deploy**

`npm run test` (all pass), `npm run build` (clean), `npx tsc -p tsconfig.server.json` (clean).
```bash
git add -A && git commit -m "feat(admin): edit delivery suburbs"
git push origin feat/admin-backend
railway up --detach --service pbb-app
```

- [ ] **Step 4: Verify live** — after SUCCESS: public site shows email signup + delivery checker; clicking an order button then checking the admin Insights tab shows the count tick up; signups appear in Insights.

> **Owner setup (optional, non-blocking):** to send welcome emails, set `RESEND_API_KEY` and `RESEND_FROM` (a verified Resend sender) on the Railway service. Without them, emails are still collected (visible in Insights) — just no auto-email. Edit your real covered suburbs in Brand → Delivery suburbs.

---

## Self-Review

**Spec coverage:** Email capture (collect + admin view + optional Resend) → Tasks 2,3,4. ✓ Order-click analytics → Tasks 2 (router), 3 (tracking), 4 (display). ✓ Delivery-area checker (+ out-of-area email capture) → Tasks 1 (suburbs), 3 (checker), 5 (admin edit). ✓ All DB changes additive (safe redeploy). ✓

**Placeholder scan:** complete code; the Resend env vars are owner-supplied runtime config, not plan gaps. ✓

**Type consistency:** `deliverySuburbs: string[]` consistent across types/content/mappers/validation/site router/seed/BrandEditor. `emailInput`/`orderClickInput`/`suburbsSchema` in validation, used by routers. `emails`/`analytics` router procedure names match the frontend + tests + InsightsPanel. `OrderButton` gains optional `onOrder`. ✓

No gaps for Slice 4.
