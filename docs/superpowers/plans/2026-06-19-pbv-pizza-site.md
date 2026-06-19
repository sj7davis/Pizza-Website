# PBV Sourdough Pizza Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium, delivery-only single-page site for PBV (sourdough pizza) that funnels visitors to Uber Eats, in an editorial-minimal × foil-gold aesthetic.

**Architecture:** React + Vite + TypeScript single-page app. All copy lives in one typed `content.ts`. Each page section is an isolated component reading from that config. Motion library drives one orchestrated load sequence + restrained scroll reveals, all gated on `prefers-reduced-motion`. Vitest + React Testing Library for unit tests; final visual verification via the dev server.

**Tech Stack:** Vite, React 18, TypeScript, `motion` (Motion library), Vitest, @testing-library/react, jsdom.

**Project root:** `C:\Users\Main PC\Documents\PBV` (standalone git repo, already initialised; spec at `docs/superpowers/specs/2026-06-19-pbv-pizza-site-design.md`).

---

## File Structure

```
PBV/
  index.html              # Vite entry, font preconnect
  package.json
  vite.config.ts          # Vite + Vitest config
  tsconfig.json
  src/
    main.tsx              # mount
    App.tsx               # page composition + load orchestration
    content.ts            # ALL copy & config (single source of truth)
    types.ts              # shared TS interfaces
    theme.css             # CSS variables: colors, fonts, foil gradient
    test/setup.ts         # vitest + testing-library setup
    components/
      Logo.tsx / Logo.css
      OrderButton.tsx / OrderButton.css
      Reveal.tsx
      Hero.tsx / Hero.css
      Menu.tsx / Menu.css
      Story.tsx / Story.css
      Delivery.tsx / Delivery.css
      Footer.tsx / Footer.css
    components/__tests__/*.test.tsx
```

---

### Task 1: Scaffold project + test tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/test/setup.ts`, `.gitignore`

- [ ] **Step 1: Scaffold Vite React-TS app into the existing folder**

Run from `C:\Users\Main PC\Documents\PBV`:
```bash
npm create vite@latest . -- --template react-ts
```
If prompted that the directory is not empty, choose **"Ignore files and continue"** (keeps `docs/` and `.git/`).

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install motion
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Create/replace `vite.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
```

- [ ] **Step 4: Create test setup `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// jsdom lacks matchMedia; default to "no reduced motion".
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// jsdom lacks IntersectionObserver (Motion whileInView needs it).
if (!window.IntersectionObserver) {
  // @ts-expect-error minimal stub
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  }
}
```

- [ ] **Step 5: Add the `test` script to `package.json`**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Verify the toolchain runs**

Run:
```bash
npm run test
```
Expected: Vitest runs and reports **"No test files found"** (exit 0) — toolchain is wired.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React-TS + Vitest tooling"
```

---

### Task 2: Shared types

**Files:**
- Create: `src/types.ts`
- Test: `src/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test**

`src/__tests__/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { SiteContent, MenuItem } from '../types'

describe('types', () => {
  it('a valid content object satisfies SiteContent', () => {
    const item: MenuItem = { name: 'X', description: 'Y', price: '$0' }
    const sample: SiteContent = {
      brandName: 'PBV',
      tagline: 't',
      uberEatsUrl: '#',
      story: { heading: 'h', body: 'b' },
      menu: [item],
      delivery: { area: 'a', hours: 'h' },
      socials: [{ label: 'IG', href: '#' }],
    }
    expect(sample.menu[0].name).toBe('X')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/types.test.ts`
Expected: FAIL — `Cannot find module '../types'`.

- [ ] **Step 3: Create `src/types.ts`**

```ts
export interface MenuItem {
  name: string
  description: string
  price: string
}

export interface SiteContent {
  brandName: string
  tagline: string
  /** Uber Eats store URL. Placeholder until the store is live. */
  uberEatsUrl: string
  story: { heading: string; body: string }
  menu: MenuItem[]
  delivery: { area: string; hours: string }
  socials: { label: string; href: string }[]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/__tests__/types.test.ts
git commit -m "feat: shared SiteContent types"
```

