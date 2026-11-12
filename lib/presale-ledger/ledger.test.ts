import { keccak_256 } from '@noble/hashes/sha3.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { describe, expect, it, vi } from 'vitest'
import { PRESALE } from '../presale'
import { LogAlertChannel, WebhookAlertChannel, createAlertChannel } from './alerts'
import { clearPresaleCache, withCache } from './cache'
import { decimalToIntegerString, rawIntegerToUsdtString } from './amounts'
import { CONFIRMATION_DEPTH, TRANSFER_TOPIC } from './constants'
import { authorizeCron } from './cron-auth'
import { safeCronError } from './cron-http'
import { FakeRpc, hashOf } from './fake-rpc'
import { uint256Hex, padAddressTopic } from './hex'
import { defaultIndexConfig, runPresaleIndexBatch } from './indexer'
import { MemoryPresaleRepo } from './memory-repo'
import { presaleAddressGet, presaleGet } from './public-http'
import {
  createMemoryRateLimiter,
  createRateLimiter,
  createResilientRateLimiter,
  getSharedRateLimiter,
  RateLimitUnavailableError,
} from './rate-limit'
import { runPresaleReconciliation } from './reconcile'
import { HttpRpcClient } from './rpc'
import { buildPresaleResponse } from './snapshot'
import type { RpcLog } from './types'

describe('amount strings', () => {
  it('keeps base-unit integers and fractional USDT out of scientific notation', () => {
    const integerRaw = `1${'0'.repeat(21)}`
    expect(decimalToIntegerString({ toFixed: () => integerRaw })).toBe(integerRaw)
    expect(decimalToIntegerString('1e+21')).toBe(integerRaw)
    expect(rawIntegerToUsdtString(integerRaw)).toBe('1000')
    const fractionalRaw = '1234567890123456789012345678901234567890123'
    expect(rawIntegerToUsdtString(fractionalRaw)).toBe('1234567890123456789012345.678901234567890123')
  })
})

const ALICE = '0x1111111111111111111111111111111111111111'
const BOB = '0x2222222222222222222222222222222222222222'
const UNIT = 10n ** 18n

function config(overrides: Partial<ReturnType<typeof defaultIndexConfig>> = {}) {
  return defaultIndexConfig({
    receivingAddress: PRESALE.address,
    usdtContract: PRESALE.usdtContract,
    startBlock: 70,
    chunkSize: 10,
    maxBlocksPerRun: 5000,
    budgetMs: 20_000,
    ...overrides,
  })
}

function transfer(chain: FakeRpc, input: {
  blockNumber: number
  logIndex: number
  txHash: string
  from: string
  amount: bigint
}): RpcLog {
  const block = chain.blocks.get(input.blockNumber)
  if (!block) throw new Error(`missing block ${input.blockNumber}`)
  return {
    address: PRESALE.usdtContract.toLowerCase(),
    topics: [TRANSFER_TOPIC, padAddressTopic(input.from), padAddressTopic(PRESALE.address)],
    data: uint256Hex(input.amount),
    blockNumber: input.blockNumber,
    blockHash: block.hash,
    transactionHash: input.txHash,
    logIndex: input.logIndex,
    removed: false,
  }
}

describe('transfer topic', () => {
  it('is keccak256 of the canonical Transfer signature', () => {
    const hash = bytesToHex(keccak_256(new TextEncoder().encode('Transfer(address,address,uint256)')))
    expect(`0x${hash}`).toBe(TRANSFER_TOPIC)
  })
})

