import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PRESALE } from '../../lib/presale'
import { auth, buildTestApp, createAdmin, login, migrate, prisma, resetDb } from './helpers'

describe('presale admin', () => {
  const appPromise = buildTestApp()

  beforeAll(migrate)
  beforeEach(resetDb)
  afterAll(async () => {
    await (await appPromise).close()
    await prisma.$disconnect()
  })

  it('lists and exports subscriptions for support, and hides them from KYC reviewers', async () => {
    const app = await appPromise
    await createAdmin('support', 'support@example.com')
    await createAdmin('kyc_reviewer', 'review@example.com')
    const supportToken = await login(app, 'support@example.com')
    const reviewerToken = await login(app, 'review@example.com')
    const from = `0x${'ab'.repeat(20)}`
    const txHash = `0x${'cd'.repeat(32)}`
    await prisma.presaleContribution.create({
      data: {
        txHash,
        logIndex: 2,
        fromAddress: from,
        toAddress: PRESALE.address.toLowerCase(),
        amountRaw: '2500000000000000000',
        blockNumber: 80,
        blockHash: `0x${'11'.repeat(32)}`,
        blockTime: new Date('2026-11-01T00:00:00.000Z'),
        confirmations: 40,
      },
    })

    const denied = await app.inject({
      method: 'GET',
      url: '/api/v1/presale/subscriptions',
      headers: auth(reviewerToken),
    })
    expect(denied.statusCode).toBe(403)

    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/presale/subscriptions?address=${from}`,
      headers: auth(supportToken),
    })
    expect(list.statusCode).toBe(200)
    expect(list.json().total).toBe(1)
    expect(list.json().items[0]).toMatchObject({ txHash, logIndex: 2, amount: 2.5, fromAddress: from })

    const csv = await app.inject({
      method: 'GET',
      url: '/api/v1/presale/subscriptions.csv',
      headers: auth(supportToken),
    })
    expect(csv.statusCode).toBe(200)
    expect(csv.headers['content-type']).toContain('text/csv')
    expect(csv.body).toContain(txHash)
    expect(csv.body).toContain(from)
    const exported = await prisma.auditLog.findFirst({ where: { action: 'presale.subscriptions.export' } })
    expect(exported).toBeTruthy()

    const missing = await app.inject({ method: 'POST', url: '/api/v1/internal/presale/index', payload: {} })
    expect(missing.statusCode).toBe(401)
  })
})
