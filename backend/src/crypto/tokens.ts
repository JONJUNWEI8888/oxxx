import { createHash, randomBytes } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import type { AdminRole } from '@prisma/client'
export type AccessClaims = {
  sub: string
  role: AdminRole
  tv: number
  scope: 'access'
  /** Refresh-token row id. CSRF is HMAC(server secret, sid). */
  sid: string
}

export async function signToken(claims: AccessClaims, config: { JWT_SECRET: string }, ttlSec: number): Promise<string> {
  return new SignJWT({ role: claims.role, tv: claims.tv, scope: claims.scope, sid: claims.sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(secret(config))
}

export async function verifyToken(token: string, config: { JWT_SECRET: string }): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret(config))
  if (payload.scope !== 'access') throw new Error('bad scope')
  if (typeof payload.sub !== 'string' || typeof payload.tv !== 'number') throw new Error('bad token')
  if (typeof payload.sid !== 'string' || !payload.sid) throw new Error('bad token')
  if (payload.role !== 'super_admin' && payload.role !== 'kyc_reviewer' && payload.role !== 'support') {
    throw new Error('bad role')
  }
  return { sub: payload.sub, role: payload.role, tv: payload.tv, scope: payload.scope, sid: payload.sid }
}

export function newSecret(): string {
  return randomBytes(32).toString('base64url')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function secret(config: { JWT_SECRET: string }): Uint8Array {
  return new TextEncoder().encode(config.JWT_SECRET)
}