describe('rpc failover', () => {
  it('skips http errors, json-rpc errors, and invalid results', async () => {
    const good = `0x${(5n * UNIT).toString(16).padStart(64, '0')}`
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('bad-http')) return new Response('nope', { status: 503 })
      if (String(url).includes('bad-rpc')) {
        return Response.json({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'rate limit' } })
      }
      if (String(url).includes('bad-shape')) return Response.json({ jsonrpc: '2.0', id: 1, result: '0x' })
      if (String(url).includes('bad-json')) return new Response('not-json', { status: 200 })
      return Response.json({ jsonrpc: '2.0', id: 1, result: good })
    })
    const rpc = new HttpRpcClient(
      [
        'https://rpc.invalid/bad-http',
        'https://rpc.invalid/bad-rpc',
        'https://rpc.invalid/bad-shape',
        'https://rpc.invalid/bad-json',
        'https://rpc.invalid/good',
      ],
      fetchImpl as unknown as typeof fetch,
    )
    await expect(rpc.getUsdtBalance(PRESALE.usdtContract, PRESALE.address, 10)).resolves.toBe(5n * UNIT)
    expect(fetchImpl).toHaveBeenCalledTimes(5)
  })

  it('rejects a log payload that is not an array instead of inventing transfers', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).includes('bad')) return Response.json({ jsonrpc: '2.0', id: 1, result: { value: '1' } })
      return Response.json({
        jsonrpc: '2.0',
        id: 1,
        result: [
          {
            address: PRESALE.usdtContract,
            topics: ['0xabc'],
            data: '0x01',
            blockNumber: '0x1',
            blockHash: `0x${'ab'.repeat(32)}`,
            transactionHash: `0x${'cd'.repeat(32)}`,
            logIndex: '0x0',
          },
        ],
      })
    })
    const rpc = new HttpRpcClient(
      ['https://rpc.invalid/bad', 'https://rpc.invalid/good'],
      fetchImpl as unknown as typeof fetch,
    )
    const logs = await rpc.getLogs({
      address: PRESALE.usdtContract,
      fromBlock: 1,
      toBlock: 1,
      topics: [TRANSFER_TOPIC, null, null],
    })
    expect(logs).toHaveLength(1)
    expect(logs[0]?.transactionHash).toBe(`0x${'cd'.repeat(32)}`)
  })
})

describe('presale indexer', () => {
  it('credits only transfers with 15 confirmations and resumes the cursor', async () => {
    const chain = new FakeRpc()
    chain.seed(0, 130)
    chain.head = 100
    chain.logs.push(
      transfer(chain, { blockNumber: 80, logIndex: 0, txHash: `0x${'a'.repeat(64)}`, from: ALICE, amount: 10n * UNIT }),
      transfer(chain, { blockNumber: 90, logIndex: 0, txHash: `0x${'b'.repeat(64)}`, from: BOB, amount: 4n * UNIT }),
    )
    const repo = new MemoryPresaleRepo()
    const first = await runPresaleIndexBatch({ repo, rpc: chain, config: config() })
    expect(first.safeHead).toBe(100 - CONFIRMATION_DEPTH)
    expect(first.lastScannedBlock).toBe(85)
    expect(repo.contributions.map((row) => row.blockNumber)).toEqual([80])
    expect(repo.contributions[0]?.confirmations).toBe(20)

    chain.head = 110
    const second = await runPresaleIndexBatch({ repo, rpc: chain, config: config() })
    expect(second.fromBlock).toBe(86)
    expect(second.lastScannedBlock).toBe(95)
    expect(repo.contributions.map((row) => row.fromAddress).sort()).toEqual([ALICE, BOB].sort())
    expect(repo.contributions.find((row) => row.blockNumber === 80)?.confirmations).toBe(30)
  })

  it('is idempotent on (txHash, logIndex) and keeps both logs from one transaction', async () => {
    const chain = new FakeRpc()
    chain.seed(0, 100)
    chain.head = 100
    const tx = `0x${'c'.repeat(64)}`
    chain.logs.push(
      transfer(chain, { blockNumber: 80, logIndex: 0, txHash: tx, from: ALICE, amount: 2n * UNIT }),
      transfer(chain, { blockNumber: 80, logIndex: 1, txHash: tx, from: BOB, amount: 3n * UNIT }),
    )
    const repo = new MemoryPresaleRepo()
    await runPresaleIndexBatch({ repo, rpc: chain, config: config({ maxBlocksPerRun: 20 }) })
    await runPresaleIndexBatch({ repo, rpc: chain, config: config({ maxBlocksPerRun: 20 }) })
    expect(repo.contributions).toHaveLength(2)
    const total = repo.contributions.reduce((sum, row) => sum + row.amountRaw, 0n)
    expect(total).toBe(5n * UNIT)
  })

  it('does not advance the cursor when a log hash disagrees with the block', async () => {
    const chain = new FakeRpc()
    chain.seed(0, 100)
    chain.head = 100
    const log = transfer(chain, {
      blockNumber: 80,
      logIndex: 0,
      txHash: `0x${'d'.repeat(64)}`,
      from: ALICE,
      amount: UNIT,
    })
    log.blockHash = hashOf(80, 9)
    chain.logs.push(log)
    const repo = new MemoryPresaleRepo()
    await expect(runPresaleIndexBatch({ repo, rpc: chain, config: config() })).rejects.toThrow(/hash mismatch/)
    const state = await repo.getState()
    expect(state?.lastScannedBlock).toBe(69)
    expect(repo.contributions).toHaveLength(0)
  })

  it('rewinds rolled-back blocks and replaces their contributions', async () => {
    const chain = new FakeRpc()
    chain.seed(0, 80)
    chain.head = 80
    chain.logs.push(
      transfer(chain, { blockNumber: 60, logIndex: 0, txHash: `0x${'1'.repeat(64)}`, from: ALICE, amount: 7n * UNIT }),
    )
    const repo = new MemoryPresaleRepo()
    await runPresaleIndexBatch({
      repo,
      rpc: chain,
      config: config({ startBlock: 50, chunkSize: 10 }),
    })
    expect(repo.contributions).toHaveLength(1)
    expect((await repo.getState())?.lastScannedBlock).toBe(65)

    chain.reorg(60, 80)
    chain.logs = [
      transfer(chain, { blockNumber: 60, logIndex: 1, txHash: `0x${'2'.repeat(64)}`, from: BOB, amount: 1n * UNIT }),
    ]
    const again = await runPresaleIndexBatch({
      repo,
      rpc: chain,
      config: config({ startBlock: 50, chunkSize: 10 }),
    })
    expect(again.revertedFromBlock).toBe(60)
    expect(repo.contributions.map((row) => row.txHash)).toEqual([`0x${'2'.repeat(64)}`])
    expect((await repo.getState())?.lastScannedHash).toBe(chain.blocks.get(65)?.hash)
  })

  it('splits a log query that the node rejects as too large', async () => {
    const inner = new FakeRpc()
    inner.seed(0, 100)
    inner.head = 100
    inner.logs.push(
      transfer(inner, { blockNumber: 80, logIndex: 0, txHash: `0x${'e'.repeat(64)}`, from: ALICE, amount: UNIT }),
    )
    const rpc: FakeRpc = Object.assign(inner, {
      async getLogs(filter: Parameters<FakeRpc['getLogs']>[0]) {
        if (filter.toBlock - filter.fromBlock > 3) {
          const error = new Error('response size limit exceeded')
          error.name = 'RpcRangeError'
          throw error
        }
        return FakeRpc.prototype.getLogs.call(inner, filter)
      },
    })
    const repo = new MemoryPresaleRepo()
    const result = await runPresaleIndexBatch({
      repo,
      rpc,
      config: config({ chunkSize: 20, maxBlocksPerRun: 20 }),
    })
    expect(result.logs).toBe(1)
    expect(repo.contributions).toHaveLength(1)
    expect(inner.logCalls.some((call) => call.toBlock - call.fromBlock <= 3)).toBe(true)
  })

  it('skips when another run holds the lock', async () => {
    const chain = new FakeRpc()
    chain.seed(0, 100)
    chain.head = 100
    const repo = new MemoryPresaleRepo()
    await runPresaleIndexBatch({ repo, rpc: chain, config: config({ maxBlocksPerRun: 1 }) })
    expect(await repo.tryAcquireLock('other', new Date(), 60_000)).toBe(true)
    const skipped = await runPresaleIndexBatch({ repo, rpc: chain, config: config() })
    expect(skipped.skipped).toBe(true)
    expect(skipped.reason).toBe('locked')
  })
})

