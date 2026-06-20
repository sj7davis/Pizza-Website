import type { Context as HonoContext } from 'hono'
import { getCookie } from 'hono/cookie'
import type { PrismaClient } from '@prisma/client'
import { prisma } from '../db'
import { SESSION_COOKIE, findValidUser, type SessionUser } from '../auth/session'

export interface Context {
  db: PrismaClient
  c: HonoContext
  user: SessionUser | null
}

export async function createContext(c: HonoContext): Promise<Context> {
  const token = getCookie(c, SESSION_COOKIE)
  const user = await findValidUser(prisma, token)
  return { db: prisma, c, user }
}
