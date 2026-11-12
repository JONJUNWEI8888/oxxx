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
    expect(list.json().items[0]).toMatchObject({ txHash, logIndex: 2, amount: '2.5', amountRaw: '2500000000000000000', fromAddress: from })

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

  it('returns exactly 1000 USDT for 1e21 base units and keeps fractional USDT digits in JSON and CSV', async () => {
    const app = await appPromise
    await createAdmin('support', 'support@example.com')
    const token = await login(app, 'support@example.com')
    const integerRaw = `1${'0'.repeat(21)}`
    const fractionalRaw = '1234567890123456789012345678901234567890123'
    const fractionalUsdt = '1234567890123456789012345.678901234567890123'
    const roundAddress = `0x${'11'.repeat(20)}`
    const fractionAddress = `0x${'22'.repeat(20)}`
    const roundTx = `0x${'33'.repeat(32)}`
    const fractionTx = `0x${'44'.repeat(32)}`
    await prisma.presaleContribution.createMany({
      data: [
        row(roundAddress, roundTx, integerRaw),
        row(fractionAddress, fractionTx, fractionalRaw),
      ],
    })

    const subscriptions = await app.inject({
      method: 'GET',
      url: '/api/v1/presale/subscriptions',
      headers: auth(token),
    })
    expect(subscriptions.statusCode).toBe(200)
    const byTx = new Map(subscriptions.json().items.map((item: { txHash: string }) => [item.txHash, item]))
    expect(byTx.get(roundTx)).toMatchObject({ amountRaw: integerRaw, amount: '1000' })
    expect(byTx.get(fractionTx)).toMatchObject({ amountRaw: fractionalRaw, amount: fractionalUsdt })

    const subscriptionCsv = await app.inject({
      method: 'GET',
      url: '/api/v1/presale/subscriptions.csv',
      headers: auth(token),
    })
    expect(subscriptionCsv.statusCode).toBe(200)
    expect(subscriptionCsv.body).toContain(integerRaw)
    expect(subscriptionCsv.body).toContain(',1000,')
    expect(subscriptionCsv.body).toContain(fractionalRaw)
    expect(subscriptionCsv.body).toContain(fractionalUsdt)

    const subscribers = await app.inject({
      method: 'GET',
      url: '/api/v1/presale/subscribers',
      headers: auth(token),
    })
    expect(subscribers.statusCode).toBe(200)
    const byAddress = new Map(subscribers.json().items.map((item: { address: string }) => [item.address, item]))
    expect(byAddress.get(roundAddress)).toMatchObject({ totalRaw: integerRaw, totalUsdt: '1000' })
    expect(byAddress.get(fractionAddress)).toMatchObject({ totalRaw: fractionalRaw, totalUsdt: fractionalUsdt })

    const transfers = await app.inject({
      method: 'GET',
      url: `/api/v1/presale/subscribers/${fractionAddress}/transfers`,
      headers: auth(token),
    })
    expect(transfers.statusCode).toBe(200)
    expect(transfers.json().items[0]).toMatchObject({ amountRaw: fractionalRaw, amount: fractionalUsdt })

    const subscriberCsv = await app.inject({
      method: 'GET',
      url: '/api/v1/presale/subscribers.csv',
      headers: auth(token),
    })
    expect(subscriberCsv.statusCode).toBe(200)
    expect(subscriberCsv.body).toContain(`${fractionAddress},${fractionalUsdt},${fractionalRaw}`)
    expect(subscriberCsv.body).toContain(`${roundAddress},1000,${integerRaw}`)
    expect(subscriberCsv.body).not.toContain("'1000")
    expect(subscriptionCsv.body).not.toContain("'1000")
  })

  it('prefixes CSV formula characters on addresses and leaves generated amounts numeric', async () => {
    const app = await appPromise
    await createAdmin('support', 'support@example.com')
    const token = await login(app, 'support@example.com')
    const formula = '=1+1'
    const at = '@SUM(A1)'
    await prisma.presaleContribution.createMany({
      data: [
        row(formula, `0x${'66'.repeat(32)}`, '1000000000000000000'),
        row(at, `0x${'77'.repeat(32)}`, '2000000000000000000'),
      ],
    })
    const csv = await app.inject({
      method: 'GET',
      url: '/api/v1/presale/subscribers.csv',
      headers: auth(token),
    })
    expect(csv.statusCode).toBe(200)
    expect(csv.body).toContain("'=1+1,1,1000000000000000000")
    expect(csv.body).toContain("'@SUM(A1),2,2000000000000000000")
    expect(csv.body).not.toMatch(/(^|\n)=1\+1,/)
    const transfers = await app.inject({
      method: 'GET',
      url: '/api/v1/presale/subscriptions.csv',
      headers: auth(token),
    })
    expect(transfers.body).toContain("'=1+1")
    expect(transfers.body).toContain(',1,1000000000000000000,')
    expect(transfers.body).not.toContain("'1,1000000000000000000")
  })
})

function row(fromAddress: string, txHash: string, amountRaw: string) {
  return {
    txHash,
    logIndex: 0,
    fromAddress,
    toAddress: PRESALE.address.toLowerCase(),
    amountRaw,
    blockNumber: 90,
    blockHash: `0x${'55'.repeat(32)}`,
    blockTime: new Date('2026-11-03T00:00:00.000Z'),
    confirmations: 40,
    direction: 'inbound' as const,
  }
}
