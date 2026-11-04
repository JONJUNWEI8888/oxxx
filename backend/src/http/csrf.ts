import { createHash, timingSafeEqual } from 'crypto'
import type { FastifyRequest } from 'fastify'
import { AppError } from '../errors'
import { cookiePolicy, readCookie, readCookieHeader } from './cookies'

type CsrfConfig = {
  NODE_ENV: string
  PUBLIC_BASE_URL: string
  consoleOrigin: string | null
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Login and enrollment do not have a session yet. Cron and signed object URLs are not cookie sessions. */
const EXEMPT_PATHS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/mfa',
  '/api/v1/auth/invites/start',
  '/api/v1/auth/invites/redeem',
])

export function assertCsrf(request: FastifyRequest, config: CsrfConfig) {
  if (!cookieMutationNeedsCsrf(request, config)) return
  const names = cookiePolicy(config).names
  const expected = readCookie(readCookieHeader(request), names.csrf)
  const header = request.headers['x-csrf-token']
  const provided = typeof header === 'string' ? header : Array.isArray(header) ? header[0] : ''
  if (!expected || !provided || !safeEqual(expected, provided)) {
    throw new AppError(403, 'csrf_invalid', 'CSRF token is missing or does not match')
  }
}

export function cookieMutationNeedsCsrf(request: FastifyRequest, config: CsrfConfig): boolean {
  if (SAFE_METHODS.has(request.method)) return false
  const path = request.url.split('?')[0] ?? request.url
  if (EXEMPT_PATHS.has(path)) return false
  if (path.startsWith('/api/v1/internal')) return false
  if (path.startsWith('/api/v1/storage')) return false
  if (!path.startsWith('/api/v1/')) return false
  const header = readCookieHeader(request)
  const names = cookiePolicy(config).names
  return Boolean(
    readCookie(header, names.access) || readCookie(header, names.refresh) || readCookie(header, names.csrf),
  )
}

function safeEqual(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest()
  const right = createHash('sha256').update(b).digest()
  return timingSafeEqual(left, right)
}
