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

  it('enrolls a new admin only through a one-time invite', async () => {
    const app = await appPromise
    await createAdmin('super_admin', 'root@example.com')
    const token = await login(app, 'root@example.com')
    const invited = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/invites',
      headers: auth(token),
      payload: { email: 'new@example.com', role: 'support' },
    })
    expect(invited.statusCode).toBe(200)
    const inviteToken = invited.json().token as string
    const passwordLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'new@example.com', password: 'whatever-password' },
    })
    expect(passwordLogin.statusCode).toBe(401)
    const started = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/invites/start',
      payload: { token: inviteToken },
    })
    expect(started.statusCode).toBe(200)
    expect(started.json().otpauthUrl).toContain('otpauth://')
    const redeemed = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/invites/redeem',
      payload: { token: inviteToken, password: 'a-real-password-12', code: totpCode(started.json().secret) },
    })
    expect(redeemed.statusCode).toBe(200)
    const again = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/invites/redeem',
      payload: { token: inviteToken, password: 'a-real-password-12', code: totpCode(started.json().secret) },
    })
    expect(again.statusCode).toBe(410)
    const session = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'new@example.com', password: 'a-real-password-12' },
    })
    expect(session.json().status).toBe('mfa')
  })

  it('locks MFA per account across new challenges and rejects a reused code', async () => {
    const app = await appPromise
    await createAdmin('super_admin', 'root@example.com')
    const code = totpCode()
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'root@example.com', password: PASSWORD },
    })
    for (let i = 0; i < 5; i += 1) {
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/mfa',
        payload: { mfaToken: first.json().mfaToken, code: '000000' },
      })
    }
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'root@example.com', password: PASSWORD },
    })
    expect(second.statusCode).toBe(429)
    expect(second.json().error.code).toBe('mfa_locked')

    await prisma.adminUser.update({
      where: { email: 'root@example.com' },
      data: { mfaFailedAttempts: 0, mfaLockedUntil: null },
    })
    const fresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'root@example.com', password: PASSWORD },
    })
    const ok = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/mfa',
      payload: { mfaToken: fresh.json().mfaToken, code },
    })
    expect(ok.statusCode).toBe(200)
    const replayLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'root@example.com', password: PASSWORD },
    })
    const replay = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/mfa',
      payload: { mfaToken: replayLogin.json().mfaToken, code },
    })
    expect(replay.statusCode).toBe(401)
    expect(replay.json().error.code).toBe('totp_replay')
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