describe('reconciliation', () => {
  it('matches the balance delta and alerts when funds leave the address', async () => {
    const chain = new FakeRpc()
    chain.seed(0, 100)
    chain.head = 100
    chain.logs.push(
      transfer(chain, { blockNumber: 80, logIndex: 0, txHash: `0x${'a'.repeat(64)}`, from: ALICE, amount: 10n * UNIT }),
    )
    const repo = new MemoryPresaleRepo()
    await runPresaleIndexBatch({ repo, rpc: chain, config: config() })
    const cursor = (await repo.getState())?.lastScannedBlock
    expect(cursor).toBe(85)
    chain.setBalance(69, PRESALE.address, 2n * UNIT)
    chain.setBalance(85, PRESALE.address, 12n * UNIT)
    const alerts: string[] = []
    const matched = await runPresaleReconciliation({
      repo,
      rpc: chain,
      receivingAddress: PRESALE.address,
      usdtContract: PRESALE.usdtContract,
      alerts: { name: 'test', send: async (alert) => { alerts.push(alert.title) } },
    })
    expect(matched.matched).toBe(true)
    expect(matched.alerted).toBe(false)
    expect(alerts).toHaveLength(0)

    chain.setBalance(85, PRESALE.address, 9n * UNIT)
    const diverged = await runPresaleReconciliation({
      repo,
      rpc: chain,
      receivingAddress: PRESALE.address,
      usdtContract: PRESALE.usdtContract,
      alerts: { name: 'test', send: async () => { alerts.push('sent') } },
    })
    expect(diverged.matched).toBe(false)
    expect(diverged.diffRaw).toBe(-3n * UNIT)
    expect(alerts).toEqual(['sent'])
    expect(repo.reconciliations).toHaveLength(2)
  })

  it('nets outbound transfers into the balance comparison without counting them as raised', async () => {
    const chain = new FakeRpc()
    chain.seed(0, 100)
    chain.head = 100
    chain.logs.push(
      transfer(chain, { blockNumber: 80, logIndex: 0, txHash: `0x${'a'.repeat(64)}`, from: ALICE, amount: 10n * UNIT }),
      {
        address: PRESALE.usdtContract.toLowerCase(),
        topics: [
          TRANSFER_TOPIC,
          padAddressTopic(PRESALE.address),
          padAddressTopic('0x3333333333333333333333333333333333333333'),
        ],
        data: uint256Hex(3n * UNIT),
        blockNumber: 82,
        blockHash: chain.blocks.get(82)!.hash,
        transactionHash: `0x${'9'.repeat(64)}`,
        logIndex: 1,
        removed: false,
      },
    )
    const repo = new MemoryPresaleRepo()
    await runPresaleIndexBatch({ repo, rpc: chain, config: config() })
    expect(repo.contributions.map((row) => row.direction).sort()).toEqual(['inbound', 'outbound'])
    expect((await repo.aggregate()).totalRaw).toBe(10n * UNIT)
    const cursor = (await repo.getState())!.lastScannedBlock
    chain.setBalance(69, PRESALE.address, 0n)
    chain.setBalance(cursor, PRESALE.address, 7n * UNIT)
    const result = await runPresaleReconciliation({
      repo,
      rpc: chain,
      receivingAddress: PRESALE.address,
      usdtContract: PRESALE.usdtContract,
      alerts: { name: 'test', send: async () => { throw new Error('should match') } },
    })
    expect(result.matched).toBe(true)
    expect(result.ledgerRaw).toBe(7n * UNIT)
  })
})

