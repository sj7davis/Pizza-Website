# PBB — Slice "Order Moments" + Admin Save Reliability (Design Spec)

**Date:** 2026-06-21
**Status:** Draft — pending user approval
**Branch:** `feat/admin-backend` (continues the live app)
**Live:** https://pbb-app-production.up.railway.app

## 1. Purpose

Add three high-impact, front-of-house "ordering" features and make the admin's saving experience
rock-solid and obviously confirmed:

1. **Open-now status + window urgency** — a live badge ("Open now — ordering till 9pm" / "Opens at
   5pm" with a countdown); the order button is disabled when closed.
2. **Sold-out / paused toggle** — an admin switch that shows a banner ("Sold out tonight — back
   tomorrow at 5pm") and disables ordering, independent of hours.
3. **Multiple order platforms** — Uber Eats + DoorDash / Menulog etc., editable from admin; replaces
   the single Uber Eats URL.
4. **Admin save reliability & feedback** — every admin form clearly confirms success ("Saved ✓") and
   surfaces errors; menu + brand edits persist reliably (post auth-fix).

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Hours | Add **structured open/close times** (24h `HH:MM`, per the standard nightly window) used for the live status; the free-text `deliveryHours` stays for display. |
| Order links | Replace single `uberEatsUrl` with an **ordered list of `{ label, url }`** (Uber Eats first). Existing `uberEatsUrl` migrates to the first entry. |
| Status logic | Computed client-side from current local time vs the open/close window, plus the manual sold-out override. No timezone service — uses the venue's local time (Australia/Melbourne) via a fixed offset/config. |

## 3. Data Model Changes (`SiteContent`, Prisma + types)

Add to `SiteContent` (and the `SiteContent` TS type / mappers / admin):
- `openTime: string` — `"17:00"` (daily open)
- `closeTime: string` — `"21:00"` (daily close / last orders)
- `timezone: string` — IANA tz, default `"Australia/Melbourne"` (so "open now" is correct regardless
  of where the viewer is)
- `soldOut: boolean` — manual override (default false)
- `soldOutMessage: string` — e.g. "Sold out tonight — back tomorrow at 5pm"
- `orderLinks: { label: string; url: string }[]` — replaces `uberEatsUrl`

`uberEatsUrl` is removed from the model; the seed/migration maps the old value into
`orderLinks: [{ label: "Uber Eats", url: <old uberEatsUrl> }]`. The bundled `content.ts` fallback is
updated to the new shape.

## 4. Public Site Behaviour

- **`useOpenStatus()` hook** — given `openTime`/`closeTime`/`timezone`/`soldOut`, returns
  `{ state: 'open' | 'closed' | 'soldout', label, until }` where `label` is e.g. "Open now — ordering
  till 9pm" / "Opens at 5pm" / the sold-out message, and `until` powers a lightweight countdown.
- **`OrderStatus` component** — a small badge near the hero CTA showing that label (gold when open,
  muted when closed, red-ish when sold out).
- **Order buttons** — `Hero` + `Footer` render **all** `orderLinks` (primary = first). When
  `state !== 'open'`, buttons are **disabled/greyed** with the status reason as the accessible label.
- A **sold-out / closed banner** strip at the very top when not open.

## 5. Admin Changes

- **Brand editor** gains: open/close time inputs, timezone, the **Sold-out toggle** + message, and an
  **order-links editor** (add/remove/reorder rows of label + URL).
- **Save reliability & feedback (applies to menu + brand):**
  - Every mutation shows an inline **"Saved ✓"** confirmation on success and a clear **error message**
    on failure (no more silent saves).
  - Buttons show a pending state and are disabled while saving.
  - After save, the relevant query is invalidated so the list/form reflects the persisted state.
  - A shared `useSaveState()` (or small `<SaveStatus>`) standardises this across forms.

## 6. Validation

Extend `siteUpdateInput` (zod): `openTime`/`closeTime` match `^\d{2}:\d{2}$`; `timezone` non-empty;
`soldOut` boolean; `soldOutMessage` string; `orderLinks` a non-empty array of `{ label, url }` with
non-empty fields.

## 7. Testing

- `useOpenStatus` pure logic: open inside window, closed before/after, sold-out override wins,
  countdown target correct (unit tests with mocked "now").
- `OrderStatus` renders the right label per state.
- `Hero`/`Footer` render all order links; disabled when closed.
- Admin: order-links editor add/remove; sold-out toggle; save shows "Saved ✓" and error on failure
  (mocked tRPC).
- Server: `site.update` accepts/validates the new fields; mapper round-trips them; seed migrates
  `uberEatsUrl` → `orderLinks`.
- Existing 64 tests stay green (updated where `uberEatsUrl`/single-CTA assumptions change).

## 8. Migration / Deploy

- `db push` adds the new columns. The seed upserts the new `SiteContent` fields and, if `orderLinks`
  is empty, backfills it from the legacy value.
- Deploys to Railway as usual (push-to-deploy now connected).

## 9. Out of Scope (later slices)

OG/share image + dietary tags (Slice 2); in-app password change + rate-limiting + image optimization
(Slice 3); email capture + analytics + delivery-area checker (Slice 4); real migrations (Slice 5).

## 10. Open Items

- Exact open/close times confirmed by owner (default 17:00–21:00).
- DoorDash / Menulog URLs (owner provides; start with Uber Eats only + empty rows to fill).
