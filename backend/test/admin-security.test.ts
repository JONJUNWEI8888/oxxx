import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import './env'
import { createHmac } from 'node:crypto'
import { loadConfig, startupWarnings } from '../src/config'
import { csrfTokenForSession } from '../src/http/csrf'
import { cookiePolicy, serializeCookie } from '../src/http/cookies'
import { ipInAllowlist, parseAllowlist } from '../src/net/ip-allowlist'

describe('admin network and cookie policy', () => {
  it('matches IPv4, IPv6, and mapped addresses and rejects a bad entry', () => {
    const ranges = parseAllowlist('203.0.113.0/24, 2001:db8::/32, 192.0.2.10')
    expect(ipInAllowlist('203.0.113.10', ranges)).toBe(true)
    expect(ipInAllowlist('::ffff:203.0.113.10', ranges)).toBe(true)
    expect(ipInAllowlist('198.51.100.10', ranges)).toBe(false)
    expect(ipInAllowlist('2001:db8::1', ranges)).toBe(true)
    expect(ipInAllowlist('2001:db9::1', ranges)).toBe(false)
    expect(ipInAllowlist('192.0.2.10', ranges)).toBe(true)
    expect(parseAllowlist('')).toEqual([])
    expect(() => parseAllowlist('not-an-ip')).toThrow(/ADMIN_IP_ALLOWLIST/)
  })

  it('binds the CSRF token to the session id and keeps __Host- cookies', () => {
    expect(csrfTokenForSession('session-id', 'server-secret')).toBe(
      createHmac('sha256', 'server-secret').update('session-id').digest('base64url'),
    )
    const local = cookiePolicy({
      NODE_ENV: 'development',
      PUBLIC_BASE_URL: 'http://localhost:4000',
      consoleOrigin: 'http://localhost:3000',
    })
    expect(local.secure).toBe(true)
    expect(local.sameSite).toBe('lax')
    expect(local.names.access).toBe('__Host-oxxx_admin_access')
    expect(local.names.csrf).toBe('__Host-oxxx_admin_csrf')
    const localCookie = serializeCookie(local.names.csrf, 'token', {
      maxAge: 60,
      httpOnly: true,
      secure: local.secure,
      sameSite: local.sameSite,
    })
    expect(localCookie).toContain('HttpOnly')
    expect(localCookie).toContain('SameSite=Lax')
    expect(localCookie).toContain('Secure')
    expect(localCookie).not.toMatch(/Domain=/i)

    const sameSite = cookiePolicy({
      NODE_ENV: 'production',
      PUBLIC_BASE_URL: 'https://api.oxxx.io',
      consoleOrigin: 'https://admin.oxxx.io',
    })
    expect(sameSite).toMatchObject({ secure: true, sameSite: 'lax' })
    expect(sameSite.names.access.startsWith('__Host-')).toBe(true)
    const hosted = serializeCookie(sameSite.names.csrf, 'csrf', {
      maxAge: 60,
      httpOnly: true,
      secure: sameSite.secure,
      sameSite: sameSite.sameSite,
    })
    expect(hosted).toContain('Secure')
    expect(hosted).toContain('HttpOnly')
    expect(hosted).not.toMatch(/Domain=/i)

    const crossSite = cookiePolicy({
      NODE_ENV: 'production',
      PUBLIC_BASE_URL: 'https://api.oxxx.io',
      consoleOrigin: 'https://admin.vercel.app',
    })
    expect(crossSite).toMatchObject({ secure: true, sameSite: 'none' })
  })

  it('warns in production when the allowlist or console origin is missing', () => {
    const base = loadConfig({
      ...process.env,
      NODE_ENV: 'production',
      PUBLIC_BASE_URL: 'https://api.oxxx.io',
      ADMIN_CONSOLE_ORIGIN: 'https://admin.oxxx.io',
      ADMIN_IP_ALLOWLIST: '203.0.113.0/24',
      APP_DB_PASSWORD: 'app-db-password',
    })
    expect(startupWarnings(base)).toEqual([])

    expect(() =>
      loadConfig({
        ...process.env,
        NODE_ENV: 'production',
        PUBLIC_BASE_URL: 'https://api.oxxx.io',
        ADMIN_CONSOLE_ORIGIN: 'https://admin.oxxx.io',
        ADMIN_IP_ALLOWLIST: '',
        ADMIN_IP_ALLOWLIST_DISABLED: 'yes',
        APP_DB_PASSWORD: 'app-db-password',
      }),
    ).toThrow(/ADMIN_IP_ALLOWLIST/)
    const disabled = loadConfig({
      ...process.env,
      NODE_ENV: 'production',
      PUBLIC_BASE_URL: 'https://api.oxxx.io',
      ADMIN_CONSOLE_ORIGIN: 'https://admin.oxxx.io',
      ADMIN_IP_ALLOWLIST: '',
      ADMIN_IP_ALLOWLIST_DISABLED: 'true',
      APP_DB_PASSWORD: 'app-db-password',
    })
    expect(startupWarnings(disabled).join('\n')).toMatch(/ADMIN_IP_ALLOWLIST_DISABLED/)
    expect(loadConfig({ ...process.env, ADMIN_CONSOLE_ORIGIN: 'https://admin.oxxx.io' }).corsOrigins).toEqual([
      'https://admin.oxxx.io',
    ])
    expect(() => loadConfig({ ...process.env, ADMIN_CONSOLE_ORIGIN: 'https://admin.oxxx.io/app' })).toThrow(
      /ADMIN_CONSOLE_ORIGIN/,
    )
    expect(() =>
      loadConfig({
        ...process.env,
        NODE_ENV: 'production',
        PUBLIC_BASE_URL: 'https://api.oxxx.io',
        ADMIN_CONSOLE_ORIGIN: 'https://admin.oxxx.io',
        ADMIN_IP_ALLOWLIST: '203.0.113.0/24',
        CSRF_SECRET: 'short',
      }),
    ).toThrow(/CSRF_SECRET/)
    expect(() =>
      loadConfig({
        ...process.env,
        NODE_ENV: 'production',
        PUBLIC_BASE_URL: 'https://api.oxxx.io',
        ADMIN_CONSOLE_ORIGIN: 'https://admin.oxxx.io',
        ADMIN_IP_ALLOWLIST: '203.0.113.0/24',
        CSRF_SECRET: '',
      }),
    ).toThrow(/CSRF_SECRET is required in production/)
    const dev = loadConfig({ ...process.env, NODE_ENV: 'development', CSRF_SECRET: '' })
    expect(dev.CSRF_SECRET.length).toBeGreaterThanOrEqual(32)
    expect(dev.CSRF_SECRET).not.toBe(dev.JWT_SECRET)
    expect(() =>
      loadConfig({
        ...process.env,
        NODE_ENV: 'production',
        PUBLIC_BASE_URL: 'https://api.oxxx.io',
        ADMIN_CONSOLE_ORIGIN: 'https://admin.oxxx.io',
        ADMIN_IP_ALLOWLIST: '203.0.113.0/24',
        APP_DB_PASSWORD: '',
      }),
    ).toThrow(/APP_DB_PASSWORD/)
    expect(loadConfig({ ...process.env, NODE_ENV: 'test', APP_DB_PASSWORD: '' }).NODE_ENV).toBe('test')
  })

  it('publishes the console routes in openapi.json', () => {
    const spec = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8')) as {
      paths: Record<string, unknown>
      info: { description: string }
    }
    for (const path of [
      '/api/v1/auth/me',
      '/api/v1/auth/csrf',
      '/api/v1/admin/admins',
      '/api/v1/admin/admins/{id}',
      '/api/v1/admin/admins/{id}/disable',
      '/api/v1/admin/invites',
      '/api/v1/kyc/history',
      '/api/v1/presale/summary',
      '/api/v1/presale/subscribers',
      '/api/v1/presale/subscribers.csv',
      '/api/v1/presale/subscribers/{address}/transfers',
    ]) {
      expect(spec.paths[path], path).toBeTruthy()
    }
    expect(spec.info.description).toMatch(/ADMIN_CONSOLE_ORIGIN/)
    expect(spec.info.description).toMatch(/X-Robots-Tag/)
  })
})
