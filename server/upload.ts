import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { extname, join } from 'node:path'
import type { Context as HonoContext } from 'hono'
import { getCookie } from 'hono/cookie'
import { prisma } from './db'
import { SESSION_COOKIE, findValidUser } from './auth/session'

export const UPLOAD_DIR = join(process.cwd(), 'server', 'uploads')
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB

const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export function validateUpload(type: string, size: number): { ok: boolean; reason?: string } {
  if (!ALLOWED[type]) return { ok: false, reason: `Unsupported image type: ${type}` }
  if (size > MAX_UPLOAD_BYTES) return { ok: false, reason: 'File too large (max 5 MB)' }
  return { ok: true }
}

export async function handleUpload(c: HonoContext): Promise<Response> {
  const user = await findValidUser(prisma, getCookie(c, SESSION_COOKIE))
  if (!user) return c.json({ error: 'Unauthorized' }, 401)

  const body = await c.req.parseBody()
  const file = body['file']
  if (!(file instanceof File)) return c.json({ error: 'No file provided' }, 400)

  const check = validateUpload(file.type, file.size)
  if (!check.ok) return c.json({ error: check.reason }, 400)

  const buf = Buffer.from(await file.arrayBuffer())
  const ext = ALLOWED[file.type] ?? extname(file.name) ?? '.bin'
  const hash = createHash('sha256').update(buf).digest('hex').slice(0, 16)
  const filename = `${hash}${ext}`

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, filename), buf)

  return c.json({ url: `/uploads/${filename}` })
}
