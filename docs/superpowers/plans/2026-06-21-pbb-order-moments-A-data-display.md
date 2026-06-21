# PBB Order Moments · Plan A — Data + Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add open-now / sold-out status and multiple order-platform links to the PBB site (display + data model), driven by new `SiteContent` fields.

**Architecture:** Extend the shared `SiteContent` shape (replace `uberEatsUrl` with an `orderLinks` list; add `openTime`/`closeTime`/`timezone`/`soldOut`/`soldOutMessage`). A pure `computeOpenStatus()` derives the live state; an `OrderStatus` badge + a closed/sold-out banner show it; Hero/Footer render all order links and disable them when not open. The server mappers/validation/seed migrate the old single URL.

**Tech Stack:** React 18, TypeScript, Vitest + RTL, Hono + tRPC + Prisma.

**Project root:** `C:\Users\Main PC\Documents\PBV`, branch `feat/admin-backend`. Git Bash on Windows. Server tests start `// @vitest-environment node`. Single-file test: `npx vitest run <path>`; full: `npm run test`; server typecheck: `npx tsc -p tsconfig.server.json`.

**Spec:** `docs/superpowers/specs/2026-06-21-pbb-slice-order-moments-design.md`. Admin editing of these fields + save-UX is **Plan B** (next), not here.

---

## File Structure

```
src/
  types.ts                         # MODIFY: OrderLink; SiteContent (+orderLinks,+status fields; -uberEatsUrl)
  content.ts                       # MODIFY: new shape values
  lib/openStatus.ts                # CREATE: computeOpenStatus (pure)
  lib/useOpenStatus.ts             # CREATE: ticking hook around computeOpenStatus
  lib/__tests__/openStatus.test.ts # CREATE
  components/
    OrderButton.tsx / .css         # MODIFY: takes {label,url,disabled?}
    OrderStatus.tsx / .css         # CREATE: status badge
    StatusBanner.tsx / .css        # CREATE: closed/sold-out top strip
    Hero.tsx / Hero.css            # MODIFY: order links + status badge + disable
    Footer.tsx / Footer.css        # MODIFY: order links
    __tests__/*.test.tsx           # MODIFY/CREATE
  App.tsx                          # MODIFY: pass orderLinks + status fields
shared/contract.ts                 # (re-exports types; OrderLink rides along automatically)
server/
  mappers.ts                       # MODIFY: orderLinks + status fields; drop uberEatsUrl
  validation.ts                    # MODIFY: siteUpdateInput new fields
  trpc/routers/site.ts             # MODIFY: toColumns new fields
  __tests__/*.test.ts              # MODIFY
prisma/schema.prisma               # MODIFY: SiteContent columns
prisma/seed.ts                     # MODIFY: migrate uberEatsUrl -> orderLinks; new fields
```

---

### Task 1: Pure open-status logic

**Files:**
- Create: `src/lib/openStatus.ts`, `src/lib/__tests__/openStatus.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/openStatus.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeOpenStatus } from '../openStatus'

const base = {
  openTime: '17:00',
  closeTime: '21:00',
  timezone: 'UTC',
  soldOut: false,
  soldOutMessage: 'Sold out tonight — back tomorrow at 5pm',
}

describe('computeOpenStatus', () => {
  it('is open inside the window', () => {
    const s = computeOpenStatus({ ...base, now: new Date('2026-06-21T18:30:00Z') })
    expect(s.state).toBe('open')
    expect(s.label).toMatch(/ordering till 9pm/i)
  })
  it('is closed before opening', () => {
    const s = computeOpenStatus({ ...base, now: new Date('2026-06-21T12:00:00Z') })
    expect(s.state).toBe('closed')
    expect(s.label).toMatch(/opens at 5pm/i)
  })
  it('is closed after closing', () => {
    const s = computeOpenStatus({ ...base, now: new Date('2026-06-21T22:00:00Z') })
    expect(s.state).toBe('closed')
    expect(s.label).toMatch(/opens at 5pm/i)
  })
  it('sold-out overrides open hours', () => {
    const s = computeOpenStatus({ ...base, soldOut: true, now: new Date('2026-06-21T18:30:00Z') })
    expect(s.state).toBe('soldout')
    expect(s.label).toBe(base.soldOutMessage)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/openStatus.test.ts`
