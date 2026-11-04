import { createHmac, timingSafeEqual } from 'crypto'
import type { FastifyRequest } from 'fastify'
import { AppError } from '../errors'
import { sha256, verifyToken } from '../crypto/tokens'
import { getPrisma } from '../db'
import { cookiePolicy, readCookie, readCookieHeader } from './cookies'

type CsrfConfig = {
  JWT_SECRET: string
  NODE_ENV: string
  PUBLIC_BASE_URL: string
  consoleOrigin: string | null
}

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Pre-session routes. Every other state-changing route requires a CSRF header
 * when any session cookie is present. Matched against Fastify's route pattern,
 * not the raw URL.
 */
const CSRF_EXEMPT_ROUTES = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/mfa',
  '/api/v1/auth/invites/start',
  '/api/v1/auth/invites/redeem',
])

/** Signed object upload is authorized by the URL token and is not JSON. */
const JSON_EXEMPT_ROUTES = new Set(['/api/v1/storage/local'])

/** HMAC-SHA256(server secret, session id). The session id is the refresh-token row id. */
export function csrfTokenForSession(sessionId: string, serverSecret: string): string {
  return createHmac('sha256', serverSecret).update(sessionId).digest('base64url')
}

export function assertJsonContentType(request: FastifyRequest) {
  if (!STATE_CHANGING.has(request.method)) return
  const route = request.routeOptions?.url
  if (route && JSON_EXEMPT_ROUTES.has(route)) return
  const header = request.headers['content-type']
  const mediaType = (Array.isArray(header) ? header[0] : header ?? '').split(';')[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') {
    throw new AppError(415, 'unsupported_media_type', 'Content-Type must be application/json')
  }
}

export async function sessionCsrfToken(request: FastifyRequest, config: CsrfConfig): Promise<string | null> {
  return expectedCsrf(request, config)
}

export async function assertCsrf(request: FastifyRequest, config: CsrfConfig) {
  if (!STATE_CHANGING.has(request.method)) return
  const route = request.routeOptions?.url
  if (route && CSRF_EXEMPT_ROUTES.has(route)) return
  if (!hasSessionCookie(request, config)) return
  const expected = await expectedCsrf(request, config)
  const provided = headerToken(request)
  if (!expected || !provided || !safeEqual(expected, provided)) {
    throw new AppError(403, 'csrf_invalid', 'CSRF token is missing or does not match')
  }
}

export function hasSessionCookie(request: FastifyRequest, config: CsrfConfig): boolean {
  const header = readCookieHeader(request)
  const names = cookiePolicy(config).names
  return Boolean(readCookie(header, names.access) || readCookie(header, names.refresh) || readCookie(header, names.csrf))
}

async function expectedCsrf(request: FastifyRequest, config: CsrfConfig): Promise<string | null> {
  const header = readCookieHeader(request)
  const names = cookiePolicy(config).names
  const access = readCookie(header, names.access)
  if (access) {
    try {
      const claims = await verifyToken(access, config)
      return csrfTokenForSession(claims.sid, config.JWT_SECRET)
    } catch {
      // Fall through to the refresh cookie when the access cookie is expired.
    }
  }
  const refresh = readCookie(header, names.refresh)
  if (!refresh) return null
  const row = await getPrisma().refreshToken.findUnique({ where: { tokenHash: sha256(refresh) } })
  if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) return null
  return csrfTokenForSession(row.id, config.JWT_SECRET)
}

function headerToken(request: FastifyRequest): string {
  const header = request.headers['x-csrf-token']
  if (typeof header === 'string') return header
  if (Array.isArray(header)) return header[0] ?? ''
  return ''
}

function safeEqual(a: string, b: string): boolean {
  const left = createHmac('sha256', 'csrf-compare').update(a).digest()
  const right = createHmac('sha256', 'csrf-compare').update(b).digest()
  return timingSafeEqual(left, right)
}
