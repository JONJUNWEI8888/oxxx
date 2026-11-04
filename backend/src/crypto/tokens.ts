import { createHash, randomBytes } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import type { AdminRole } from '@prisma/client'
import type { AppConfig } from '../config'

export type AccessClaims = {
  sub: string
  role: AdminRole
  tv: number
  scope: 'access'
}

export async function signToken(claims: AccessClaims, config: AppConfig, ttlSec: number): Promise<string> {
  return new SignJWT({ role: claims.role, tv: claims.tv, scope: claims.scope })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${ttlSec}s`)
    .sign(secret(config))
}

export async function verifyToken(token: string, config: AppConfig): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret(config))
  if (payload.scope !== 'access') throw new Error('bad scope')
  if (typeof payload.sub !== 'string' || typeof payload.tv !== 'number') throw new Error('bad token')
  if (payload.role !== 'super_admin' && payload.role !== 'kyc_reviewer' && payload.role !== 'support') {
    throw new Error('bad role')
  }
  return { sub: payload.sub, role: payload.role, tv: payload.tv, scope: payload.scope }
}

export function newSecret(): string {
  return randomBytes(32).toString('base64url')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function secret(config: AppConfig): Uint8Array {
  return new TextEncoder().encode(config.JWT_SECRET)
}
