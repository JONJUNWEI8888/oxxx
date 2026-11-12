import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PRESALE } from '../../lib/presale'
import { csrfTokenForSession } from '../src/http/csrf'
import { buildApp } from '../src/app'
import { loadConfig } from '../src/config'
import {
  accessTokenFromSetCookie,
  auth,
  buildTestApp,
  createAdmin,
  login,
  migrate,
  PASSWORD,
  prisma,
  resetDb,
  totpCode,
} from './helpers'

describe('admin console API', () => {
  const appPromise = buildTestApp()

  beforeAll(migrate)
  beforeEach(resetDb)
  afterAll(async () => {
    await (await appPromise).close()
    await prisma.$disconnect()
  })

  it('sets host-only cookies, requires CSRF for cookie mutations, and returns permissions', async () => {
    const app = await appPromise
    await createAdmin('support', 'support@example.com')
    await createAdmin('super_admin', 'root@example.com')
    const support = await loginCookies(app, 'support@example.com')
    for (const cookie of support.cookies) {
      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('Secure')
      expect(cookie).toContain('SameSite=Lax')
      expect(cookie).toContain('Path=/')
      expect(cookie).not.toMatch(/Domain=/i)
    }
    expect(support.cookies.some((cookie) => cookie.startsWith('__Host-oxxx_admin_access='))).toBe(true)
    expect(support.cookies.some((cookie) => cookie.startsWith('__Host-oxxx_admin_refresh='))).toBe(true)
    expect(support.cookies.some((cookie) => cookie.startsWith('__Host-oxxx_admin_csrf='))).toBe(true)
    expect(support.body.accessToken).toBeUndefined()
    expect(support.body.refreshToken).toBeUndefined()
    expect(support.body.tokenType).toBeUndefined()

    const me = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { cookie: cookieHeader(support.cookies) },
    })
    expect(me.statusCode).toBe(200)
    expect(me.headers['x-robots-tag']).toBe('noindex, nofollow')
    expect(me.json()).toMatchObject({
      email: 'support@example.com',
      role: 'support',
      csrfToken: support.csrf,
    })
    expect(me.json().permissions).toEqual(expect.arrayContaining(['users.read', 'users.freeze', 'presale.read', 'presale.export']))
    expect(me.json().permissions).not.toEqual(expect.arrayContaining(['kyc.review', 'admins.read', 'users.ban']))

    const bearer = await login(app, 'root@example.com')
    const bearerMe = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: auth(bearer) })
    expect(bearerMe.json().permissions).toEqual(expect.arrayContaining(['admins.update', 'kyc.review', 'users.ban']))
    expect(bearerMe.json().csrfToken).toBeNull()

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(bearer),
      payload: { email: 'ada@example.com' },
    })
    const userId = created.json().id as string
    const missingCsrf = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${userId}/freeze`,
      headers: { cookie: cookieHeader(support.cookies) },
      payload: { reason: 'cookie without csrf' },
    })
    expect(missingCsrf.statusCode).toBe(403)
    expect(missingCsrf.json().error.code).toBe('csrf_invalid')

    const frozen = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${userId}/freeze`,
      headers: { cookie: cookieHeader(support.cookies), 'x-csrf-token': support.csrf },
      payload: { reason: 'cookie session' },
    })
    expect(frozen.statusCode).toBe(200)
    expect(frozen.json().status).toBe('frozen')

    const boot = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/csrf',
      headers: { cookie: cookieHeader(support.cookies) },
    })
    expect(boot.json()).toEqual({ csrfToken: support.csrf })

    const loggedOut = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie: cookieHeader(support.cookies), 'x-csrf-token': support.csrf },
      payload: {},
    })
    expect(loggedOut.statusCode).toBe(200)
    const cleared = headerList(loggedOut.headers['set-cookie'])
    expect(cleared.some((cookie) => cookie.includes('Max-Age=0'))).toBe(true)
    const refresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: cookieHeader(support.cookies), 'x-csrf-token': support.csrf },
      payload: {},
    })
    expect(refresh.statusCode).toBe(401)
    expect(refresh.json().error.code).toBe('invalid_refresh')
  })

  it('allowlists admin and auth routes with proxy hops and keeps CORS on the console origin', async () => {
    const blockedApp = await buildApp(loadConfig({ ...process.env, ADMIN_IP_ALLOWLIST: '203.0.113.0/24', TRUST_PROXY_HOPS: '0' }))
    await blockedApp.ready()
    const spoofed = await blockedApp.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      remoteAddress: '198.51.100.8',
      headers: { 'x-forwarded-for': '203.0.113.10' },
    })
    expect(spoofed.statusCode).toBe(403)
    expect(spoofed.json().error.code).toBe('ip_forbidden')
    expect(spoofed.headers['retry-after']).toBeUndefined()
    const health = await blockedApp.inject({ method: 'GET', url: '/health', remoteAddress: '198.51.100.8' })
    expect(health.statusCode).toBe(200)
    expect(health.headers['x-robots-tag']).toBeUndefined()
    const cron = await blockedApp.inject({
      method: 'POST',
      url: '/api/v1/internal/presale/index',
      remoteAddress: '198.51.100.8',
      payload: {},
    })
    expect(cron.statusCode).toBe(403)
    expect(cron.json().error.code).toBe('ip_forbidden')
    for (const url of ['/%61pi/v1/auth/login', '/API/v1/auth/login', '//api/v1/auth/login', '/api//v1/auth/login']) {
      const disguised = await blockedApp.inject({
        method: 'POST',
        url,
        remoteAddress: '198.51.100.8',
        payload: { email: 'nobody@example.com', password: 'not-the-password' },
      })
      expect(disguised.statusCode, url).toBe(403)
      expect(disguised.json().error.code).toBe('ip_forbidden')
    }
    const allowedIp = await blockedApp.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      remoteAddress: '203.0.113.10',
      payload: { email: 'nobody@example.com', password: 'not-the-password' },
    })
    expect(allowedIp.statusCode).toBe(401)
    expect(allowedIp.json().error.code).toBe('invalid_credentials')
    await blockedApp.close()

    const proxied = await buildApp(loadConfig({ ...process.env, ADMIN_IP_ALLOWLIST: '203.0.113.10/32', TRUST_PROXY_HOPS: '1' }))
    await proxied.ready()
    const viaProxy = await proxied.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      remoteAddress: '10.0.0.8',
      headers: { 'x-forwarded-for': '203.0.113.10' },
    })
    expect(viaProxy.statusCode).toBe(401)
    expect(viaProxy.json().error.code).toBe('unauthorized')
    const ignored = await proxied.inject({
      method: 'GET',
      url: '/api/v1/users',
      remoteAddress: '10.0.0.8',
      headers: { 'x-forwarded-for': '198.51.100.9' },
    })
    expect(ignored.statusCode).toBe(403)
    expect(ignored.json().error.code).toBe('ip_forbidden')
    await proxied.close()

    const consoleApp = await buildApp(
      loadConfig({
        ...process.env,
        ADMIN_CONSOLE_ORIGIN: 'https://admin.oxxx.io',
        PUBLIC_BASE_URL: 'https://api.oxxx.io',
      }),
    )
    await consoleApp.ready()
    const ok = await consoleApp.inject({
      method: 'GET',
      url: '/api/v1/auth/csrf',
      headers: { origin: 'https://admin.oxxx.io' },
    })
    expect(ok.headers['access-control-allow-origin']).toBe('https://admin.oxxx.io')
    expect(ok.headers['access-control-allow-credentials']).toBe('true')
    expect(ok.headers['x-robots-tag']).toBe('noindex, nofollow')
    const publicSite = await consoleApp.inject({
      method: 'GET',
      url: '/api/v1/auth/csrf',
      headers: { origin: 'https://oxxx.io' },
    })
    expect(publicSite.headers['access-control-allow-origin']).toBeUndefined()
    const preflight = await consoleApp.inject({
      method: 'OPTIONS',
      url: '/api/v1/users',
      headers: {
        origin: 'https://admin.oxxx.io',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,x-csrf-token',
      },
    })
    expect(String(preflight.headers['access-control-allow-headers'])).toMatch(/x-csrf-token/i)
    expect(String(preflight.headers['access-control-expose-headers'])).toMatch(/retry-after/i)
    await consoleApp.close()
  })

  it('filters users by status, KYC, created range, and exact email or phone', async () => {
    const app = await appPromise
    await createAdmin('super_admin', 'root@example.com')
    await createAdmin('support', 'support@example.com')
    const token = await login(app, 'root@example.com')
    const support = await login(app, 'support@example.com')
    const ada = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(token),
      payload: { email: 'Ada@Example.com', phone: '+15551212' },
    })
    const bob = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(token),
      payload: { email: 'bob@example.com', phone: '+15550000' },
    })
    expect(ada.statusCode).toBe(200)
    await app.inject({
      method: 'POST',
      url: '/api/v1/kyc',
      headers: auth(token),
      payload: {
        userId: ada.json().id,
        level: 'basic',
        personal: {
          legalName: 'Ada',
          dateOfBirth: '1990-01-02',
          country: 'SG',
          documentType: 'passport',
          documentNumber: 'P1234567',
        },
      },
    })

    const byEmail = await app.inject({
      method: 'GET',
      url: '/api/v1/users?email=ada@example.com',
      headers: auth(token),
    })
    expect(byEmail.json().total).toBe(1)
    expect(byEmail.json().items[0]).toMatchObject({ email: 'ada@example.com', kyc: { status: 'pending' } })

    const byPhone = await app.inject({
      method: 'GET',
      url: '/api/v1/users?phone=%2B15550000',
      headers: auth(token),
    })
    expect(byPhone.json().items.map((item: { id: string }) => item.id)).toEqual([bob.json().id])

    const pending = await app.inject({
      method: 'GET',
      url: '/api/v1/users?kycStatus=pending',
      headers: auth(token),
    })
    expect(pending.json().items.map((item: { email: string }) => item.email)).toEqual(['ada@example.com'])
    const none = await app.inject({
      method: 'GET',
      url: '/api/v1/users?kycStatus=none',
      headers: auth(token),
    })
    expect(none.json().items.map((item: { email: string }) => item.email)).toEqual(['bob@example.com'])

    const future = await app.inject({
      method: 'GET',
      url: '/api/v1/users?createdFrom=2999-01-01T00:00:00.000Z',
      headers: auth(token),
    })
    expect(future.json().total).toBe(0)
    const past = await app.inject({
      method: 'GET',
      url: '/api/v1/users?createdFrom=2020-01-01T00:00:00.000Z&createdTo=2999-01-01T00:00:00.000Z&status=active',
      headers: auth(token),
    })
    expect(past.json().total).toBe(2)

    const masked = await app.inject({
      method: 'GET',
      url: '/api/v1/users?email=ada@example.com',
      headers: auth(support),
    })
    expect(masked.json().items[0].email).toBe('a***@example.com')
    expect(masked.json().items[0].phone).not.toBe('+15551212')
    const logged = await prisma.auditLog.findFirst({ where: { action: 'user.list', actorId: (await prisma.adminUser.findUniqueOrThrow({ where: { email: 'support@example.com' } })).id } })
    expect(logged?.metadata).toMatchObject({ search: 'email' })
    expect(JSON.stringify(logged?.metadata)).not.toContain('ada@example.com')
  })

  it('returns signed KYC document URLs and review history', async () => {
    const app = await appPromise
    await createAdmin('kyc_reviewer', 'review@example.com')
    await createAdmin('support', 'support@example.com')
    await createAdmin('super_admin', 'root@example.com')
    const reviewer = await login(app, 'review@example.com')
    const support = await login(app, 'support@example.com')
    const token = await login(app, 'root@example.com')
    const user = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(token),
      payload: { email: 'grace@example.com' },
    })
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/kyc',
      headers: auth(token),
      payload: {
        userId: user.json().id,
        level: 'advanced',
        personal: {
          legalName: 'Grace Hopper',
          dateOfBirth: '1906-12-09',
          country: 'US',
          documentType: 'id_card',
          documentNumber: 'ID-9988',
        },
      },
    })
    const id = created.json().id as string
    const upload = await app.inject({
      method: 'POST',
      url: `/api/v1/kyc/${id}/documents`,
      headers: auth(token),
      payload: { fileName: 'id.png', contentType: 'image/png' },
    })
    const detail = await app.inject({ method: 'GET', url: `/api/v1/kyc/${id}`, headers: auth(reviewer) })
    expect(detail.statusCode).toBe(200)
    const download = new URL(detail.json().documents[0].download.url as string)
    expect(download.pathname).toBe('/api/v1/storage/local')
    expect(detail.json().documents[0].download.expiresInSec).toBe(120)
    expect(detail.json().personal.documentNumber).toBe('ID-9988')

    const approved = await app.inject({
      method: 'POST',
      url: `/api/v1/kyc/${id}/approve`,
      headers: auth(reviewer),
      payload: {},
    })
    expect(approved.statusCode).toBe(200)
    const again = await app.inject({ method: 'GET', url: `/api/v1/kyc/${id}`, headers: auth(reviewer) })
    expect(again.json().history.map((event: { action: string }) => event.action)).toContain('kyc.approve')

    const history = await app.inject({ method: 'GET', url: '/api/v1/kyc/history?status=approved', headers: auth(reviewer) })
    expect(history.json().total).toBe(1)
    expect(history.json().items[0]).toMatchObject({ id, status: 'approved', userId: user.json().id })
    const hidden = await app.inject({ method: 'GET', url: '/api/v1/kyc/history', headers: auth(support) })
    expect(hidden.statusCode).toBe(403)
    expect(upload.statusCode).toBe(200)
  })

  it('summarizes presale subscribers, flags unconfirmed transfers, and streams CSV', async () => {
    const app = await appPromise
    await createAdmin('support', 'support@example.com')
    await createAdmin('kyc_reviewer', 'review@example.com')
    const support = await login(app, 'support@example.com')
    const reviewer = await login(app, 'review@example.com')
    const confirmed = `0x${'ab'.repeat(20)}`
    const pendingOnly = `0x${'cd'.repeat(20)}`
    await prisma.presaleContribution.createMany({
      data: [
        contribution(confirmed, `0x${'11'.repeat(32)}`, 1, '2500000000000000000', 40),
        contribution(confirmed, `0x${'22'.repeat(32)}`, 2, '1000000000000000000', 3),
        contribution(pendingOnly, `0x${'33'.repeat(32)}`, 0, '5000000000000000000', 2),
      ],
    })

    const summary = await app.inject({ method: 'GET', url: '/api/v1/presale/summary', headers: auth(support) })
    expect(summary.json()).toMatchObject({
      confirmationThreshold: 15,
      confirmed: { totalUsdt: '2.5', txCount: 1, subscriberCount: 1 },
      pending: { totalUsdt: '6', txCount: 2, subscriberCount: 2 },
    })

    const subscribers = await app.inject({ method: 'GET', url: '/api/v1/presale/subscribers', headers: auth(support) })
    expect(subscribers.json().total).toBe(1)
    expect(subscribers.json().items[0]).toMatchObject({
      address: confirmed,
      totalUsdt: '2.5',
      txCount: 1,
      pendingTxCount: 1,
      pendingOnly: false,
    })
    const withPending = await app.inject({
      method: 'GET',
      url: '/api/v1/presale/subscribers?includePending=true',
      headers: auth(support),
    })
    expect(withPending.json().total).toBe(2)
    expect(withPending.json().items.find((item: { address: string }) => item.address === pendingOnly)).toMatchObject({
      pendingOnly: true,
      totalUsdt: '0',
      txCount: 0,
    })

    const transfers = await app.inject({
      method: 'GET',
      url: `/api/v1/presale/subscribers/${confirmed}/transfers?includePending=true`,
      headers: auth(support),
    })
    expect(transfers.json().total).toBe(2)
    expect(transfers.json().items.filter((item: { pending: boolean }) => item.pending)).toHaveLength(1)

    const csv = await app.inject({ method: 'GET', url: '/api/v1/presale/subscribers.csv', headers: auth(support) })
    expect(csv.statusCode).toBe(200)
    expect(csv.headers['content-type']).toContain('text/csv')
    expect(csv.headers['content-disposition']).toContain('presale-subscribers.csv')
    expect(csv.body).toContain(confirmed)
    expect(csv.body).not.toContain(pendingOnly)
    const txCsv = await app.inject({ method: 'GET', url: '/api/v1/presale/subscriptions.csv', headers: auth(support) })
    expect(txCsv.body).toContain(`0x${'11'.repeat(32)}`)
    expect(txCsv.body).not.toContain(`0x${'33'.repeat(32)}`)
    expect(await prisma.auditLog.count({ where: { action: 'presale.subscribers.export' } })).toBe(1)

    const denied = await app.inject({ method: 'GET', url: '/api/v1/presale/summary', headers: auth(reviewer) })
    expect(denied.statusCode).toBe(403)
  })

  it('lets only a super admin list admins, invite, change role, and disable', async () => {
    const app = await appPromise
    await createAdmin('super_admin', 'root@example.com')
    const extra = await createAdmin('super_admin', 'extra@example.com')
    await createAdmin('support', 'support@example.com')
    const token = await login(app, 'root@example.com')
    const extraToken = await login(app, 'extra@example.com')
    const support = await login(app, 'support@example.com')

    const forbidden = await app.inject({ method: 'GET', url: '/api/v1/admin/admins', headers: auth(support) })
    expect(forbidden.statusCode).toBe(403)
    const list = await app.inject({ method: 'GET', url: '/api/v1/admin/admins?role=support', headers: auth(token) })
    expect(list.json().total).toBe(1)
    expect(list.json().items[0]).toMatchObject({ email: 'support@example.com', role: 'support', status: 'active' })
    expect(list.json().items[0].passwordHash).toBeUndefined()

    const invited = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/invites',
      headers: auth(token),
      payload: { email: 'new@example.com', role: 'kyc_reviewer' },
    })
    expect(invited.statusCode).toBe(200)
    expect(invited.json().token).toEqual(expect.any(String))

    const self = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/admins/${(await prisma.adminUser.findUniqueOrThrow({ where: { email: 'root@example.com' } })).id}`,
      headers: auth(token),
      payload: { role: 'support' },
    })
    expect(self.statusCode).toBe(409)
    expect(self.json().error.code).toBe('self_change')

    const changed = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/admins/${extra.id}`,
      headers: auth(token),
      payload: { role: 'kyc_reviewer' },
    })
    expect(changed.json()).toMatchObject({ role: 'kyc_reviewer' })
    const stale = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: auth(extraToken) })
    expect(stale.statusCode).toBe(401)

    const last = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/admins/${(await prisma.adminUser.findUniqueOrThrow({ where: { email: 'root@example.com' } })).id}/disable`,
      headers: auth(token),
      payload: {},
    })
    expect(last.statusCode).toBe(409)
    expect(last.json().error.code).toBe('last_super_admin')

    const supportId = (await prisma.adminUser.findUniqueOrThrow({ where: { email: 'support@example.com' } })).id
    const disabled = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/admins/${supportId}/disable`,
      headers: auth(token),
      payload: { reason: 'left the team' },
    })
    expect(disabled.json()).toMatchObject({ status: 'disabled' })
    const loginDisabled = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'support@example.com', password: PASSWORD },
    })
    expect(loginDisabled.statusCode).toBe(403)
    expect(loginDisabled.json().error.code).toBe('admin_disabled')

    const audit = await app.inject({
      method: 'GET',
      url: `/api/v1/audit?action=admin.disable&targetId=${supportId}`,
      headers: auth(token),
    })
    expect(audit.json().total).toBe(1)
    expect(audit.json().items[0].metadata).toMatchObject({ reason: 'left the team' })
    expect(audit.json()).toMatchObject({ page: 1, pageSize: 20 })
    await expect(prisma.auditLog.updateMany({ data: { action: 'tamper' } })).rejects.toThrow(/append-only/)
    await expect(prisma.$executeRaw`DELETE FROM audit_logs`).rejects.toThrow(/append-only/)
  })

  it('requires CSRF and JSON on encoded routes and keeps one super admin under a race', async () => {
    const app = await appPromise
    await createAdmin('kyc_reviewer', 'review@example.com')
    const reviewer = await loginCookies(app, 'review@example.com')
    const token = accessTokenFromSetCookie(reviewer.cookies)
    const rootAdmin = await createAdmin('super_admin', 'root@example.com')
    const root = await login(app, 'root@example.com')
    const user = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(root),
      payload: { email: 'ada@example.com' },
    })
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/kyc',
      headers: auth(root),
      payload: {
        userId: user.json().id,
        level: 'basic',
        personal: {
          legalName: 'Ada',
          dateOfBirth: '1990-01-02',
          country: 'SG',
          documentType: 'passport',
          documentNumber: 'P123',
        },
      },
    })
    expect(user.statusCode).toBe(200)
    expect(created.statusCode, JSON.stringify(created.json())).toBe(200)
    const id = created.json().id as string
    expect(id).toMatch(/^[0-9a-f-]{36}$/i)
    const encoded = await app.inject({
      method: 'POST',
      url: `/%61pi/v1/kyc/${id}/approve`,
      headers: { cookie: cookieHeader(reviewer.cookies), 'content-type': 'application/json' },
      payload: {},
    })
    expect(encoded.statusCode).toBe(403)
    expect(encoded.json().error.code).toBe('csrf_invalid')
    const plain = await app.inject({
      method: 'POST',
      url: `/api/v1/kyc/${id}/approve`,
      headers: { ...auth(token), 'content-type': 'text/plain' },
    })
    expect(plain.statusCode).toBe(415)
    expect(plain.json().error.code).toBe('unsupported_media_type')
    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: cookieHeader(reviewer.cookies), 'x-csrf-token': reviewer.csrf, 'content-type': 'application/json' },
      payload: {},
    })
    expect(refreshed.statusCode).toBe(200)
    expect(refreshed.json().accessToken).toBeUndefined()
    expect(refreshed.json().refreshToken).toBeUndefined()
    expect(refreshed.json().csrfToken).toEqual(expect.any(String))

    const other = await createAdmin('super_admin', 'other@example.com')
    const otherToken = await login(app, 'other@example.com')
    const [left, right] = await Promise.all([
      app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/admins/${other.id}`,
        headers: auth(root),
        payload: { role: 'support' },
      }),
      app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/admins/${rootAdmin.id}`,
        headers: auth(otherToken),
        payload: { role: 'support' },
      }),
    ])
    expect([left.statusCode, right.statusCode].sort()).toEqual([200, 409])
    const denied = [left, right].find((res) => res.statusCode === 409)
    expect(denied?.json().error.code).toBe('last_super_admin')
    expect(await prisma.adminUser.count({ where: { role: 'super_admin', status: 'active' } })).toBe(1)
  })

  it('rejects TRUNCATE on audit_logs while the trigger is enabled', async () => {
    await expect(prisma.$executeRawUnsafe('TRUNCATE TABLE audit_logs')).rejects.toThrow(/append-only/)
  })

  it('rejects an access token captured before logout', async () => {
    const app = await appPromise
    await createAdmin('support', 'gone@example.com')
    const session = await loginCookies(app, 'gone@example.com')
    const captured = accessTokenFromSetCookie(session.cookies)
    const row = await prisma.refreshToken.findFirstOrThrow({
      where: { admin: { email: 'gone@example.com' }, revokedAt: null },
    })
    expect(session.csrf).toBe(csrfTokenForSession(row.id, process.env.CSRF_SECRET ?? ''))
    expect(session.csrf).not.toBe(csrfTokenForSession(row.id, process.env.JWT_SECRET ?? ''))
    const before = await app.inject({ method: 'GET', url: '/api/v1/users', headers: auth(captured) })
    expect(before.statusCode).toBe(200)
    const loggedOut = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        cookie: cookieHeader(session.cookies),
        'content-type': 'application/json',
        'x-csrf-token': session.csrf,
      },
      payload: {},
    })
    expect(loggedOut.statusCode).toBe(200)
    const after = await app.inject({ method: 'GET', url: '/api/v1/users', headers: auth(captured) })
    expect(after.statusCode).toBe(401)
    expect(after.json().error.code).toBe('unauthorized')
  })
})

function headerList(value: string | string[] | undefined): string[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function cookieHeader(cookies: string[]): string {
  return cookies.map((cookie) => cookie.split(';')[0]).join('; ')
}

async function loginCookies(app: Awaited<ReturnType<typeof buildTestApp>>, email: string) {
  const start = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password: PASSWORD },
  })
  expect(start.statusCode).toBe(200)
  const mfa = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/mfa',
    payload: { mfaToken: start.json().mfaToken, code: totpCode() },
  })
  expect(mfa.statusCode).toBe(200)
  return {
    cookies: headerList(mfa.headers['set-cookie']),
    csrf: mfa.json().csrfToken as string,
    body: mfa.json() as { accessToken?: string; refreshToken?: string; tokenType?: string },
  }
}

function contribution(fromAddress: string, txHash: string, logIndex: number, amountRaw: string, confirmations: number) {
  return {
    txHash,
    logIndex,
    fromAddress,
    toAddress: PRESALE.address.toLowerCase(),
    amountRaw,
    blockNumber: 100 + logIndex,
    blockHash: `0x${'ee'.repeat(32)}`,
    blockTime: new Date('2026-11-02T00:00:00.000Z'),
    confirmations,
    direction: 'inbound' as const,
  }
}
