import type { PrismaClient } from '@prisma/client'
import { prisma } from '../db'

export interface Context {
  db: PrismaClient
}

export function createContext(): Context {
  return { db: prisma }
}