---

### Task 3: Content config (single source of truth)

**Files:**
- Create: `src/content.ts`
- Test: `src/__tests__/content.test.ts`

- [ ] **Step 1: Write the failing test**

`src/__tests__/content.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { content } from '../content'

describe('content', () => {
  it('exposes core brand fields', () => {
    expect(content.brandName).toBe('PBV')
    expect(content.delivery.area).toMatch(/Airport West/i)
    expect(content.delivery.hours).toMatch(/5.*9/)
  })
  it('has at least 3 menu items', () => {
    expect(content.menu.length).toBeGreaterThanOrEqual(3)
  })
  it('defines an Uber Eats url field', () => {
    expect(typeof content.uberEatsUrl).toBe('string')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/content.test.ts`
Expected: FAIL — `Cannot find module '../content'`.

- [ ] **Step 3: Create `src/content.ts`**

```ts
import type { SiteContent } from './types'

export const content: SiteContent = {
  brandName: 'PBV',
  tagline: 'Wild-yeast dough, 48 hours in the making.',
  // TODO: replace with the live Uber Eats store URL when available.
  uberEatsUrl: 'https://www.ubereats.com/',
  story: {
    heading: 'Slow dough. Real fire.',
    body:
      'Every base is a 48-hour wild-yeast sourdough — cold-fermented for a blistered, ' +
      'open crumb and a flavour you can only get from time. Made in small batches, ' +
      'finished hot, and sent straight to your door.',
  },
  // TODO: replace placeholder pizzas with the real menu.
  menu: [
    { name: 'Margherita', description: 'San Marzano, fior di latte, basil, EVOO', price: '$22' },
    { name: 'Nduja', description: 'Spicy nduja, fior di latte, hot honey, oregano', price: '$26' },
    { name: 'Funghi', description: 'Roast mushrooms, taleggio, thyme, garlic', price: '$25' },
    { name: 'Prosciutto', description: 'Prosciutto di Parma, rocket, parmigiano', price: '$27' },
  ],
  delivery: {
    area: 'Airport West & surrounding suburbs, Victoria',
    hours: '5–9pm, nightly',
  },
  // TODO: add real handles/links.
  socials: [
    { label: 'Instagram', href: '#' },
  ],
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/content.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/content.ts src/__tests__/content.test.ts
git commit -m "feat: site content config with real area/hours + placeholders"
```

---

### Task 4: Theme (CSS variables, fonts, foil gradient)

**Files:**
- Create: `src/theme.css`
- Modify: `index.html` (font preconnect + links), `src/main.tsx` (import theme)

> Pure styling — verified visually in Task 12, not unit-tested.

- [ ] **Step 1: Create `src/theme.css`**

```css
:root {
  --paper: #f6f5f1;
  --ink: #15140f;
  --ink-soft: #3c382f;
  --muted: #9b9485;
  --hairline: #e0ddd3;
  --gold: #b8923f;
  --gold-foil: linear-gradient(110deg,#fbe6a2 0%,#bf9b3e 38%,#fff2c4 52%,#c9a14a 66%,#a8842f 100%);

  --font-display: 'Libre Caslon Display', Georgia, serif;
  --font-italic: 'Fraunces', Georgia, serif;
  --font-ui: 'Archivo', system-ui, sans-serif;
  --font-mono: 'Space Mono', ui-monospace, monospace;

  --maxw: 1100px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
}

/* Foil text helper */
.foil {
  background: var(--gold-foil);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: foil-shine 5s linear infinite;
}
@keyframes foil-shine { to { background-position: 200% center; } }

.container { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }
.label {
  font-family: var(--font-ui);
  font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted);
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .foil { animation: none; }
}
```

- [ ] **Step 2: Add fonts to `index.html`**

