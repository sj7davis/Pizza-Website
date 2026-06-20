import type { PrismaClient } from '@prisma/client'

export const SESSION_COOKIE = 'pbv_session'
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

export interface SessionUser {
  id: string
  email: string
}

export async function createSession(db: PrismaClient, userId: string): Promise<string> {
  const session = await db.session.create({
    data: { userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  })
  return session.id
}

export async function findValidUser(
  db: PrismaClient,
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null
  const session = await db.session.findUnique({ where: { id: token }, include: { user: true } })
  if (!session) return null
  if (session.expiresAt.getTime() <= Date.now()) return null
  return { id: session.user.id, email: session.user.email }
}

export async function deleteSession(db: PrismaClient, token: string | undefined): Promise<void> {
  if (!token) return
  await db.session.deleteMany({ where: { id: token } })
}
