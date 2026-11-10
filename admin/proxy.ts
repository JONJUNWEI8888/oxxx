import { NextResponse, type NextRequest } from 'next/server'
import { clientIpFromHeaders, ipAllowed, parseAllowlist } from '@/lib/ip-allowlist'

export function proxy(request: NextRequest) {
  const blocked = denyIfNotAllowed(request)
  if (blocked) return blocked

  const nonce = btoa(crypto.randomUUID())
  const isDev = process.env.NODE_ENV === 'development'
  const https = request.nextUrl.protocol === 'https:'
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin()}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    ...(https ? ['upgrade-insecure-requests'] : []),
  ].join('; ')

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  applySecurityHeaders(response.headers, https)
  return response
}

function apiOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || 'http://localhost:4000').origin
  } catch {
    return 'http://localhost:4000'
  }
}

function denyIfNotAllowed(request: NextRequest) {
  let rules
  try {
    rules = parseAllowlist(process.env.ADMIN_IP_ALLOWLIST)
  } catch {
    return textResponse(503, '访问控制配置无效，请稍后重试')
  }
  if (!rules) return null
  const platformIp = (request as NextRequest & { ip?: string | null }).ip ?? null
  const ip = clientIpFromHeaders(request.headers, platformIp)
  const candidate = ip ?? (process.env.NODE_ENV === 'production' ? null : '127.0.0.1')
  if (ipAllowed(candidate, rules)) return null
  return textResponse(403, '此网络不在允许的访问范围内')
}

function textResponse(status: number, message: string) {
  const headers = new Headers({ 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
  applySecurityHeaders(headers, false)
  return new NextResponse(message, { status, headers })
}

function applySecurityHeaders(headers: Headers, https: boolean) {
  headers.set('X-Robots-Tag', 'noindex, nofollow')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  if (https) headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