In `index.html` `<head>`, add before `</head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Archivo:wght@400;500;600;800&family=Space+Mono&display=swap" rel="stylesheet" />
```
Also set `<title>PBV — Sourdough Pizza, Delivered</title>`.

- [ ] **Step 3: Import theme in `src/main.tsx`**

Replace the default CSS import line with:
```ts
import './theme.css'
```
Delete the generated `src/index.css` and `src/App.css` if present.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: theme tokens, fonts, foil gradient"
```

---

### Task 5: Logo component (animated foil monogram)

**Files:**
- Create: `src/components/Logo.tsx`, `src/components/Logo.css`
- Test: `src/components/__tests__/Logo.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/Logo.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from '../Logo'

describe('Logo', () => {
  it('renders the brand letters with a separating dot', () => {
    render(<Logo text="PBV" />)
    // Accessible name should read the brand, dot is decorative.
    expect(screen.getByRole('img', { name: /PBV/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/Logo.test.tsx`
Expected: FAIL — cannot find module `../Logo`.

- [ ] **Step 3: Implement `src/components/Logo.tsx`**

```tsx
import './Logo.css'

interface LogoProps {
  text: string
  /** When true, the gold foil covers the whole mark (use on dark/hero). */
  fullFoil?: boolean
}

export function Logo({ text, fullFoil = false }: LogoProps) {
  const letters = text.split('')
  return (
    <span className="logo" role="img" aria-label={text}>
      {letters.map((ch, i) => (
        <span key={i} className={fullFoil ? 'logo__ch foil' : 'logo__ch'}>
          {ch}
          {i < letters.length - 1 && (
            <span className="logo__dot foil" aria-hidden="true">·</span>
          )}
        </span>
      ))}
    </span>
  )
}
```

- [ ] **Step 4: Implement `src/components/Logo.css`**

```css
.logo {
  font-family: var(--font-display);
  letter-spacing: 0.18em;
  color: var(--ink);
  display: inline-flex;
  align-items: baseline;
  line-height: 1;
}
.logo__ch { position: relative; }
.logo__dot {
  margin: 0 0.18em;
  font-size: 0.7em;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/Logo.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Logo.tsx src/components/Logo.css src/components/__tests__/Logo.test.tsx
git commit -m "feat: foil monogram Logo component"
```

---

### Task 6: OrderButton (reusable Uber Eats CTA)

**Files:**
- Create: `src/components/OrderButton.tsx`, `src/components/OrderButton.css`
- Test: `src/components/__tests__/OrderButton.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/OrderButton.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderButton } from '../OrderButton'

describe('OrderButton', () => {
  it('links to the given Uber Eats url in a new tab', () => {
    render(<OrderButton href="https://ubereats.com/store/pbv" />)
    const link = screen.getByRole('link', { name: /order on uber eats/i })
    expect(link).toHaveAttribute('href', 'https://ubereats.com/store/pbv')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/OrderButton.test.tsx`
Expected: FAIL — cannot find module `../OrderButton`.

- [ ] **Step 3: Implement `src/components/OrderButton.tsx`**

```tsx
import './OrderButton.css'

interface OrderButtonProps {
  href: string
  variant?: 'solid' | 'ghost'
}

export function OrderButton({ href, variant = 'solid' }: OrderButtonProps) {
  return (
    <a
      className={`order-btn order-btn--${variant}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      Order on Uber Eats
      <span className="order-btn__arrow foil" aria-hidden="true">→</span>
    </a>
  )
}
```

- [ ] **Step 4: Implement `src/components/OrderButton.css`**

```css
.order-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  text-decoration: none;
  padding: 14px 24px;
  border-radius: 2px;
  transition: transform .15s ease, opacity .15s ease;
}
.order-btn--solid { background: var(--ink); color: var(--paper); }
.order-btn--ghost { background: transparent; color: var(--ink); border: 1px solid var(--ink); }
.order-btn:hover { transform: translateY(-2px); }
.order-btn__arrow { font-weight: 700; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/OrderButton.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/OrderButton.tsx src/components/OrderButton.css src/components/__tests__/OrderButton.test.tsx
git commit -m "feat: reusable Uber Eats OrderButton"
```

---

### Task 7: Reveal wrapper (scroll reveal, reduced-motion aware)

**Files:**
- Create: `src/components/Reveal.tsx`
- Test: `src/components/__tests__/Reveal.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/Reveal.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Reveal } from '../Reveal'

describe('Reveal', () => {
  it('renders its children', () => {
    render(<Reveal><p>hello crumb</p></Reveal>)
    expect(screen.getByText('hello crumb')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/Reveal.test.tsx`
Expected: FAIL — cannot find module `../Reveal`.

- [ ] **Step 3: Implement `src/components/Reveal.tsx`**

```tsx
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** Stagger offset in seconds. */
  delay?: number
}

export function Reveal({ children, delay = 0 }: RevealProps) {
  const reduce = useReducedMotion()
  if (reduce) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/Reveal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Reveal.tsx src/components/__tests__/Reveal.test.tsx
git commit -m "feat: reduced-motion-aware Reveal wrapper"
```

---

### Task 8: Hero section

**Files:**
- Create: `src/components/Hero.tsx`, `src/components/Hero.css`
- Test: `src/components/__tests__/Hero.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/Hero.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '../Hero'

describe('Hero', () => {
  it('shows the brand, tagline and an Uber Eats CTA', () => {
    render(<Hero brandName="PBV" tagline="Slow dough." uberEatsUrl="#x" />)
    expect(screen.getByRole('img', { name: /PBV/i })).toBeInTheDocument()
    expect(screen.getByText('Slow dough.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /order on uber eats/i })).toHaveAttribute('href', '#x')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/Hero.test.tsx`
Expected: FAIL — cannot find module `../Hero`.

- [ ] **Step 3: Implement `src/components/Hero.tsx`**

```tsx
import { motion, useReducedMotion } from 'motion/react'
import { Logo } from './Logo'
import { OrderButton } from './OrderButton'
import './Hero.css'

interface HeroProps {
  brandName: string
  tagline: string
  uberEatsUrl: string
}

export function Hero({ brandName, tagline, uberEatsUrl }: HeroProps) {
  const reduce = useReducedMotion()
  const step = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 * i },
        }

  return (
    <header className="hero">
      <div className="hero__grain" aria-hidden="true" />
      <div className="container hero__inner">
        <div className="label hero__eyebrow">Sourdough Pizza · Delivered</div>
        <motion.div className="hero__logo" {...step(1)}>
          <Logo text={brandName} />
        </motion.div>
        <motion.p className="hero__tagline" {...step(2)}>{tagline}</motion.p>
        <motion.div className="hero__line" {...step(3)} aria-hidden="true" />
        <motion.div {...step(4)}>
          <OrderButton href={uberEatsUrl} />
        </motion.div>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: Implement `src/components/Hero.css`**

```css
.hero {
  position: relative;
  min-height: 100svh;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.hero__grain {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}
.hero__inner { position: relative; }
.hero__eyebrow { margin-bottom: 28px; }
.hero__logo .logo { font-size: clamp(56px, 12vw, 132px); }
.hero__tagline {
  font-family: var(--font-italic);
  font-style: italic;
  font-size: clamp(18px, 2.4vw, 26px);
  color: var(--ink-soft);
  margin: 18px 0 0;
  max-width: 22ch;
}
.hero__line { width: 56px; height: 2px; background: var(--gold-foil); margin: 28px 0; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/Hero.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Hero.tsx src/components/Hero.css src/components/__tests__/Hero.test.tsx
git commit -m "feat: animated Hero with Uber Eats CTA"
```

---

### Task 9: Menu section

**Files:**
- Create: `src/components/Menu.tsx`, `src/components/Menu.css`
- Test: `src/components/__tests__/Menu.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/Menu.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Menu } from '../Menu'
import type { MenuItem } from '../../types'

const items: MenuItem[] = [
  { name: 'Margherita', description: 'classic', price: '$22' },
  { name: 'Nduja', description: 'spicy', price: '$26' },
]

describe('Menu', () => {
  it('renders every menu item with its price', () => {
    render(<Menu items={items} />)
    expect(screen.getByText('Margherita')).toBeInTheDocument()
    expect(screen.getByText('Nduja')).toBeInTheDocument()
    expect(screen.getByText('$26')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/Menu.test.tsx`
Expected: FAIL — cannot find module `../Menu`.

- [ ] **Step 3: Implement `src/components/Menu.tsx`**

```tsx
import { Reveal } from './Reveal'
import type { MenuItem } from '../types'
import './Menu.css'

interface MenuProps {
  items: MenuItem[]
}

export function Menu({ items }: MenuProps) {
  return (
    <section className="menu" id="menu">
      <div className="container">
        <div className="label">The Menu</div>
        <ul className="menu__list">
          {items.map((item, i) => (
            <li className="menu__row" key={item.name}>
              <Reveal delay={i * 0.06}>
                <div className="menu__row-inner">
                  <h3 className="menu__name">{item.name}</h3>
                  <p className="menu__desc">{item.description}</p>
                  <span className="menu__price">{item.price}</span>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implement `src/components/Menu.css`**

```css
.menu { padding: clamp(72px, 12vh, 140px) 0; }
.menu .label { margin-bottom: 32px; }
.menu__list { list-style: none; margin: 0; padding: 0; }
.menu__row { border-top: 1px solid var(--hairline); }
.menu__row:last-child { border-bottom: 1px solid var(--hairline); }
.menu__row-inner {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas: 'name price' 'desc price';
  gap: 2px 24px;
  align-items: baseline;
  padding: 24px 0;
}
.menu__name { grid-area: name; font-family: var(--font-display); font-size: clamp(24px, 3.4vw, 38px); margin: 0; }
.menu__desc { grid-area: desc; font-family: var(--font-italic); font-style: italic; color: var(--ink-soft); margin: 0; }
.menu__price { grid-area: price; font-family: var(--font-mono); font-size: 16px; color: var(--gold); }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/Menu.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Menu.tsx src/components/Menu.css src/components/__tests__/Menu.test.tsx
git commit -m "feat: editorial Menu section"
```

---

### Task 10: Story section

**Files:**
- Create: `src/components/Story.tsx`, `src/components/Story.css`
- Test: `src/components/__tests__/Story.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/Story.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Story } from '../Story'

describe('Story', () => {
  it('renders heading and body', () => {
    render(<Story heading="Slow dough." body="48 hours." />)
    expect(screen.getByRole('heading', { name: 'Slow dough.' })).toBeInTheDocument()
    expect(screen.getByText('48 hours.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/Story.test.tsx`
Expected: FAIL — cannot find module `../Story`.

- [ ] **Step 3: Implement `src/components/Story.tsx`**

```tsx
import { Reveal } from './Reveal'
import './Story.css'

interface StoryProps {
  heading: string
  body: string
}

export function Story({ heading, body }: StoryProps) {
  return (
    <section className="story" id="story">
      <div className="container story__inner">
        <Reveal>
          <h2 className="story__heading">{heading}</h2>
          <p className="story__body">{body}</p>
        </Reveal>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implement `src/components/Story.css`**

```css
.story { padding: clamp(72px, 14vh, 160px) 0; background: var(--ink); color: var(--paper); }
.story__inner { max-width: 760px; }
.story__heading { font-family: var(--font-display); font-size: clamp(32px, 5vw, 60px); margin: 0 0 24px; }
.story__body { font-family: var(--font-italic); font-style: italic; font-size: clamp(18px, 2.2vw, 24px); line-height: 1.6; color: #d8d3c8; margin: 0; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/Story.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Story.tsx src/components/Story.css src/components/__tests__/Story.test.tsx
git commit -m "feat: Story section"
```

---

### Task 11: Delivery section

**Files:**
- Create: `src/components/Delivery.tsx`, `src/components/Delivery.css`
- Test: `src/components/__tests__/Delivery.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/Delivery.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Delivery } from '../Delivery'

describe('Delivery', () => {
  it('renders area and hours', () => {
    render(<Delivery area="Airport West & surrounds" hours="5–9pm, nightly" />)
    expect(screen.getByText(/Airport West & surrounds/)).toBeInTheDocument()
    expect(screen.getByText(/5–9pm, nightly/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/Delivery.test.tsx`
Expected: FAIL — cannot find module `../Delivery`.

- [ ] **Step 3: Implement `src/components/Delivery.tsx`**

```tsx
import { Reveal } from './Reveal'
import './Delivery.css'

interface DeliveryProps {
  area: string
  hours: string
}

export function Delivery({ area, hours }: DeliveryProps) {
  return (
    <section className="delivery" id="delivery">
      <div className="container delivery__grid">
        <Reveal>
          <div className="delivery__col">
            <div className="label">Where</div>
            <p className="delivery__value">{area}</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="delivery__col">
            <div className="label">When</div>
            <p className="delivery__value">{hours}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Implement `src/components/Delivery.css`**

```css
.delivery { padding: clamp(72px, 12vh, 140px) 0; }
.delivery__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
@media (max-width: 640px) { .delivery__grid { grid-template-columns: 1fr; } }
.delivery__col .label { margin-bottom: 12px; }
.delivery__value { font-family: var(--font-display); font-size: clamp(22px, 3vw, 34px); margin: 0; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/Delivery.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Delivery.tsx src/components/Delivery.css src/components/__tests__/Delivery.test.tsx
git commit -m "feat: Delivery area + hours section"
```

---

### Task 12: Footer

**Files:**
- Create: `src/components/Footer.tsx`, `src/components/Footer.css`
- Test: `src/components/__tests__/Footer.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/Footer.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from '../Footer'

describe('Footer', () => {
  it('repeats the Uber Eats CTA and lists socials', () => {
    render(
      <Footer
        brandName="PBV"
        uberEatsUrl="#order"
        socials={[{ label: 'Instagram', href: '#ig' }]}
      />
    )
    expect(screen.getByRole('link', { name: /order on uber eats/i })).toHaveAttribute('href', '#order')
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', '#ig')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/Footer.test.tsx`
Expected: FAIL — cannot find module `../Footer`.

- [ ] **Step 3: Implement `src/components/Footer.tsx`**

```tsx
import { Logo } from './Logo'
import { OrderButton } from './OrderButton'
import './Footer.css'

interface FooterProps {
  brandName: string
  uberEatsUrl: string
  socials: { label: string; href: string }[]
}

export function Footer({ brandName, uberEatsUrl, socials }: FooterProps) {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__cta">
          <h2 className="footer__heading">Hungry yet?</h2>
          <OrderButton href={uberEatsUrl} />
        </div>
        <div className="footer__meta">
          <Logo text={brandName} />
          <nav className="footer__socials">
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            ))}
          </nav>
          <p className="footer__fine">© {new Date().getFullYear()} {brandName}. Delivered only.</p>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 4: Implement `src/components/Footer.css`**

```css
.footer { padding: clamp(72px, 14vh, 160px) 0 48px; border-top: 1px solid var(--hairline); }
.footer__cta { text-align: center; margin-bottom: 64px; }
.footer__heading { font-family: var(--font-display); font-size: clamp(36px, 6vw, 72px); margin: 0 0 28px; }
.footer__meta { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.footer__meta .logo { font-size: 28px; }
.footer__socials { display: flex; gap: 20px; }
.footer__socials a { font-family: var(--font-ui); font-size: 13px; letter-spacing: 1px; color: var(--ink); text-decoration: none; }
.footer__socials a:hover { color: var(--gold); }
.footer__fine { font-family: var(--font-mono); font-size: 11px; color: var(--muted); margin: 0; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/Footer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Footer.tsx src/components/Footer.css src/components/__tests__/Footer.test.tsx
git commit -m "feat: Footer with repeat CTA + socials"
```

---

### Task 13: App composition + final verification

**Files:**
- Modify: `src/App.tsx`
- Test: `src/__tests__/App.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/__tests__/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('App', () => {
  it('renders all key sections from content', () => {
    render(<App />)
    expect(screen.getByRole('img', { name: /PBV/i })).toBeInTheDocument() // Hero logo
    expect(screen.getByText('Margherita')).toBeInTheDocument()             // Menu
    expect(screen.getByText(/Airport West/)).toBeInTheDocument()           // Delivery
    expect(screen.getAllByRole('link', { name: /order on uber eats/i }).length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/App.test.tsx`
Expected: FAIL — App still renders the Vite default template.

- [ ] **Step 3: Replace `src/App.tsx`**

```tsx
import { content } from './content'
import { Hero } from './components/Hero'
import { Menu } from './components/Menu'
import { Story } from './components/Story'
import { Delivery } from './components/Delivery'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <>
      <Hero
        brandName={content.brandName}
        tagline={content.tagline}
        uberEatsUrl={content.uberEatsUrl}
      />
      <Menu items={content.menu} />
      <Story heading={content.story.heading} body={content.story.body} />
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

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: ALL tests pass.

- [ ] **Step 5: Build to confirm production compiles**

Run: `npm run build`
Expected: Vite build succeeds with no TypeScript errors.

- [ ] **Step 6: Visual verification (preview tools)**

Start the dev server (`npm run dev`) and verify in the browser preview:
1. Hero load animation plays (logo → tagline → line → CTA), foil shimmer on the dot/arrow.
2. Scroll reveals fire once per section.
3. Menu rows, Story (dark), Delivery (Airport West / 5–9pm), Footer CTA all present.
4. Resize to mobile width — layout holds, Delivery stacks to one column.
5. Toggle `prefers-reduced-motion` (emulate) — animations are instant, no movement.
Fix any issues in the relevant component, re-run `npm run test`, then continue.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: compose PBV landing page + final verification"
```

---

## Self-Review

**Spec coverage:**
- Brand/aesthetic (Editorial × foil-gold, Caslon, fonts) → Task 4 (theme) + Task 5 (Logo). ✓
- Hero + Uber Eats CTA → Task 8. ✓
- Menu showcase → Task 9. ✓
- Brand story → Task 10. ✓
- Delivery + hours (Airport West, 5–9pm) → Task 11 + Task 3 content. ✓
- Footer repeat CTA + socials → Task 12. ✓
- All copy in single `content.ts` → Task 3. ✓
- Swappable logo (isolated) → Task 5 (`Logo` takes `text` prop). ✓
- One load sequence + restrained reveals → Task 8 (Hero) + Task 7 (Reveal). ✓
- `prefers-reduced-motion` → Task 4 (CSS) + Task 7 (Reveal) + Task 8 (Hero). ✓
- React+Vite+Motion, static build → Task 1 + Task 13 build step. ✓
- Responsive / mobile-first → CSS clamp/grid throughout + Task 13 verification. ✓

**Placeholder scan:** Uber Eats URL, menu, and socials are intentional content placeholders marked `// TODO` in `content.ts` (spec §9 open items), not plan placeholders. No "TBD"/"implement later" steps. ✓

**Type consistency:** `SiteContent`/`MenuItem` defined in Task 2 and consumed identically in Tasks 3, 9, 13. Component prop names (`text`, `href`, `items`, `area`, `hours`, `brandName`, `uberEatsUrl`, `socials`) match across definitions and call sites. `Logo` uses `text`; `OrderButton` uses `href`. ✓

No gaps found.
