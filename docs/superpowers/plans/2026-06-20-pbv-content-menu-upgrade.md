# PBV Slice 1 — Backhaus Story + Richer Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Backhaus heritage story and an image-driven menu card grid (Option B) to the static PBV site, locking the content data model for Slice 2.

**Architecture:** Still a static React + Vite + TS site with all copy in `src/content.ts`. Extend the `MenuItem` and `story` shapes, add `MenuCard` + `ImagePlaceholder` components, refactor `Menu` into a responsive card grid, and redesign `Story` as the Backhaus heritage section. Reuse the existing `Reveal` and theme tokens.

**Tech Stack:** React 18, Vite, TypeScript, Motion, Vitest, @testing-library/react.

**Project root:** `C:\Users\Main PC\Documents\PBV` (branch `build/landing-page`). Git Bash on Windows. Single-file test run: `npx vitest run <path>`; full suite: `npm run test`.

---

## File Structure

```
src/
  types.ts                         # MODIFY: MenuItem (+tagline,+image?), add BrandStory, story: BrandStory
  content.ts                       # MODIFY: menu taglines + extended copy; story -> BrandStory
  App.tsx                          # MODIFY: <Story story={content.story} />
  __tests__/types.test.ts          # MODIFY: sample uses BrandStory
  __tests__/content.test.ts        # MODIFY: assert new fields
  components/
    ImagePlaceholder.tsx / .css    # CREATE: on-brand fallback when image absent
    MenuCard.tsx / .css            # CREATE: one pizza card (image-or-placeholder + text)
    Menu.tsx / Menu.css            # MODIFY: render MenuCard grid
    Story.tsx / Story.css          # MODIFY: Backhaus heritage layout
    __tests__/ImagePlaceholder.test.tsx  # CREATE
    __tests__/MenuCard.test.tsx          # CREATE
    __tests__/Menu.test.tsx              # MODIFY
    __tests__/Story.test.tsx             # MODIFY
```

**Task order rationale:** Task 1 (ImagePlaceholder) is fully independent. Task 2 changes the data model and its direct consumers (`Story`, `App`, content/types tests) in one coherent commit so the build never goes red — note the old `Menu` keeps compiling because `description`/`name`/`price` still exist. Task 3 adds `MenuCard`. Task 4 swaps `Menu` to the grid. Task 5 verifies.

---

### Task 1: ImagePlaceholder component

**Files:**
- Create: `src/components/ImagePlaceholder.tsx`, `src/components/ImagePlaceholder.css`
- Test: `src/components/__tests__/ImagePlaceholder.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/ImagePlaceholder.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ImagePlaceholder } from '../ImagePlaceholder'

describe('ImagePlaceholder', () => {
  it('exposes an accessible label and renders no <img>', () => {
    const { container } = render(<ImagePlaceholder label="Margherita" />)
    expect(screen.getByRole('img', { name: /Margherita/i })).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/ImagePlaceholder.test.tsx`
Expected: FAIL — cannot find module `../ImagePlaceholder`.

- [ ] **Step 3: Implement `src/components/ImagePlaceholder.tsx`**

```tsx
import './ImagePlaceholder.css'

interface ImagePlaceholderProps {
  label?: string
}

export function ImagePlaceholder({ label }: ImagePlaceholderProps) {
  return (
    <div
      className="img-ph"
      role="img"
      aria-label={label ? `${label} — photo coming soon` : 'Photo coming soon'}
    >
      <span className="img-ph__mark foil" aria-hidden="true">PBV</span>
      <span className="img-ph__note" aria-hidden="true">photo coming soon</span>
    </div>
  )
}
```

- [ ] **Step 4: Implement `src/components/ImagePlaceholder.css`**

```css
.img-ph {
  width: 100%;
  height: 100%;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--paper);
  border: 1px solid var(--hairline);
  position: relative;
}
.img-ph::after {
  content: '';
  position: absolute;
  left: 16px; right: 16px; top: 16px; bottom: 16px;
  border: 1px solid transparent;
  border-image: var(--gold-foil) 1;
  opacity: 0.55;
  pointer-events: none;
}
.img-ph__mark {
  font-family: var(--font-display);
  font-size: 28px;
  letter-spacing: 4px;
}
.img-ph__note {
  font-family: var(--font-ui);
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/ImagePlaceholder.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ImagePlaceholder.tsx src/components/ImagePlaceholder.css src/components/__tests__/ImagePlaceholder.test.tsx
git commit -m "feat: on-brand ImagePlaceholder for missing menu photos"
```

