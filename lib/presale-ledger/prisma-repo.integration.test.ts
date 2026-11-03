import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PRESALE } from '../presale'
import { TRANSFER_TOPIC } from './constants'
import { FakeRpc } from './fake-rpc'
import { padAddressTopic, uint256Hex } from './hex'
import { defaultIndexConfig, runPresaleIndexBatch } from './indexer'
import { createPrismaPresaleRepo } from './prisma-repo'

const databaseUrl = process.env.DATABASE_URL ?? ''
const enabled = /\/oxxx_test(\?|$)/.test(databaseUrl)

describe.skipIf(!enabled)('prisma presale repository', () => {
  const prisma = enabled
    ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
    : (null as unknown as PrismaClient)

  beforeAll(async () => {
    execSync('pnpm exec prisma migrate deploy --schema prisma/schema.prisma', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    })
    await prisma.$executeRawUnsafe(`
      TRUNCATE presale_contributions, presale_checkpoints, presale_reconciliations, presale_indexer_state
    `)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('persists credited transfers, ignores a replay, and drops reorged blocks', async () => {
    const chain = new FakeRpc()
    chain.seed(0, 100)
    chain.head = 100
    const tx = `0x${'a'.repeat(64)}`
    chain.logs.push({
      address: PRESALE.usdtContract.toLowerCase(),
      topics: [TRANSFER_TOPIC, padAddressTopic('0xabcabcabcabcabcabcabcabcabcabcabcabcabca'), padAddressTopic(PRESALE.address)],
      data: uint256Hex(10n ** 18n),
      blockNumber: 80,
      blockHash: chain.blocks.get(80)!.hash,
      transactionHash: tx,
      logIndex: 4,
      removed: false,
    })
    const repo = createPrismaPresaleRepo(prisma)
    const config = defaultIndexConfig({
      receivingAddress: PRESALE.address,
      usdtContract: PRESALE.usdtContract,
      startBlock: 70,
      chunkSize: 50,
      maxBlocksPerRun: 50,
    })
    await runPresaleIndexBatch({ repo, rpc: chain, config })
    await runPresaleIndexBatch({ repo, rpc: chain, config })
    const stored = await prisma.presaleContribution.findMany()
    expect(stored).toHaveLength(1)
    expect(stored[0]?.logIndex).toBe(4)
    expect(stored[0]?.amountRaw.toFixed(0)).toBe((10n ** 18n).toString())

    chain.reorg(80, 100)
    chain.logs = []
    await runPresaleIndexBatch({ repo, rpc: chain, config })
    expect(await prisma.presaleContribution.count()).toBe(0)
    const state = await prisma.presaleIndexerState.findFirst()
    expect(state?.lastScannedBlock).toBeGreaterThanOrEqual(80)
  })
})
