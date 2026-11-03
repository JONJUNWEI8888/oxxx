import { NextResponse, type NextRequest } from 'next/server'
import { contentSecurityPolicy } from './lib/security-policy.mjs'

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const isDev = process.env.NODE_ENV === 'development'
  const policy = contentSecurityPolicy({
    nonce,
    isDev,
    upgradeInsecure: request.nextUrl.protocol === 'https:',
  })

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', policy)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set('Content-Security-Policy', policy)
  return response
}

export const config = {
  matcher: [
    {
      // All routes, including /api. Skip hashed build assets and the favicon;
      // those responses are not documents. Prefetches are skipped so the
      // client router keeps the document nonce from the original request.
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