---

### Task 2: Data model + content + Story redesign (coordinated)

**Files:**
- Modify: `src/types.ts`, `src/content.ts`, `src/components/Story.tsx`, `src/components/Story.css`, `src/App.tsx`, `src/__tests__/types.test.ts`, `src/__tests__/content.test.ts`, `src/components/__tests__/Story.test.tsx`

- [ ] **Step 1: Update the failing tests first**

Replace `src/__tests__/content.test.ts` with:
```ts
import { describe, it, expect } from 'vitest'
import { content } from '../content'

describe('content', () => {
  it('exposes core brand fields', () => {
    expect(content.brandName).toBe('PBV')
    expect(content.delivery.area).toMatch(/Airport West/i)
    expect(content.delivery.hours).toMatch(/5.*9/)
  })
  it('has at least 3 menu items, each with a tagline and extended description', () => {
    expect(content.menu.length).toBeGreaterThanOrEqual(3)
    for (const item of content.menu) {
      expect(item.tagline.length).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(20)
    }
  })
  it('tells the Backhaus heritage story', () => {
    expect(content.story.heading.length).toBeGreaterThan(0)
    expect(content.story.paragraphs.length).toBeGreaterThanOrEqual(1)
    expect(content.story.paragraphs.join(' ')).toMatch(/Backhaus/)
    expect(content.story.pullquote.length).toBeGreaterThan(0)
  })
  it('defines an Uber Eats url field', () => {
    expect(typeof content.uberEatsUrl).toBe('string')
  })
})
```

Replace `src/__tests__/types.test.ts` with:
```ts
import { describe, it, expect } from 'vitest'
import type { SiteContent, MenuItem, BrandStory } from '../types'

describe('types', () => {
  it('a valid content object satisfies SiteContent', () => {
    const item: MenuItem = { name: 'X', tagline: 'hook', description: 'Y', price: '$0' }
    const story: BrandStory = {
      eyebrow: 'Our story',
      heading: 'h',
      paragraphs: ['p1'],
      pullquote: 'q',
      established: 'est',
    }
    const sample: SiteContent = {
      brandName: 'PBV',
      tagline: 't',
      uberEatsUrl: '#',
      story,
      menu: [item],
      delivery: { area: 'a', hours: 'h' },
      socials: [{ label: 'IG', href: '#' }],
    }
    expect(sample.menu[0].name).toBe('X')
    expect(sample.story.paragraphs).toHaveLength(1)
  })
})
```

Replace `src/components/__tests__/Story.test.tsx` with:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Story } from '../Story'
import type { BrandStory } from '../../types'

const story: BrandStory = {
  eyebrow: 'Our story',
  heading: 'From the Backhaus bench',
  paragraphs: ['First paragraph about Backhaus sourdough.', 'Second paragraph.'],
  pullquote: 'Same sourdough, now with fire.',
  established: 'Backhaus — est. 2019',
}

