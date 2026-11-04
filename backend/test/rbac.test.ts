import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { auth, buildTestApp, createAdmin, login, migrate, prisma, resetDb } from './helpers'

describe('rbac', () => {
  const appPromise = buildTestApp()

  beforeAll(migrate)
  beforeEach(resetDb)
  afterAll(async () => {
    await (await appPromise).close()
    await prisma.$disconnect()
  })

  it('lets support freeze accounts and keeps ban and KYC review for the right roles', async () => {
    const app = await appPromise
    await createAdmin('super_admin', 'root@example.com')
    await createAdmin('support', 'support@example.com')
    await createAdmin('kyc_reviewer', 'review@example.com')
    const superToken = await login(app, 'root@example.com')
    const supportToken = await login(app, 'support@example.com')
    const reviewerToken = await login(app, 'review@example.com')

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(superToken),
      payload: { email: 'ada@example.com', phone: '+15551212' },
    })
    expect(created.statusCode).toBe(200)
    const userId = created.json().id as string
    const masked = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${userId}`,
      headers: auth(supportToken),
    })
    expect(masked.json().email).not.toBe('ada@example.com')
    expect(masked.json().email).toMatch(/^\w\*\*\*@example\.com$/)
    expect(masked.json().phone).not.toBe('+15551212')
    const full = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${userId}`,
      headers: auth(superToken),
    })
    expect(full.json().email).toBe('ada@example.com')
    expect(full.json().phone).toBe('+15551212')
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    expect(stored.emailCipher).not.toContain('ada@example.com')
    expect(stored.emailHash).not.toContain('ada')

    const anon = await app.inject({ method: 'GET', url: '/api/v1/users' })
    expect(anon.statusCode).toBe(401)

    const freeze = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${userId}/freeze`,
      headers: auth(supportToken),
      payload: { reason: 'chargeback review' },
    })
    expect(freeze.statusCode).toBe(200)
    expect(freeze.json().status).toBe('frozen')

    const reviewerFreeze = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${userId}/unfreeze`,
      headers: auth(reviewerToken),
      payload: {},
    })
    expect(reviewerFreeze.statusCode).toBe(403)

    const supportBan = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${userId}/ban`,
      headers: auth(supportToken),
      payload: { reason: 'no' },
    })
    expect(supportBan.statusCode).toBe(403)

    const unfreeze = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${userId}/unfreeze`,
      headers: auth(supportToken),
      payload: {},
    })
    expect(unfreeze.json().status).toBe('active')

    const ban = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${userId}/ban`,
      headers: auth(superToken),
      payload: { reason: 'sanctions' },
    })
    expect(ban.statusCode).toBe(200)
    expect(ban.json().status).toBe('banned')

    const kyc = await app.inject({
      method: 'POST',
      url: '/api/v1/kyc',
      headers: auth(superToken),
      payload: {
        userId,
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
    const supportReview = await app.inject({
      method: 'POST',
      url: `/api/v1/kyc/${kyc.json().id}/approve`,
      headers: auth(supportToken),
    })
    expect(supportReview.statusCode).toBe(403)
  })
})
