# PBV — Slice 2: Railway Backend + Admin Console (Design Spec)

**Date:** 2026-06-20
**Status:** Approved (design), pending implementation plan
**Branch:** `feat/admin-backend` (new, off `build/landing-page`; its own PR)
**Depends on:** Slice 1 content model (`MenuItem`, `BrandStory` in `src/types.ts`)

## 1. Purpose

Move PBV's content out of the static `content.ts` file into a real database, and give the owners a
self-service **admin console** to edit the menu and brand text — with image uploads and **instant live
edits** (no rebuild). Hosted on **Railway**, using the owners' familiar **Hono + tRPC** stack with
**Prisma + Postgres**.

## 2. Decisions (locked in brainstorming)

| Decision | Choice |
|---|---|
| Edit scope | Menu **and** all brand/site text |
| Database | Postgres (Railway) |
| Auth | Owner accounts (email + password, argon2), httpOnly session cookie, first owner seeded from env |
| Hosting | One Railway service serving site + API + admin + uploads; one Postgres; one volume |
| Frontend data | Runtime fetch via tRPC + React Query, with bundled `content.ts` as instant fallback |
| Image storage | Railway volume, served by the backend at `/uploads/*` |
| API style | tRPC (public + admin routers) + one plain Hono multipart upload route |

## 3. Repo Structure (single package; additive)

```
PBV/
  src/                         # existing React app (client) — largely unchanged
    main.tsx                   # MODIFY: wrap in router + tRPC/React Query providers
    App.tsx                    # MODIFY: site route; content from useContent() (fallback = bundled)
    content.ts                 # KEEP: becomes fallback defaults + DB seed source
    lib/
      trpc.ts                  # CREATE: tRPC client + React Query
      useContent.ts            # CREATE: hook returning live SiteContent (fallback to bundled)
    admin/                     # CREATE: admin console (React, /admin route)
      AdminApp.tsx             # router for login vs dashboard
      Login.tsx
      MenuManager.tsx
      MenuItemForm.tsx
      BrandEditor.tsx
      ImageUploadField.tsx
      admin.css
  server/                      # CREATE: Hono backend
    index.ts                   # Hono app: tRPC mount, /api/admin/upload, static dist + /uploads, SPA fallback
    db.ts                      # Prisma client singleton
    env.ts                     # typed env loader (DATABASE_URL, ADMIN_*, SESSION_SECRET, ...)
    trpc/
      context.ts               # builds ctx (db, session/user from cookie)
      trpc.ts                  # initTRPC, publicProcedure, adminProcedure (auth guard)
      routers/
        app.ts                 # appRouter = { content, auth, menu, site }
        content.ts             # public: content.get
        auth.ts                # login, logout, me
        menu.ts                # list, create, update, delete, reorder (admin)
        site.ts                # get, update (admin)
    auth/
      password.ts              # argon2 hash/verify
      session.ts               # create/lookup/delete session, cookie helpers
    upload.ts                  # multipart handler: validate + save to volume + return path
    mappers.ts                 # DB row <-> SiteContent/MenuItem shape mapping
  prisma/
    schema.prisma              # MenuItem, SiteContent, AdminUser, Session
    seed.ts                    # seed SiteContent + menu from src/content.ts; seed first admin from env
  shared/
    contract.ts                # re-exports MenuItem/BrandStory/SiteContent types shared client+server
  vite.config.ts               # MODIFY: dev proxy /api + /uploads -> Hono
  package.json                 # MODIFY: server deps + scripts (dev:server, build, start, db:*)
```

`src/types.ts` interfaces remain the canonical content contract, re-exported via `shared/contract.ts`
for the server. Uploaded files live under `server/uploads/` (gitignored; a Railway volume in prod).

## 4. Data Model (`prisma/schema.prisma`, Postgres)

```prisma
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
  id               Int      @id @default(1)   // singleton (always id=1)
  brandName        String
  tagline          String
  uberEatsUrl      String
  storyEyebrow     String
  storyHeading     String
  storyParagraphs  Json     // string[]
  storyPullquote   String
  storyEstablished String
  deliveryArea     String
  deliveryHours    String
  socials          Json     // { label: string; href: string }[]
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
  id        String    @id @default(cuid())   // opaque token (also the cookie value)
  userId    String
  user      AdminUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime  @default(now())
}
```

`mappers.ts` converts between these rows and the `SiteContent`/`MenuItem` TS shapes the frontend uses
(e.g. assembling `story` from the `story*` columns, parsing `storyParagraphs`/`socials` JSON).

## 5. Auth

- Passwords hashed with **argon2** (`server/auth/password.ts`: `hashPassword`, `verifyPassword`).
- **Login** (`auth.login`): verify email+password → create `Session` (e.g. 30-day expiry) → set
  httpOnly, `secure`, `sameSite=lax` cookie `pbv_session`.
- **Guard** (`adminProcedure`): reads cookie → looks up unexpired session → attaches `user` to ctx;
  throws `UNAUTHORIZED` otherwise.
- **Logout** (`auth.logout`): delete session, clear cookie. **`auth.me`**: returns current user or null.
- **Seeding**: on server start (and via `prisma/seed.ts`), if no `AdminUser` exists and `ADMIN_EMAIL`
  + `ADMIN_PASSWORD` env are set, create the first owner. Owners are added by seeding/env for v1 (no
  self-signup; no public registration endpoint).
