import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { auth, buildTestApp, createAdmin, login, migrate, PASSWORD, prisma, resetDb, totpCode } from './helpers'

describe('admin auth', () => {
  const appPromise = buildTestApp()

  beforeAll(async () => {
    await migrate()
  })

  beforeEach(async () => {
    await resetDb()
  })

  afterAll(async () => {
    await (await appPromise).close()
    await prisma.$disconnect()
  })

  it('rejects a bad password, rate limits repeats, and does not issue an access token before TOTP', async () => {
    const app = await appPromise
    await createAdmin('super_admin', 'root@example.com')
    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'root@example.com', password: 'not-the-password' },
    })
    expect(bad.statusCode).toBe(401)
    expect(bad.json().error.code).toBe('invalid_credentials')

    for (let i = 0; i < 7; i += 1) {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'root@example.com', password: 'not-the-password' },
      })
    }
    const limited = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'root@example.com', password: PASSWORD },
    })
    expect(limited.statusCode).toBe(429)

    await resetDb()
    await createAdmin('super_admin', 'root@example.com')
    const passwordOnly = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'root@example.com', password: PASSWORD },
    })
    expect(passwordOnly.statusCode).toBe(200)
    expect(passwordOnly.json().accessToken).toBeUndefined()
    expect(passwordOnly.json().status).toBe('mfa')

    const wrong = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/mfa',
      payload: { mfaToken: passwordOnly.json().mfaToken, code: '000000' },
    })
    expect(wrong.statusCode).toBe(401)

    const token = await login(app, 'root@example.com')
    const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: auth(token) })
    expect(me.statusCode).toBe(200)
    expect(me.json()).toMatchObject({ email: 'root@example.com', role: 'super_admin' })
    const anon = await app.inject({ method: 'GET', url: '/api/v1/auth/me' })
    expect(anon.statusCode).toBe(401)
  })

  it('requires TOTP enrollment before the first privileged session', async () => {
    const app = await appPromise
    await createAdmin('super_admin', 'new@example.com', { totpEnabled: false })
    const start = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'new@example.com', password: PASSWORD },
    })
    expect(start.json().status).toBe('enrollment')
    const setup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/totp/setup',
      headers: auth(start.json().setupToken),
    })
    expect(setup.statusCode).toBe(200)
    const confirm = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/totp/confirm',
      headers: auth(start.json().setupToken),
      payload: { code: totpCode() },
    })
    expect(confirm.statusCode).toBe(200)
    expect(confirm.json().accessToken).toEqual(expect.any(String))
  })

  it('blocks a disabled admin', async () => {
    const app = await appPromise
    const admin = await createAdmin('support', 'gone@example.com')
    await prisma.adminUser.update({ where: { id: admin.id }, data: { status: 'disabled' } })
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'gone@example.com', password: PASSWORD },
    })
    expect(res.statusCode).toBe(403)
  })

  it('publishes the OpenAPI document', async () => {
    const app = await appPromise
    const spec = app.swagger()
    expect(spec.paths?.['/api/v1/auth/login']).toBeTruthy()
    expect(spec.paths?.['/api/v1/kyc/{id}/approve']).toBeTruthy()
    expect(spec.paths?.['/api/v1/kyc/{id}/reject']).toBeTruthy()
    expect(spec.paths?.['/api/v1/presale/subscriptions.csv']).toBeTruthy()
  })
})