describe('Story', () => {
  it('renders heading, each paragraph and the pull-quote', () => {
    render(<Story story={story} />)
    expect(screen.getByRole('heading', { name: 'From the Backhaus bench' })).toBeInTheDocument()
    expect(screen.getByText('First paragraph about Backhaus sourdough.')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
    expect(screen.getByText('Same sourdough, now with fire.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/types.test.ts src/__tests__/content.test.ts src/components/__tests__/Story.test.tsx`
Expected: FAIL (type errors / missing `BrandStory`, `tagline`, `story` prop).

- [ ] **Step 3: Update `src/types.ts`**

Replace the whole file with:
```ts
export interface MenuItem {
  name: string
  /** Short one-line hook, e.g. "a slow, spreading heat". */
  tagline: string
  /** Extended, appetite-driving description. */
  description: string
  price: string
  /** Optional image URL/path. When absent, an on-brand placeholder renders. */
  image?: string
}

export interface SocialLink {
  label: string
  href: string
}

export interface BrandStory {
  eyebrow: string
  heading: string
  paragraphs: string[]
  pullquote: string
  /** Editable placeholder line, e.g. "Backhaus — est. [YEAR], [SUBURB]". */
  established: string
}

export interface SiteContent {
  brandName: string
  tagline: string
  /** Uber Eats store URL. Placeholder until the store is live. */
  uberEatsUrl: string
  story: BrandStory
  menu: MenuItem[]
  delivery: { area: string; hours: string }
  socials: SocialLink[]
}
```

- [ ] **Step 4: Update `src/content.ts`**

Replace the `menu` and `story` fields (keep `brandName`, `tagline`, `uberEatsUrl`, `delivery`, `socials` as they are). The full file becomes:
```ts
import type { SiteContent } from './types'

export const content: SiteContent = {
  brandName: 'PBV',
  tagline: 'Wild-yeast dough, 48 hours in the making.',
  // TODO: replace with the live Uber Eats store URL when available.
  uberEatsUrl: 'https://www.ubereats.com/',
  story: {
    eyebrow: 'Our story',
    heading: 'From the Backhaus bench',
    paragraphs: [
      'PBV comes from the people behind Backhaus — the bakery that spent years perfecting a wild-yeast sourdough. The same starter, the same patience, the same hands.',
      'We took that loaf and built a pizza around it: a 48-hour cold-fermented base, blistered in a screaming-hot oven and sent straight to your door. The bakery that perfected the bread now fires the pizza.',
    ],
    pullquote: 'Same sourdough. Same hands. Now with fire.',
    // TODO: confirm the real founding year and suburb.
    established: 'Backhaus — est. [YEAR], [SUBURB]',
  },
  // TODO: replace placeholder pizzas + copy with the real menu; add `image` paths when photos exist.
  menu: [
    {
      name: 'Margherita',
      tagline: 'the original, done properly',
      description:
        'San Marzano tomatoes, fior di latte, fresh basil and a thread of extra-virgin olive oil over our 48-hour Backhaus sourdough base. Simple, blistered, honest.',
      price: '$22',
    },
    {
      name: 'Nduja',
      tagline: 'a slow, spreading heat',
      description:
        'Spicy Calabrian nduja, fior di latte, a drizzle of hot honey and a scatter of oregano — sweet, fiery and balanced in every bite.',
      price: '$26',
    },
    {
      name: 'Funghi',
      tagline: 'deep, earthy, autumnal',
      description:
        'Roasted field mushrooms, melted taleggio, fresh thyme and roast garlic over a white base. Rich and savoury, no tomato in sight.',
      price: '$25',
    },
    {
      name: 'Prosciutto',
      tagline: 'salt, snap and green',
      description:
        'Prosciutto di Parma laid over the hot crust with wild rocket and shavings of parmigiano. Cured, peppery and fresh.',
      price: '$27',
    },
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

- [ ] **Step 5: Update `src/components/Story.tsx`**

Replace the whole file with:
```tsx
import { Reveal } from './Reveal'
import type { BrandStory } from '../types'
import './Story.css'

interface StoryProps {
  story: BrandStory
}

export function Story({ story }: StoryProps) {
  return (
    <section className="story" id="story">
      <div className="container story__inner">
        <Reveal>
          <div className="label story__eyebrow">{story.eyebrow}</div>
          <h2 className="story__heading">{story.heading}</h2>
          {story.paragraphs.map((p, i) => (
            <p className="story__body" key={i}>{p}</p>
          ))}
          <blockquote className="story__quote">{story.pullquote}</blockquote>
          <p className="story__established">{story.established}</p>
        </Reveal>
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Update `src/components/Story.css`**

Replace the whole file with:
```css
.story { padding: clamp(72px, 14vh, 160px) 0; background: var(--ink); color: var(--paper); }
.story__inner { max-width: 760px; }
.story__eyebrow { color: var(--gold); margin-bottom: 18px; }
.story__heading { font-family: var(--font-display); font-size: clamp(32px, 5vw, 60px); margin: 0 0 24px; }
.story__body { font-size: clamp(16px, 2vw, 19px); line-height: 1.7; color: #d8d3c8; margin: 0 0 18px; }
.story__quote {
  font-family: var(--font-italic);
  font-style: italic;
  font-size: clamp(22px, 3vw, 32px);
  line-height: 1.4;
  color: var(--paper);
  margin: 32px 0;
  padding-left: 22px;
  border-left: 2px solid transparent;
  border-image: var(--gold-foil) 1;
}
.story__established {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--muted);
  margin: 0;
}
```

- [ ] **Step 7: Update `src/App.tsx`**

Change the `<Story .../>` line. Replace:
```tsx
      <Story heading={content.story.heading} body={content.story.body} />
```
with:
```tsx
      <Story story={content.story} />
```

- [ ] **Step 8: Run tests + build to verify green**

Run: `npm run test`
Expected: ALL pass (types, content, Story updated; Menu/App still pass).
Run: `npm run build`
Expected: clean build, no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add src/types.ts src/content.ts src/components/Story.tsx src/components/Story.css src/App.tsx src/__tests__/types.test.ts src/__tests__/content.test.ts src/components/__tests__/Story.test.tsx
git commit -m "feat: Backhaus heritage story + extended menu content model"
```

---

### Task 3: MenuCard component

**Files:**
- Create: `src/components/MenuCard.tsx`, `src/components/MenuCard.css`
- Test: `src/components/__tests__/MenuCard.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/MenuCard.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MenuCard } from '../MenuCard'
import type { MenuItem } from '../../types'

const base: MenuItem = {
  name: 'Margherita',
  tagline: 'the original',
  description: 'San Marzano, fior di latte and basil on sourdough.',
  price: '$22',
}

describe('MenuCard', () => {
  it('with an image, renders an <img> with alt set to the name plus tagline/price/description', () => {
    render(<MenuCard item={{ ...base, image: '/pizza.jpg' }} />)
    const img = screen.getByRole('img', { name: 'Margherita' })
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src', '/pizza.jpg')
    expect(screen.getByText('the original')).toBeInTheDocument()
    expect(screen.getByText('$22')).toBeInTheDocument()
    expect(screen.getByText('San Marzano, fior di latte and basil on sourdough.')).toBeInTheDocument()
  })

  it('without an image, renders the placeholder and no <img>', () => {
    const { container } = render(<MenuCard item={base} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('img', { name: /Margherita/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Margherita' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/MenuCard.test.tsx`
Expected: FAIL — cannot find module `../MenuCard`.

- [ ] **Step 3: Implement `src/components/MenuCard.tsx`**

```tsx
import { ImagePlaceholder } from './ImagePlaceholder'
import type { MenuItem } from '../types'
import './MenuCard.css'

interface MenuCardProps {
  item: MenuItem
}

export function MenuCard({ item }: MenuCardProps) {
  return (
    <article className="menu-card">
      <div className="menu-card__media">
        {item.image ? (
          <img className="menu-card__img" src={item.image} alt={item.name} loading="lazy" />
        ) : (
          <ImagePlaceholder label={item.name} />
        )}
      </div>
      <div className="menu-card__body">
        <div className="menu-card__head">
          <h3 className="menu-card__name">{item.name}</h3>
          <span className="menu-card__price">{item.price}</span>
        </div>
        <p className="menu-card__tagline">{item.tagline}</p>
        <p className="menu-card__desc">{item.description}</p>
      </div>
    </article>
  )
}
```

- [ ] **Step 4: Implement `src/components/MenuCard.css`**

```css
.menu-card {
  display: flex;
  flex-direction: column;
  background: var(--paper);
  border: 1px solid var(--hairline);
  overflow: hidden;
}
.menu-card__media {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--paper);
}
.menu-card__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.menu-card__body { padding: 18px 20px 22px; }
.menu-card__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}
.menu-card__name { font-family: var(--font-display); font-size: clamp(20px, 2.4vw, 26px); margin: 0; }
.menu-card__price { font-family: var(--font-mono); font-size: 15px; color: var(--gold); white-space: nowrap; }
.menu-card__tagline {
  font-family: var(--font-italic);
  font-style: italic;
  color: var(--ink-soft);
  margin: 4px 0 10px;
  font-size: 15px;
}
.menu-card__desc { color: var(--ink-soft); font-size: 14px; line-height: 1.6; margin: 0; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/MenuCard.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/MenuCard.tsx src/components/MenuCard.css src/components/__tests__/MenuCard.test.tsx
git commit -m "feat: MenuCard with image-or-placeholder, tagline + extended copy"
```

---

### Task 4: Menu refactor to card grid

**Files:**
- Modify: `src/components/Menu.tsx`, `src/components/Menu.css`, `src/components/__tests__/Menu.test.tsx`

- [ ] **Step 1: Update the failing test**

Replace `src/components/__tests__/Menu.test.tsx` with:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Menu } from '../Menu'
import type { MenuItem } from '../../types'

const items: MenuItem[] = [
  { name: 'Margherita', tagline: 'the original', description: 'San Marzano, fior di latte, basil.', price: '$22' },
  { name: 'Nduja', tagline: 'spicy', description: 'Calabrian nduja and hot honey.', price: '$26' },
]

describe('Menu', () => {
  it('renders every menu item as a card with its name and price', () => {
    render(<Menu items={items} />)
    expect(screen.getByRole('heading', { name: 'Margherita' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nduja' })).toBeInTheDocument()
    expect(screen.getByText('$26')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/Menu.test.tsx`
Expected: FAIL — current `Menu` renders `menu__name` as `<h3>` text but the new assertions about both headings + the card structure may still pass partially; if it passes, continue (the refactor is still required for the grid layout). If it fails on `getByRole('heading', { name: 'Nduja' })`, that confirms the refactor is needed.

- [ ] **Step 3: Replace `src/components/Menu.tsx`**

```tsx
import { Reveal } from './Reveal'
import { MenuCard } from './MenuCard'
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
        <div className="menu__grid">
          {items.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.06}>
              <MenuCard item={item} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Replace `src/components/Menu.css`**

```css
.menu { padding: clamp(72px, 12vh, 140px) 0; }
.menu .label { margin-bottom: 32px; }
.menu__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 28px;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/Menu.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Menu.tsx src/components/Menu.css src/components/__tests__/Menu.test.tsx
git commit -m "feat: Menu as responsive MenuCard grid (Option B)"
```

---

### Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: ALL tests pass (ImagePlaceholder, MenuCard, Menu, Story, content, types, App, plus the existing Hero/OrderButton/Logo/Reveal/Footer/Delivery).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Visual check (dev server)**

The dev server may still be running on http://localhost:5173 (if not, `npm run dev`). Confirm in the browser:
1. Menu is a responsive card grid; each card shows a placeholder panel (off-white, foil hairline, "PBV / photo coming soon"), name, italic tagline, gold price, extended description.
2. Cards reflow to one column on mobile width.
3. Story section reads as the Backhaus heritage with eyebrow, heading, paragraphs, a foil-accented pull-quote, and the established line.
Fix issues in the relevant component, re-run `npm run test`, then continue.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: Slice 1 visual polish"
```
(Skip if nothing changed.)

---

## Self-Review

**Spec coverage:**
- Extended `MenuItem` (tagline + optional image; description = extended) → Task 2 (types) + Task 2 (content). ✓
- `BrandStory` shape → Task 2 (types/content). ✓
- `ImagePlaceholder` (no external assets, fallback) → Task 1. ✓
- `MenuCard` (image-or-placeholder, name, tagline, price, description) → Task 3. ✓
- `Menu` card grid (Option B, responsive, Reveal stagger) → Task 4. ✓
- `Story` Backhaus heritage (eyebrow, heading, paragraphs, pull-quote, established) → Task 2. ✓
- Tests for new shapes + components; App.test unchanged still holds → Tasks 2–4 + Task 5. ✓
- Reduced-motion via existing `Reveal`; `loading="lazy"` + alt=name on images → Task 3. ✓
- All copy editable in `content.ts`; Backhaus specifics as marked placeholders → Task 2. ✓

**Placeholder scan:** `[YEAR]`/`[SUBURB]` and Uber Eats URL are intentional content placeholders (spec §3, marked `// TODO`), not plan placeholders. Every code step shows complete code. No "TBD"/"implement later" steps. ✓

**Type consistency:** `MenuItem` (name, tagline, description, price, image?) and `BrandStory` (eyebrow, heading, paragraphs, pullquote, established) are defined in Task 2 and used identically in Tasks 3–4 and the content file. `Story` takes `story: BrandStory`; `MenuCard` takes `item: MenuItem`; `Menu` takes `items: MenuItem[]`; `ImagePlaceholder` takes `label?`. App passes `story={content.story}`. All consistent. ✓

No gaps found.
