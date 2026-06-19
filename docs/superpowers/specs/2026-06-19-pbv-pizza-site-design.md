# PBV — Sourdough Pizza Site · Design Spec

**Date:** 2026-06-19
**Status:** Approved (design), pending implementation plan
**Owner:** Scott Davis

## 1. Purpose

A single, premium, scroll-driven landing page for **PBV**, a new **delivery-only** sourdough
pizza business. The page has one primary job: make a visitor hungry within seconds and funnel
them to **Uber Eats** to order. It must feel genuinely premium — restraint, fine typography,
and one or two moments of "shine" rather than busy effects.

"PBV" is a placeholder name (a reference to the business owner) and may change. The design must
make the name trivial to swap.

## 2. Brand & Aesthetic Direction

Locked during brainstorming (Editorial Minimal × foil-gold):

| Element | Decision |
|---|---|
| Aesthetic | Editorial / magazine minimalism. Restraint = luxury. |
| Canvas | Off-white / warm paper (`#f6f5f1`), ink near-black (`#15140f`). |
| Accent | **Foil gold** — animated metallic shimmer gradient, used sparingly. |
| Display type | Libre Caslon Display (headings, logo). |
| Italic / editorial | Fraunces italic (taglines, descriptors). |
| UI / labels | Archivo (buttons, small uppercase labels). |
| Mono detail | Space Mono (prices, small meta like "N° 01 / EST 2026"). |
| Logo | **A · Caslon monogram** `P B·V` — pure type, foil dot/shine. Placeholder, easily swapped. |

Fonts are loaded from Google Fonts. Foil is a CSS gradient with a slow background-position
animation (clipped to text/stroke).

## 3. Scope (Day One)

A single scrolling page with these sections, in order:

1. **Hero** — full-screen off-white. Caslon `P B·V` monogram draws in on load with one foil-shine
   sweep; italic tagline; black **"Order on Uber Eats"** button with gold arrow; subtle grain texture.
2. **Menu showcase** — 3–5 signature sourdough pizzas. Big serif names, mono prices, gold hairline
   between rows. Staggered reveal on scroll. *(Placeholder pizzas day one.)*
3. **Brand story** — short "why sourdough / 48-hour ferment" narrative. Generous whitespace.
4. **Delivery + hours** — coverage and opening hours, clean two-column.
5. **Footer** — repeat Uber Eats CTA, socials/contact, monogram.

### Out of scope (YAGNI for v1)
- Direct online ordering / cart / payments (Uber Eats handles ordering).
- CMS / admin. Content lives in a typed config file.
- Multiple pages / routing.
- Accounts, i18n, blog.

## 4. Content (current values + placeholders)

All copy lives in a single typed config (`src/content.ts`) so non-developers can edit and so the
placeholder name/menu swap is a one-file change.

| Field | Value |
|---|---|
| Brand name / logo text | `PBV` (placeholder, swappable) |
| Uber Eats URL | **Placeholder** (`#` / `https://www.ubereats.com/`) until live — marked `// TODO` |
| Menu items | **Placeholder** pizzas (name, description, price) — 4 sample items |
| Delivery area | "Airport West & surrounding suburbs, Victoria" |
| Hours | "5–9pm, nightly" |
| Socials / contact | Placeholder (to supply) |
| Tagline | "Wild-yeast dough, 48 hours in the making." (editable) |

Placeholders are clearly marked so they are easy to find and replace.

## 5. Architecture

Standalone **React + Vite + TypeScript** project using the **Motion** library for animation.
Small, focused, independently-testable units:

```
src/
  main.tsx            # mount
  App.tsx             # page composition + load/scroll orchestration
  content.ts          # ALL copy & config (single source of truth)
  theme.css           # CSS variables: colors, fonts, foil gradient
  components/
    Logo.tsx          # animated foil monogram — ISOLATED so name swap is trivial
    Hero.tsx
    Menu.tsx
    Story.tsx
    Delivery.tsx
    Footer.tsx
    OrderButton.tsx   # reusable Uber Eats CTA (used in Hero + Footer)
    Reveal.tsx        # scroll-reveal wrapper (Motion), respects reduced-motion
```

**Boundaries:** each section component takes its data from `content.ts` and renders independently.
`Logo` knows nothing about the page; `OrderButton` knows only the Uber Eats URL. Changing the
brand name touches `content.ts` + (optionally) `Logo`'s glyphs only.

## 6. Motion

- **One orchestrated load sequence**: logo draw-in → foil shine → tagline fade → CTA, staggered.
- **Scroll reveals**: restrained per-section fade/translate via `Reveal` (Motion `whileInView`).
- Foil shimmer: logo only.
- **Accessibility**: all motion gated on `prefers-reduced-motion: reduce` (instant, no movement).

## 7. Hosting / Build

- Vite static build (`npm run build`) → deployable to Vercel / Netlify as static assets.
- No backend, no env secrets required for v1.

## 8. Success Criteria

1. Loads to an unmistakably premium hero with the animated PBV monogram in < 2s.
2. A first-time visitor reaches the Uber Eats CTA without scrolling (hero) and again in the footer.
3. All real content (name, Uber Eats link, menu, suburbs, hours) is editable from `content.ts`
   without touching component code.
4. Fully responsive (mobile-first — most delivery traffic is mobile).
5. Respects reduced-motion; passes basic Lighthouse a11y/perf.

## 9. Open Items (non-blocking — supplied later)

- Real Uber Eats store URL.
- Final pizza menu (names, descriptions, prices).
- Socials / contact details.
- Final brand name (when PBV is confirmed or replaced).
