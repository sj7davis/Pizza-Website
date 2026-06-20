# PBV — Slice 1: Backhaus Story + Richer Menu (Design Spec)

**Date:** 2026-06-20
**Status:** Approved (design), pending implementation plan
**Branch:** `build/landing-page` (folds into pre-launch PR #1)
**Depends on:** the existing static site (Hero/Menu/Story/Delivery/Footer, content in `src/content.ts`)

## 1. Purpose

Two content upgrades to the static PBV landing page, with **no backend** (that's Slice 2):

1. A **Backhaus heritage story** — PBV's owners are the owners of Backhaus Bakery; Backhaus is the
   source of the sourdough and the inspiration for the pizza business. Tell that real origin story.
2. A **richer menu** — each pizza gains a photo, a short tagline, and an extended description,
   presented as an editorial **card grid** (Option B).

This slice also **locks the content data model** (the exact fields) so Slice 2's database mirrors it
with no rework.

## 2. Scope

In scope:
- Extend `MenuItem` and `story` shapes in `src/types.ts` + `src/content.ts`.
- New `MenuCard` and `ImagePlaceholder` components; `Menu` renders the card grid.
- Redesigned `Story` section (Backhaus heritage: eyebrow, heading, paragraphs, pull-quote,
  established line).
- Updated/added unit tests for the new shapes and components.

Out of scope (YAGNI / later slices):
- Any backend, database, admin console, or image upload (Slice 2).
- Real photography (placeholders only; `image` is optional and swappable).
- Lightbox/zoom, filtering, dietary tags.

## 3. Content Model (single source of truth: `src/types.ts` + `src/content.ts`)

```ts
export interface MenuItem {
  name: string
  /** Short one-line hook, e.g. "a slow, spreading heat". */
  tagline: string
  /** Extended description (the longer, appetite-driving copy). */
  description: string
  price: string
  /** Optional image URL/path. When absent, an on-brand placeholder renders. */
  image?: string
}

export interface BrandStory {
  eyebrow: string          // e.g. "Our story"
  heading: string          // e.g. "From the Backhaus bench"
  paragraphs: string[]     // 2–3 paragraphs naming Backhaus heritage
  pullquote: string        // a single emphasised line
  established: string      // editable placeholder, e.g. "Backhaus — est. [YEAR], [SUBURB]"
}
```

`SiteContent.story` changes from `{ heading; body }` to `BrandStory`. `SiteContent.menu` items use the
extended `MenuItem`. All copy stays editable in `content.ts`; Backhaus specifics (year, suburb) are
clearly-marked placeholders.

**Copy (placeholders, editable):** story names Backhaus as the bakery whose sourdough PBV is built on
— "the bakery that perfected the loaf now fires the pizza." Menu keeps the four current pizzas, each
gaining a tagline and a fuller description.

## 4. Components

```
src/components/
  ImagePlaceholder.tsx / .css   # on-brand fallback when MenuItem.image is absent
  MenuCard.tsx / .css           # one pizza: image (or placeholder), name, tagline, price, description
  Menu.tsx / Menu.css           # renders a responsive card GRID of MenuCard (Option B)
  Story.tsx / Story.css         # redesigned Backhaus heritage section
```

- **`ImagePlaceholder`** — off-white panel, foil hairline, a subtle centered mark (monogram/glyph) and
  a muted "photo coming" affordance. Pure CSS/inline SVG; no external assets, no licensing. Takes an
  optional `label` (the pizza name) for context. Reused anywhere an image may be missing.
- **`MenuCard`** — props: `item: MenuItem`. Renders `item.image` in a fixed-ratio frame, or
  `<ImagePlaceholder label={item.name} />` when absent. Below: name + price row (Caslon name, mono
  price), italic tagline (Fraunces), extended description (muted). One clear responsibility: present
  one menu item.
- **`Menu`** — maps `items` into `MenuCard`s in a responsive grid (`auto-fit, minmax(...)`, ~2 columns
  desktop, 1 on mobile), each wrapped in `Reveal` with a small stagger. Keeps the "The Menu" label and
  gold hairline header.
- **`Story`** — eyebrow label, Caslon heading, paragraphs, a Fraunces-italic **pull-quote** with a foil
  accent rule, and a small mono "established" line. Dark section retained for contrast.

## 5. Motion & Accessibility

- Reuse `Reveal` (already reduced-motion aware) for card and story reveals; cards stagger in.
- Images use `loading="lazy"` and a meaningful `alt` (the pizza name). `ImagePlaceholder` is
  decorative beyond its visible label; the card's name remains the accessible heading.
- No new animation primitives.

## 6. Testing (Vitest + RTL)

- `content.test.ts` updated: menu items expose `tagline` + `description`; `story` exposes `eyebrow`,
  `heading`, non-empty `paragraphs`, `pullquote`. Still asserts ≥3 menu items and Airport West / hours
  unchanged elsewhere.
- `ImagePlaceholder.test.tsx`: renders the provided label; no `<img>` element.
- `MenuCard.test.tsx`: with an `image`, renders an `<img>` with `alt` = name and the tagline/price/
  description; without an `image`, renders the placeholder (no broken `<img>`).
- `Menu.test.tsx` updated: renders all items as cards (names + prices present).
- `Story.test.tsx` updated: renders heading, each paragraph, and the pull-quote.
- `App.test.tsx`: unchanged assertions still hold (logo, a menu item name, Airport West, ≥2 Uber Eats
  CTAs).

## 7. Success Criteria

1. Menu renders as a responsive card grid; each card shows image-or-placeholder, name, tagline, price,
   and extended description.
2. A pizza with no `image` shows a tasteful on-brand placeholder, never a broken image.
3. Story section clearly tells the Backhaus heritage with editable placeholders for specifics.
4. All content editable from `src/content.ts`; `MenuItem`/`BrandStory` shapes are the contract Slice 2
   will mirror.
5. Full test suite green; production build clean; responsive on mobile.

## 8. Handoff to Slice 2

The `MenuItem` and `BrandStory` interfaces defined here become the Slice 2 database schema and the
admin console's edit form fields. `ImagePlaceholder` is reused while real images are uploaded.