describe('alerts', () => {
  it('logs and posts to a webhook', async () => {
    const lines: string[] = []
    const log = new LogAlertChannel({ error: (line) => lines.push(String(line)), warn: () => {} })
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))
    const hook = new WebhookAlertChannel('https://alerts.example/hook', fetchImpl as unknown as typeof fetch)
    await createAlertChannel({
      PRESALE_ALERT_CHANNELS: 'log,webhook',
      PRESALE_ALERT_WEBHOOK_URL: 'https://alerts.example/hook',
    }, fetchImpl as unknown as typeof fetch).send({ severity: 'critical', title: 'mismatch', message: 'no' })
    await log.send({ severity: 'critical', title: 'direct', message: 'logged' })
    await hook.send({ severity: 'critical', title: 'hook', message: 'posted' })
    expect(lines[0]).toContain('direct')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})

describe('cache and rate limit', () => {
  it('fails closed without Redis in production and falls back only for public queries', async () => {
    const closed = createResilientRateLimiter({
      limit: 2,
      windowMs: 1000,
      policy: 'closed',
      env: { NODE_ENV: 'production' },
    })
    await expect(closed.check('k')).rejects.toBeInstanceOf(RateLimitUnavailableError)
    const missing = createResilientRateLimiter({
      limit: 2,
      windowMs: 1000,
      policy: 'memory',
      env: { NODE_ENV: 'production' },
    })
    await expect(missing.check('k')).rejects.toBeInstanceOf(RateLimitUnavailableError)

    const warnings: string[] = []
    const remote = { limit: async () => { throw new Error('redis down') } }
    const publicLimiter = createResilientRateLimiter({
      limit: 1,
      windowMs: 60_000,
      policy: 'memory',
      remote,
      warn: (message) => warnings.push(message),
    })
    expect((await publicLimiter.check('visitor')).allowed).toBe(true)
    expect((await publicLimiter.check('visitor')).allowed).toBe(false)
    expect(warnings[0]).toMatch(/in-memory/)

    const adminLimiter = createResilientRateLimiter({
      limit: 10,
      windowMs: 60_000,
      policy: 'closed',
      remote,
    })
    await expect(adminLimiter.check('admin')).rejects.toBeInstanceOf(RateLimitUnavailableError)
  })

  it('reuses one shared limiter instance', () => {
    const first = getSharedRateLimiter({ name: 'once-test', limit: 3, windowMs: 1000, policy: 'memory', env: { NODE_ENV: 'test' } })
    const second = getSharedRateLimiter({ name: 'once-test', limit: 3, windowMs: 1000, policy: 'memory', env: { NODE_ENV: 'test' } })
    expect(second).toBe(first)
    expect(createMemoryRateLimiter({ limit: 1, windowMs: 1000 })).not.toBe(first)
  })

  it('serves a fresh value without calling the loader again', async () => {
    clearPresaleCache()
    let now = 1_000
    let calls = 0
    const first = await withCache({
      key: 'k',
      ttlMs: 100,
      now: () => now,
      loader: async () => {
        calls += 1
        return 'a'
      },
    })
    const second = await withCache({ key: 'k', ttlMs: 100, now: () => now, loader: async () => 'b' })
    expect(first.cache).toBe('miss')
    expect(second).toEqual({ value: 'a', cache: 'hit' })
    now = 1_150
    const third = await withCache({
      key: 'k',
      ttlMs: 100,
      staleMs: 50,
      now: () => now,
      loader: async () => {
        throw new Error('down')
      },
    })
    expect(third).toEqual({ value: 'a', cache: 'stale' })
    expect(calls).toBe(1)
  })

  it('throttles a key inside the window', async () => {
    let now = 10_000
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: () => now })
    expect((await limiter.check('ip')).allowed).toBe(true)
    expect((await limiter.check('ip')).allowed).toBe(true)
    const blocked = await limiter.check('ip')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
    now += 1_001
    expect((await limiter.check('ip')).allowed).toBe(true)
  })
})

