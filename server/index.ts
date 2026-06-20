import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './trpc/routers/app'
import { createContext } from './trpc/context'

export const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))

app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) =>
      createContext(c) as unknown as Promise<Record<string, unknown>>,
  }),
)

// Serve uploaded images and the built client (production). Skipped under tests.
if (!process.env.VITEST) {
  app.use('/uploads/*', serveStatic({ root: './server' }))
  app.use('/*', serveStatic({ root: './dist' }))
  app.get('*', serveStatic({ path: './dist/index.html' }))
}

if (!process.env.VITEST) {
  const port = Number(process.env.PORT ?? 8787)
  serve({ fetch: app.fetch, port })
  // eslint-disable-next-line no-console
  console.log(`PBV server listening on :${port}`)
}
