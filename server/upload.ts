import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
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

  const input = Buffer.from(await file.arrayBuffer())
  let out: Buffer = input
  let ext = ALLOWED[file.type] ?? '.bin'
  try {
    const sharp = (await import('sharp')).default
    out = await sharp(input).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
    ext = '.webp'
  } catch {
    // sharp unavailable or unsupported input — fall back to the original bytes.
  }
  const hash = createHash('sha256').update(out).digest('hex').slice(0, 16)
  const filename = `${hash}${ext}`

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, filename), out)

  return c.json({ url: `/uploads/${filename}` })
}