describe('public presale http', () => {
  it('keeps raised and updatedAt and rate limits abusive clients', async () => {
    const repo = new MemoryPresaleRepo()
    await repo.createInitialState({
      startBlock: 10,
      lastScannedBlock: 20,
      lastScannedHash: `0x${'ab'.repeat(32)}`,
      checkpoint: null,
    })
    repo.state!.syncedAt = new Date('2026-01-01T00:00:00.000Z')
    repo.contributions.push({
      txHash: `0x${'a'.repeat(64)}`,
      logIndex: 0,
      fromAddress: ALICE,
      toAddress: PRESALE.address.toLowerCase(),
      amountRaw: 1500n * UNIT,
      blockNumber: 20,
      blockHash: `0x${'ab'.repeat(32)}`,
      blockTime: new Date('2026-01-01T00:00:00.000Z'),
      confirmations: 40,
      direction: 'inbound',
    })
    clearPresaleCache()
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 })
    const ok = await presaleGet(new Request('http://local/api/presale'), { repo, limiter, remote: undefined })
    expect(ok.status).toBe(200)
    const body = await ok.json()
    expect(body.raised).toBe(1500)
    expect(typeof body.updatedAt).toBe('number')
    expect(body.source).toBe('ledger')
    expect(body.synced).toBe(true)
    expect(body.subscriberCount).toBe(1)
    expect(body.raisedRaw).toBe((1500n * UNIT).toString())
    const limited = await presaleGet(new Request('http://local/api/presale'), { repo, limiter })
    expect(limited.status).toBe(429)

    const lookup = await presaleAddressGet(
      new Request('http://local/api/presale/subscribers/x'),
      ALICE,
      { repo, addressLimiter: createRateLimiter({ limit: 5, windowMs: 60_000 }) },
    )
    expect(lookup.status).toBe(200)
    const addressBody = await lookup.json()
    expect(addressBody.total).toBe(1500)
    expect(addressBody.contributionCount).toBe(1)
    const invalid = await presaleAddressGet(new Request('http://local/api/presale'), 'nope', { repo })
    expect(invalid.status).toBe(400)
  })

  it('builds a zero snapshot before the indexer has run', () => {
    const body = buildPresaleResponse({
      state: null,
      aggregate: { totalRaw: 0n, subscriberCount: 0, latestBlockTime: null },
      updatedAt: 123,
    })
    expect(body.raised).toBe(0)
    expect(body.updatedAt).toBe(123)
    expect(body.ready).toBe(false)
    expect(body.hardCapUsdt).toBe(PRESALE.hardCapUsdt)
  })
})

describe('cron auth', () => {
  it('requires the bearer secret in production and allows local dev without one', () => {
    const request = new Request('http://local/api/cron/presale-index', {
      headers: { authorization: 'Bearer secret-1' },
    })
    expect(authorizeCron(request, { NODE_ENV: 'production', CRON_SECRET: 'secret-1' })).toBe(true)
    expect(authorizeCron(request, { NODE_ENV: 'production', CRON_SECRET: 'other' })).toBe(false)
    expect(authorizeCron(new Request('http://local'), { NODE_ENV: 'production' })).toBe(false)
    expect(authorizeCron(new Request('http://local'), { NODE_ENV: 'development' })).toBe(false)
    expect(safeCronError()).toBe('upstream request failed')
    expect(safeCronError()).not.toContain('http')
  })
})
