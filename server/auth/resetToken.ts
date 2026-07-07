import { randomBytes, createHash } from 'node:crypto'

/** 60 minutes, in ms — how long a password reset token remains valid. */
export const RESET_TTL_MS = 1000 * 60 * 60

/**
 * Generates a raw reset token (sent to the user via email) and its sha256 hash
 * (the only form persisted to the database). Never store the raw token.
 */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex')
  return { token, tokenHash: hashResetToken(token) }
}

/** Hashes a raw reset token for lookup/comparison against stored tokenHash values. */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
