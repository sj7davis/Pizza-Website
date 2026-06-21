# PBB — Deploying to Railway

The app is one Railway **service** (Hono server that serves the built site + tRPC API + `/admin` +
uploaded images) plus a **Postgres** database and a **volume** for images.

## Prerequisites (you do this once)

The Railway CLI is already installed. Authenticate it (opens a browser):

```bash
railway login
```

That's the only step that needs you — once logged in, the rest can be driven for you.

## What gets provisioned

1. **Project** + **Postgres** plugin (provides `DATABASE_URL`).
2. **Service** connected to the GitHub repo `sj7davis/Pizza-Website` (branch `feat/admin-backend`,
   or `main` after merge).
3. **Volume** mounted at `server/uploads` (persists uploaded pizza photos).
4. **Service variables:**
   - `ADMIN_EMAIL` — your owner login email
   - `ADMIN_PASSWORD` — your owner password (change after first login)
   - `COOKIE_SECURE` = `true`
   - (`DATABASE_URL` comes from the Postgres plugin; `PORT` is provided by Railway.)

## Build & run (already configured in package.json)

- **Install:** `npm ci` (+ `postinstall` runs `prisma generate`)
- **Build:** `npm run build` (`tsc -b && vite build` → `dist/`)
- **Start:** `npm start` → `prisma db push --skip-generate && tsx prisma/seed.ts && tsx server/index.ts`
  - `db push` creates/syncs the tables directly from `schema.prisma` (no migration files needed),
    then seeds site content + menu (idempotent) and the first owner from
    `ADMIN_EMAIL`/`ADMIN_PASSWORD`, then serves on `$PORT`.

## After first deploy

1. Visit the generated Railway URL — the site should render from the database.
2. Go to `/admin`, log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
3. Set your real **Uber Eats URL**, edit the menu, upload photos, fill the Backhaus story specifics.

## Notes

- Schema is applied with `prisma db push` (no migration history). Fine for this single-owner app; if
  you later want versioned migrations, switch the start command back to `prisma migrate deploy` and
  add a `prisma/migrations/` folder.
- Secrets are set in Railway only; never commit a real `.env` (`.env*` is gitignored).