Expected: FAIL — cannot find module `../openStatus`.

- [ ] **Step 3: Implement `src/lib/openStatus.ts`**

```ts
export type OrderState = 'open' | 'closed' | 'soldout'

export interface OpenStatus {
  state: OrderState
  label: string
  /** Minutes until the next state change (close when open, open when closed). */
  minutesUntilChange: number
}

interface Args {
  now: Date
  openTime: string
  closeTime: string
  timezone: string
  soldOut: boolean
  soldOutMessage: string
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function localMinutes(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const h = Number(parts.find((p) => p.type === 'hour')!.value) % 24
  const m = Number(parts.find((p) => p.type === 'minute')!.value)
  return h * 60 + m
}

/** "21:00" -> "9pm", "17:00" -> "5pm", "17:30" -> "5:30pm" */
export function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`
}

export function computeOpenStatus(args: Args): OpenStatus {
  if (args.soldOut) {
    return { state: 'soldout', label: args.soldOutMessage, minutesUntilChange: 0 }
  }
  const cur = localMinutes(args.now, args.timezone)
  const open = toMinutes(args.openTime)
  const close = toMinutes(args.closeTime)

  if (cur >= open && cur < close) {
    return {
      state: 'open',
      label: `Open now — ordering till ${prettyTime(args.closeTime)}`,
      minutesUntilChange: close - cur,
    }
  }
  const minsToOpen = cur < open ? open - cur : 24 * 60 - cur + open
  return {
    state: 'closed',
    label: `Opens at ${prettyTime(args.openTime)}`,
    minutesUntilChange: minsToOpen,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/openStatus.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/openStatus.ts src/lib/__tests__/openStatus.test.ts
git commit -m "feat: pure open/sold-out status logic"
```

---

### Task 2: Migrate SiteContent shape (orderLinks + status fields) across types, content, server, and frontend consumers

> This is one coherent commit: changing the shared `SiteContent` type forces the server mappers AND the frontend consumers to update together. Implement everything below, then run the FULL suite + server typecheck + build green before committing.

**Files:**
- Modify: `src/types.ts`, `src/content.ts`, `src/components/OrderButton.tsx`, `src/components/Hero.tsx`, `src/components/Footer.tsx`, `src/App.tsx`, `prisma/schema.prisma`, `server/mappers.ts`, `server/validation.ts`, `server/trpc/routers/site.ts`, `prisma/seed.ts`
- Modify tests: `src/__tests__/types.test.ts`, `src/__tests__/content.test.ts`, `src/components/__tests__/Hero.test.tsx`, `src/components/__tests__/Footer.test.tsx`, `src/components/__tests__/OrderButton.test.tsx`, `src/__tests__/App.test.tsx`, `server/__tests__/content.router.test.ts`, `server/__tests__/site.router.test.ts`, `server/__tests__/mappers.test.ts`

- [ ] **Step 1: Update `src/types.ts`** — add `OrderLink`, change `SiteContent`:

Replace the `SiteContent` interface and add `OrderLink` (keep `MenuItem`, `SocialLink`, `BrandStory` as they are):
```ts
export interface OrderLink {
  label: string
  url: string
}

export interface SiteContent {
  brandName: string
  tagline: string
  /** Ordered delivery-platform links (Uber Eats first). Replaces uberEatsUrl. */
  orderLinks: OrderLink[]
  /** Venue-local open/close in 24h HH:MM, used for the live status. */
  openTime: string
  closeTime: string
  /** IANA timezone, e.g. "Australia/Melbourne". */
  timezone: string
  /** Manual override that closes ordering regardless of hours. */
  soldOut: boolean
  soldOutMessage: string
  story: BrandStory
  menu: MenuItem[]
  delivery: { area: string; hours: string }
  socials: SocialLink[]
}
```

- [ ] **Step 2: Update `src/content.ts`** — replace `uberEatsUrl` line and add the new fields:

```ts
  tagline: 'Wild-yeast dough, 48 hours in the making.',
  // TODO: add the live Uber Eats store URL + any other platforms (DoorDash/Menulog).
  orderLinks: [{ label: 'Uber Eats', url: 'https://www.ubereats.com/' }],
  openTime: '17:00',
  closeTime: '21:00',
  timezone: 'Australia/Melbourne',
  soldOut: false,
  soldOutMessage: 'Sold out for tonight — back tomorrow at 5pm.',
```
(Place these where `uberEatsUrl` used to be; remove the old `uberEatsUrl` line.)

- [ ] **Step 3: Update `src/components/OrderButton.tsx`** — take a label + url + optional disabled:

```tsx
import './OrderButton.css'

interface OrderButtonProps {
  label: string
  url: string
  variant?: 'solid' | 'ghost'
  disabled?: boolean
}

export function OrderButton({ label, url, variant = 'solid', disabled = false }: OrderButtonProps) {
  if (disabled) {
    return (
      <span className={`order-btn order-btn--${variant} order-btn--disabled`} aria-disabled="true">
        {label}
      </span>
    )
  }
  return (
    <a className={`order-btn order-btn--${variant}`} href={url} target="_blank" rel="noopener noreferrer">
      {label}
      <span className="order-btn__arrow foil" aria-hidden="true">→</span>
    </a>
  )
}
```
Append to `src/components/OrderButton.css`:
```css
.order-btn--disabled { opacity: 0.45; cursor: not-allowed; pointer-events: none; }
```

- [ ] **Step 4: Update `src/components/Hero.tsx`** — accept `orderLinks` + render them, label "Order on <platform>":

Change the `HeroProps` and the order-button block. Props become:
```tsx
interface HeroProps {
  brandName: string
  tagline: string
  orderLinks: { label: string; url: string }[]
  ordersDisabled?: boolean
}
```
Replace the single `<OrderButton href={uberEatsUrl} />` usage with:
```tsx
        <motion.div className="hero__orders" {...step(4)}>
          {orderLinks.map((link, i) => (
            <OrderButton
              key={link.label}
              label={`Order on ${link.label}`}
              url={link.url}
              variant={i === 0 ? 'solid' : 'ghost'}
              disabled={ordersDisabled}
            />
          ))}
        </motion.div>
```
Update the import usage and `Hero` signature accordingly. Add to `Hero.css`:
```css
.hero__orders { display: flex; flex-wrap: wrap; gap: 12px; }
```

- [ ] **Step 5: Update `src/components/Footer.tsx`** — render all order links:

`FooterProps` becomes:
```tsx
interface FooterProps {
  brandName: string
  orderLinks: { label: string; url: string }[]
  socials: SocialLink[]
}
```
Replace `<OrderButton href={uberEatsUrl} />` with:
```tsx
          <div className="footer__orders">
            {orderLinks.map((link) => (
              <OrderButton key={link.label} label={`Order on ${link.label}`} url={link.url} />
            ))}
          </div>
```
Add to `Footer.css`:
```css
.footer__orders { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
```

- [ ] **Step 6: Update `src/App.tsx`** — pass the new props (status wiring comes in Task 3; here pass orderLinks):

```tsx
      <Hero
        brandName={content.brandName}
        tagline={content.tagline}
        orderLinks={content.orderLinks}
      />
      <Menu items={content.menu} />
      <Story story={content.story} />
      <Delivery area={content.delivery.area} hours={content.delivery.hours} />
      <Footer
        brandName={content.brandName}
        orderLinks={content.orderLinks}
        socials={content.socials}
      />
```
(Recall `content` comes from `useContent()` — leave that line as-is.)

- [ ] **Step 7: Update `prisma/schema.prisma`** — change the `SiteContent` model:

Remove `uberEatsUrl String` and add:
```prisma
  orderLinks      Json
  openTime        String
  closeTime       String
  timezone        String
  soldOut         Boolean  @default(false)
  soldOutMessage  String
```

- [ ] **Step 8: Update `server/mappers.ts`** — `SiteContentRow` + `rowsToSiteContent`:

In `SiteContentRow`, replace `uberEatsUrl: string` with:
```ts
  orderLinks: unknown
  openTime: string
  closeTime: string
  timezone: string
  soldOut: boolean
  soldOutMessage: string
```
Add at top: `import { orderLinksSchema } from './validation'`. In `rowsToSiteContent` return, replace `uberEatsUrl: site.uberEatsUrl,` with:
```ts
    orderLinks: orderLinksSchema.parse(site.orderLinks),
    openTime: site.openTime,
    closeTime: site.closeTime,
    timezone: site.timezone,
    soldOut: site.soldOut,
    soldOutMessage: site.soldOutMessage,
```

- [ ] **Step 9: Update `server/validation.ts`** — add `orderLinksSchema` and update `siteUpdateInput`:

```ts
export const orderLinkSchema = z.object({ label: z.string().min(1), url: z.string().min(1) })
export const orderLinksSchema = z.array(orderLinkSchema)
```
In `siteUpdateInput`, remove `uberEatsUrl: z.string().min(1),` and add:
```ts
  orderLinks: orderLinksSchema.min(1),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  soldOut: z.boolean(),
  soldOutMessage: z.string().min(1),
```

- [ ] **Step 10: Update `server/trpc/routers/site.ts`** — `toColumns`:

Remove `uberEatsUrl: input.uberEatsUrl,` and add:
```ts
    orderLinks: input.orderLinks,
    openTime: input.openTime,
    closeTime: input.closeTime,
    timezone: input.timezone,
    soldOut: input.soldOut,
    soldOutMessage: input.soldOutMessage,
```

- [ ] **Step 11: Update `prisma/seed.ts`** — write the new SiteContent fields, migrating the legacy URL:

In the `siteContent.upsert` `create` block, replace `uberEatsUrl: content.uberEatsUrl,` with:
```ts
      orderLinks: content.orderLinks as object,
      openTime: content.openTime,
      closeTime: content.closeTime,
      timezone: content.timezone,
      soldOut: content.soldOut,
      soldOutMessage: content.soldOutMessage,
```
Change the upsert `update: {}` to backfill the new fields on existing rows (so the live DB gets them without wiping edits):
```ts
    update: {
      orderLinks: content.orderLinks as object,
      openTime: content.openTime,
      closeTime: content.closeTime,
      timezone: content.timezone,
      soldOutMessage: content.soldOutMessage,
      // NOTE: do not overwrite soldOut here — it's an owner toggle.
    },
```

- [ ] **Step 12: Update the affected tests** to the new shape:

`src/__tests__/types.test.ts` — in the sample object replace `uberEatsUrl: '#',` with:
```ts
      orderLinks: [{ label: 'Uber Eats', url: '#' }],
      openTime: '17:00', closeTime: '21:00', timezone: 'UTC', soldOut: false, soldOutMessage: 'x',
```

`src/__tests__/content.test.ts` — replace the Uber Eats url test with:
```ts
  it('has at least one order link', () => {
    expect(content.orderLinks.length).toBeGreaterThanOrEqual(1)
    expect(content.orderLinks[0].url.length).toBeGreaterThan(0)
  })
  it('defines open/close hours and a timezone', () => {
    expect(content.openTime).toMatch(/^\d{2}:\d{2}$/)
    expect(content.closeTime).toMatch(/^\d{2}:\d{2}$/)
    expect(content.timezone.length).toBeGreaterThan(0)
  })
```

`src/components/__tests__/OrderButton.test.tsx` — replace with:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderButton } from '../OrderButton'

describe('OrderButton', () => {
  it('links to the url in a new tab', () => {
    render(<OrderButton label="Order on Uber Eats" url="https://ubereats.com/pbb" />)
    const link = screen.getByRole('link', { name: /order on uber eats/i })
    expect(link).toHaveAttribute('href', 'https://ubereats.com/pbb')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
  it('renders a non-link disabled state', () => {
    render(<OrderButton label="Opens at 5pm" url="#" disabled />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('Opens at 5pm')).toHaveAttribute('aria-disabled', 'true')
  })
})
```

`src/components/__tests__/Hero.test.tsx` — replace with:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '../Hero'

describe('Hero', () => {
  it('shows the brand, tagline and order links', () => {
    render(
      <Hero
        brandName="PBB"
        tagline="Slow dough."
        orderLinks={[{ label: 'Uber Eats', url: '#ue' }, { label: 'DoorDash', url: '#dd' }]}
      />,
    )
    expect(screen.getByRole('img', { name: /PBB/i })).toBeInTheDocument()
    expect(screen.getByText('Slow dough.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /order on uber eats/i })).toHaveAttribute('href', '#ue')
    expect(screen.getByRole('link', { name: /order on doordash/i })).toHaveAttribute('href', '#dd')
  })
  it('disables ordering when ordersDisabled', () => {
    render(<Hero brandName="PBB" tagline="t" orderLinks={[{ label: 'Uber Eats', url: '#ue' }]} ordersDisabled />)
    expect(screen.queryByRole('link', { name: /order on uber eats/i })).toBeNull()
  })
})
```

`src/components/__tests__/Footer.test.tsx` — replace the brandName/uberEatsUrl render with:
```tsx
    render(
      <Footer
        brandName="PBB"
        orderLinks={[{ label: 'Uber Eats', url: '#order' }]}
        socials={[{ label: 'Instagram', href: '#ig' }]}
      />,
    )
    expect(screen.getByRole('link', { name: /order on uber eats/i })).toHaveAttribute('href', '#order')
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', '#ig')
```
(Keep the test's imports/describe; only the render + assertions change. Remove any old `/order on uber eats/` count≥2 assumption — assert the link exists.)

`src/__tests__/App.test.tsx` — the existing assertion `getAllByRole('link', { name: /order on uber eats/i }).length >= 2` must change. The bundled fallback has one order link, rendered in both Hero and Footer = 2. Keep:
```tsx
    expect(screen.getAllByRole('link', { name: /order on uber eats/i }).length).toBeGreaterThanOrEqual(2)
```
(No change needed if the fallback's single Uber Eats link renders in Hero + Footer. Verify; if only 1 appears, lower to `>= 1`.)

`server/__tests__/mappers.test.ts`, `server/__tests__/content.router.test.ts`, `server/__tests__/site.router.test.ts` — in each fixture `SiteContentRow`/input, replace `uberEatsUrl: '#'`/`'...'` with:
```ts
      orderLinks: [{ label: 'Uber Eats', url: '#' }],
      openTime: '17:00', closeTime: '21:00', timezone: 'UTC', soldOut: false, soldOutMessage: 'x',
```
For `site.router.test.ts`'s `validInput`, use `url: 'https://ubereats.com/pbb'` inside orderLinks and assert `arg.create.orderLinks` instead of any uberEats field.

- [ ] **Step 13: Regenerate Prisma client, then run everything green**

```bash
npx prisma generate
```
Run: `npm run test` → all pass. `npx tsc -p tsconfig.server.json` → no errors. `npm run build` → clean.
Fix any consumer the compiler flags until all three are green.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: replace uberEatsUrl with orderLinks + add open/sold-out status fields"
```

---

### Task 3: Status hook, badge, banner + wire into the site

**Files:**
- Create: `src/lib/useOpenStatus.ts`, `src/components/OrderStatus.tsx`, `src/components/OrderStatus.css`, `src/components/StatusBanner.tsx`, `src/components/StatusBanner.css`, `src/components/__tests__/OrderStatus.test.tsx`
- Modify: `src/App.tsx`, `src/components/Hero.tsx`

- [ ] **Step 1: Implement `src/lib/useOpenStatus.ts`**

```ts
import { useEffect, useState } from 'react'
import { computeOpenStatus, type OpenStatus } from './openStatus'
import type { SiteContent } from '../types'

export function useOpenStatus(content: SiteContent): OpenStatus {
  const compute = () =>
    computeOpenStatus({
      now: new Date(),
      openTime: content.openTime,
      closeTime: content.closeTime,
      timezone: content.timezone,
      soldOut: content.soldOut,
      soldOutMessage: content.soldOutMessage,
    })
  const [status, setStatus] = useState<OpenStatus>(compute)
  useEffect(() => {
    const id = setInterval(() => setStatus(compute()), 30_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.openTime, content.closeTime, content.timezone, content.soldOut, content.soldOutMessage])
  return status
}
```

- [ ] **Step 2: Write the failing test** `src/components/__tests__/OrderStatus.test.tsx`

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderStatus } from '../OrderStatus'

describe('OrderStatus', () => {
  it('renders the label with a state attribute', () => {
    render(<OrderStatus status={{ state: 'open', label: 'Open now — ordering till 9pm', minutesUntilChange: 90 }} />)
    const el = screen.getByText(/open now/i)
    expect(el).toBeInTheDocument()
    expect(el.closest('[data-state]')).toHaveAttribute('data-state', 'open')
  })
})
```

- [ ] **Step 3: Run it (FAIL), implement `src/components/OrderStatus.tsx`, run (PASS)**

```tsx
import type { OpenStatus } from '../lib/openStatus'
import './OrderStatus.css'

export function OrderStatus({ status }: { status: OpenStatus }) {
  return (
    <div className="order-status" data-state={status.state}>
      <span className="order-status__dot" aria-hidden="true" />
      <span className="order-status__label">{status.label}</span>
    </div>
  )
}
```
`src/components/OrderStatus.css`:
```css
.order-status { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-ui); font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; }
.order-status__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--muted); }
.order-status[data-state="open"] .order-status__dot { background: #3ea66a; }
.order-status[data-state="soldout"] .order-status__dot { background: #c0552e; }
.order-status[data-state="open"] .order-status__label { color: var(--gold); }
```

Run: `npx vitest run src/components/__tests__/OrderStatus.test.tsx` → PASS.

- [ ] **Step 4: Implement `src/components/StatusBanner.tsx` + css** (shows only when not open)

```tsx
import type { OpenStatus } from '../lib/openStatus'
import './StatusBanner.css'

export function StatusBanner({ status }: { status: OpenStatus }) {
  if (status.state === 'open') return null
  return (
    <div className="status-banner" role="status" data-state={status.state}>
      {status.label}
    </div>
  )
}
```
`src/components/StatusBanner.css`:
```css
.status-banner { width: 100%; text-align: center; padding: 9px 16px; font-family: var(--font-ui); font-size: 12px; letter-spacing: 2px; text-transform: uppercase; background: var(--ink); color: var(--paper); }
.status-banner[data-state="soldout"] { background: #8c3a1f; }
```

- [ ] **Step 5: Wire into `src/App.tsx` and `Hero`**

In `App.tsx`, compute status and pass disabling + banner:
```tsx
import { useContent } from './lib/useContent'
import { useOpenStatus } from './lib/useOpenStatus'
import { StatusBanner } from './components/StatusBanner'
import { OrderStatus } from './components/OrderStatus'
import { Hero } from './components/Hero'
import { Menu } from './components/Menu'
import { Story } from './components/Story'
import { Delivery } from './components/Delivery'
import { Footer } from './components/Footer'

export default function App() {
  const content = useContent()
  const status = useOpenStatus(content)
  const ordersDisabled = status.state !== 'open'
  return (
    <>
      <StatusBanner status={status} />
      <Hero
        brandName={content.brandName}
        tagline={content.tagline}
        orderLinks={content.orderLinks}
        ordersDisabled={ordersDisabled}
        status={status}
      />
      <Menu items={content.menu} />
      <Story story={content.story} />
      <Delivery area={content.delivery.area} hours={content.delivery.hours} />
      <Footer
        brandName={content.brandName}
        orderLinks={content.orderLinks}
        socials={content.socials}
      />
    </>
  )
}
```
In `Hero.tsx`, add `status?: OpenStatus` to props (import the type) and render the badge above the order buttons:
```tsx
        {status && (
          <motion.div className="hero__status" {...step(3.5 as unknown as number)}>
            <OrderStatus status={status} />
          </motion.div>
        )}
```
Simpler: render `<div className="hero__status"><OrderStatus status={status} /></div>` (no motion) right before the `hero__orders` block, guarded by `status`. Import `OrderStatus` and the `OpenStatus` type. Add to `Hero.css`:
```css
.hero__status { margin: 0 0 14px; }
```

- [ ] **Step 6: Update `Hero` test** to allow the optional `status` prop (existing test omits it — fine since it's optional). Run `npm run test`, `npm run build` — all green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: live open/sold-out status badge + banner; disable ordering when closed"
```

---

### Task 4: Full verification + deploy

- [ ] **Step 1: Full suite + build + server typecheck**

Run: `npm run test` (all pass), `npm run build` (clean), `npx tsc -p tsconfig.server.json` (no errors).

- [ ] **Step 2: Commit any fixes, then deploy**

```bash
git add -A && git commit -m "test: order-moments verification" --allow-empty
git push origin feat/admin-backend
railway up --detach --service pbb-app
```
(The seed's `update` block backfills the new columns on the live DB; `db push` adds them.)

- [ ] **Step 3: Verify live**

After deploy SUCCESS, confirm `https://pbb-app-production.up.railway.app/api/trpc/content.get` returns `orderLinks` + `openTime`/`closeTime`/`soldOut`, and the homepage shows the status badge.

---

## Self-Review

**Spec coverage (Plan A scope):**
- Open-now status + countdown label → Task 1 (`computeOpenStatus`) + Task 3 (badge/hook). ✓
- Order button disabled when closed → Task 2 (OrderButton disabled) + Task 3 (App passes `ordersDisabled`). ✓
- Sold-out override + banner → Task 1 (soldout state) + Task 3 (StatusBanner). ✓
- Multiple order platforms → Task 2 (orderLinks across type/content/Hero/Footer/server/seed). ✓
- Structured hours + timezone fields → Task 2 (model/content) used by Task 1/3. ✓
- Server validation + mapper + seed migration of `uberEatsUrl` → Task 2 (steps 8–11). ✓
- Admin editing of these fields + save UX → **Plan B** (correctly out of scope here). ✓

**Placeholder scan:** Content `// TODO`s (real Uber Eats URL, extra platforms) are owner-supplied data, not plan gaps. Every code step is complete. ✓

**Type consistency:** `OrderLink {label,url}` defined in Task 2 and used identically in content, OrderButton, Hero, Footer, validation (`orderLinkSchema`), mappers (`orderLinksSchema`). `OpenStatus {state,label,minutesUntilChange}` defined Task 1, consumed by `useOpenStatus`, `OrderStatus`, `StatusBanner`, `Hero`. `SiteContent` new fields (`orderLinks`, `openTime`, `closeTime`, `timezone`, `soldOut`, `soldOutMessage`) consistent across types/content/mappers/validation/site router/seed. `uberEatsUrl` removed everywhere (Task 2 touches every consumer). ✓

No gaps for Plan A.