- `SESSION_SECRET` env used to sign/verify the cookie (defence in depth alongside the opaque token).

## 6. API Surface (tRPC)

**Public (`publicProcedure`):**
- `content.get()` → `{ siteContent: SiteContent; }` where `siteContent.menu` contains only
  `available` items ordered by `sortOrder`. Single call powering the whole site.

**Admin (`adminProcedure`, auth-guarded):**
- `auth.login({ email, password })`, `auth.logout()`, `auth.me()`
- `menu.list()` → all items (incl. unavailable), ordered
- `menu.create(input)`, `menu.update({ id, ...fields })`, `menu.delete({ id })`
- `menu.reorder({ ids: string[] })` → sets `sortOrder` by array position
- `site.get()` → current `SiteContent`; `site.update(input)` → upserts the singleton

**Upload (plain Hono route, session-guarded):**
- `POST /api/admin/upload` (multipart, field `file`) → validate (jpeg/png/webp, ≤5 MB) → write to
  volume with a content-hashed filename → respond `{ url: "/uploads/<file>" }`. The admin form then
  stores that URL on the menu item via `menu.update`.

Inputs validated with **zod** on every mutation.

## 7. Frontend Wiring

- `src/main.tsx` wraps the app in `QueryClientProvider` + tRPC provider, and a router with two routes:
  `/` → the marketing site, `/admin/*` → `AdminApp`.
- `useContent()` calls `content.get` via React Query, using the **bundled `content.ts` as
  `placeholderData`/`initialData`** so the site renders instantly and never blanks; it swaps to live
  data on success and **falls back to bundled defaults on error**.
- `App.tsx` reads from `useContent()` and passes props to the existing Hero/Menu/Story/Delivery/Footer
  components — those components are **unchanged** (they already take props).

## 8. Admin Console (`/admin`)

- **Login** screen (email + password) when unauthenticated (`auth.me` null).
- **Dashboard** when authenticated:
  - **Menu manager** — table/list of items; add, edit (modal/inline form via `MenuItemForm`),
    delete (with confirm), drag-or-buttons reorder (`menu.reorder`), availability toggle, and image
    upload (`ImageUploadField` → upload route → preview).
  - **Brand editor** — a form (`BrandEditor`) for story fields, tagline, delivery area/hours, socials
    (add/remove rows), and the Uber Eats URL; saves via `site.update`.
  - Logout button.
- Styling: functional, lightly on-brand (reuses theme tokens), distinct from the public site. Not
  premium-polished — it's an internal tool.

## 9. Deployment (Railway)

- **One service** built from the repo:
  - Build: `npm ci && npx prisma generate && npm run build` (Vite build of the client to `dist/`).
  - Release/start: `npx prisma migrate deploy && node server` (Hono serves `dist/`, `/api/*`,
    `/uploads/*`, and SPA fallback for `/` and `/admin/*`).
- **Postgres** plugin → `DATABASE_URL`.
- **Volume** mounted at `server/uploads` for persistent images.
- **Env vars:** `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `NODE_ENV=production`,
  `PORT` (Railway-provided).
- This phase requires the owner's **Railway login/linking** (interactive auth); the plan will guide it
  step-by-step. Provisioning may use the Railway CLI/MCP once authenticated.

## 10. Testing

- **Server unit:** `password.ts` (hash≠plaintext, verify true/false), `session.ts` (expiry logic),
  `mappers.ts` (row↔shape round-trip), `upload.ts` (rejects bad type/size, accepts valid).
- **Router tests:** `content.get` (filters unavailable, orders), `menu.*` and `site.update` against a
  **mocked Prisma client**; `adminProcedure` rejects without a valid session.
- **Frontend:** `useContent` falls back to bundled defaults on error; `Login` submits credentials;
  `MenuManager`/`BrandEditor` render and call the right mutations (mocked tRPC).
- **Existing 17 tests stay green** (public components unchanged).
- Tooling: Vitest across client + server (a second Vitest project/config for `server/`).

## 11. Success Criteria

1. With the DB seeded, the public site renders identical content to today, now fetched from the API
   (and still renders instantly via fallback if the API is unavailable).
2. An owner can log in at `/admin`, add/edit/delete/reorder menu items, toggle availability, upload an
   image, and edit all brand text — and see changes live on the site without a redeploy.
3. Admin routes are unreachable without a valid session; passwords are argon2-hashed; no secrets in the
   client bundle.
4. Deploys cleanly to Railway as one service + Postgres + volume; first owner seeded from env.
5. All tests (client + server) green; production build clean.

## 12. Out of Scope (YAGNI / later)

- Public self-signup, password reset emails, roles/permissions (owners are seeded).
- Image CDN / resizing / object storage (volume is enough for v1).
- Draft/preview workflow, content versioning/audit log, i18n.
- Online ordering (Uber Eats still handles ordering).

## 13. Open Items (non-blocking)

- Exact Railway region/plan and volume size (decide at deploy).
- Whether to add a second owner immediately (extra seed env or a one-off script).
