import { serve } from '@hono/node-server'
import { Hono } from 'hono'

export const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))

// Only start a real listener outside the test runner.
if (!process.env.VITEST) {
  const port = Number(process.env.PORT ?? 8787)
  serve({ fetch: app.fetch, port })
  // eslint-disable-next-line no-console
  console.log(`PBV server listening on :${port}`)
}
