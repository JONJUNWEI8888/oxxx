import type { FastifyReply, FastifyRequest } from 'fastify'

const BASE_NAMES = {
  access: 'oxxx_admin_access',
  refresh: 'oxxx_admin_refresh',
  csrf: 'oxxx_admin_csrf',
} as const

export type CookieNames = { access: string; refresh: string; csrf: string }

export type CookiePolicy = {
  secure: boolean
  sameSite: 'lax' | 'none'
  names: CookieNames
}

type CookieConfig = {
  NODE_ENV: string
  PUBLIC_BASE_URL: string
  consoleOrigin: string | null
}

/**
 * `__Host-` cookies: Secure, Path=/, and no Domain, so the browser rejects a parent-domain scope.
 * SameSite=None is used only when the console and the API are different sites.
 */
export function cookiePolicy(config: CookieConfig): CookiePolicy {
  const crossSite = Boolean(
    config.consoleOrigin && !sameRegistrableSite(config.consoleOrigin, config.PUBLIC_BASE_URL),
  )
  return {
    secure: true,
    sameSite: crossSite ? 'none' : 'lax',
    names: {
      access: `__Host-${BASE_NAMES.access}`,
      refresh: `__Host-${BASE_NAMES.refresh}`,
      csrf: `__Host-${BASE_NAMES.csrf}`,
    },
  }
}

export function cookieSecurityWarning(config: CookieConfig): string | null {
  if (config.NODE_ENV !== 'production') return null
  if (!config.PUBLIC_BASE_URL.startsWith('https:')) {
    return 'PUBLIC_BASE_URL is not https. __Host- session cookies are Secure and browsers will drop them on plain HTTP.'
  }
  if (config.consoleOrigin && !sameRegistrableSite(config.consoleOrigin, config.PUBLIC_BASE_URL)) {
    return 'ADMIN_CONSOLE_ORIGIN is a different site from PUBLIC_BASE_URL. Session cookies use SameSite=None; Secure and stay host-only on the API.'
  }
  return null
}

export function serializeCookie(
  name: string,
  value: string,
  opts: { maxAge: number; httpOnly: boolean; secure: boolean; sameSite: 'lax' | 'none' },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite === 'none' ? 'None' : 'Lax'}`,
  ]
  if (opts.httpOnly) parts.push('HttpOnly')
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() !== name) continue
    try {
      return decodeURIComponent(part.slice(eq + 1).trim())
    } catch {
      return null
    }
  }
  return null
}

export function readCookieHeader(request: FastifyRequest): string | undefined {
  const value = request.headers.cookie
  return typeof value === 'string' ? value : undefined
}

export function setSessionCookies(
  reply: FastifyReply,
  config: CookieConfig & { ACCESS_TOKEN_TTL_SEC: number; REFRESH_TOKEN_TTL_DAYS: number },
  tokens: { accessToken: string; refreshToken: string; csrfToken: string },
) {
  const policy = cookiePolicy(config)
  const refreshAge = config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
  const base = { httpOnly: true, secure: policy.secure, sameSite: policy.sameSite }
  reply.header('set-cookie', [
    serializeCookie(policy.names.access, tokens.accessToken, { ...base, maxAge: config.ACCESS_TOKEN_TTL_SEC }),
    serializeCookie(policy.names.refresh, tokens.refreshToken, { ...base, maxAge: refreshAge }),
    serializeCookie(policy.names.csrf, tokens.csrfToken, { ...base, maxAge: refreshAge }),
  ])
}

export function clearSessionCookies(reply: FastifyReply, config: CookieConfig) {
  const policy = cookiePolicy(config)
  const names = new Set<string>([
    policy.names.access,
    policy.names.refresh,
    policy.names.csrf,
    BASE_NAMES.access,
    BASE_NAMES.refresh,
    BASE_NAMES.csrf,
    `__Host-${BASE_NAMES.access}`,
    `__Host-${BASE_NAMES.refresh}`,
    `__Host-${BASE_NAMES.csrf}`,
  ])
  reply.header(
    'set-cookie',
    [...names].map((name) =>
      serializeCookie(name, '', {
        maxAge: 0,
        httpOnly: true,
        secure: name.startsWith('__Host-') || policy.secure,
        sameSite: policy.sameSite,
      }),
    ),
  )
}

export function sameRegistrableSite(a: string, b: string): boolean {
  try {
    return siteKey(new URL(a).hostname) === siteKey(new URL(b).hostname)
  } catch {
    return false
  }
}

function siteKey(hostname: string): string {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '::1') return host
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
  const parts = host.split('.')
  if (parts.length < 2) return host
  return parts.slice(-2).join('.')
}
