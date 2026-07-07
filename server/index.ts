import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { trpcServer } from '@hono/trpc-server'
import { readFile } from 'node:fs/promises'
import { appRouter } from './trpc/routers/app'
import { createContext } from './trpc/context'
import { handleUpload } from './upload'
import { securityHeaders } from './security'
import { buildAndInjectSeo, buildRobotsTxt, buildSitemapXml } from './seo'

export const app = new Hono()
app.use('*', securityHeaders)

app.get('/api/health', (c) => c.json({ ok: true }))

app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (opts, c) =>
      createContext(c, opts.resHeaders) as unknown as Promise<Record<string, unknown>>,
  }),
)

app.post('/api/admin/upload', (c) => handleUpload(c))

// ── SEO routes – must be registered BEFORE the SPA catch-all ────────────────

app.get('/robots.txt', (c) => {
  const baseUrl = process.env.SITE_URL ?? new URL(c.req.url).origin
  return c.text(buildRobotsTxt(baseUrl), 200, { 'Content-Type': 'text/plain; charset=utf-8' })
})

app.get('/sitemap.xml', (c) => {
  const baseUrl = process.env.SITE_URL ?? new URL(c.req.url).origin
  const lastmod = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return c.body(buildSitemapXml(baseUrl, lastmod), 200, {
    'Content-Type': 'application/xml; charset=utf-8',
  })
})

// Serve uploaded images and the built client (production). Skipped under tests.
if (!process.env.VITEST) {
  app.use('/uploads/*', serveStatic({ root: './server' }))

  // Static assets (hashed filenames, images, etc.) — served directly from dist/
  app.use('/*', serveStatic({ root: './dist' }))

  // SPA fallback: inject JSON-LD into index.html for all non-asset GET requests
  app.get('*', async (c) => {
    const baseUrl = process.env.SITE_URL ?? new URL(c.req.url).origin
    let html: string
    try {
      html = await readFile('./dist/index.html', 'utf-8')
    } catch {
      return c.text('Not found', 404)
    }
    try {
      html = await buildAndInjectSeo(html, baseUrl)
    } catch {
      // SEO/DB failure must never 500 the homepage — serve plain HTML
    }
    return c.html(html)
  })
}

if (!process.env.VITEST) {
  const port = Number(process.env.PORT ?? 8787)
  serve({ fetch: app.fetch, port })
  // eslint-disable-next-line no-console
  console.log(`PBB server listening on :${port}`)
}
