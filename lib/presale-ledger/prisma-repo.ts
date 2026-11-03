import { Prisma, type PrismaClient } from '@prisma/client'
import { INDEXER_STATE_ID } from './constants'
import type {
  AddressPage,
  Aggregate,
  ApplyBatchInput,
  Checkpoint,
  Contribution,
  ContributionQuery,
  IndexerState,
  PresaleRepository,
  ReconciliationRow,
} from './types'

type StateRow = {
  startBlock: number
  lastScannedBlock: number
  lastScannedHash: string
  syncedAt: Date | null
  lockOwner: string | null
  lockExpiresAt: Date | null
}

export function createPrismaPresaleRepo(prisma: PrismaClient): PresaleRepository {
  return {
    async getState() {
      const row = await prisma.presaleIndexerState.findUnique({ where: { id: INDEXER_STATE_ID } })
      return row ? toState(row) : null
    },

    async createInitialState(input) {
      try {
        const row = await prisma.presaleIndexerState.create({
          data: {
            id: INDEXER_STATE_ID,
            startBlock: input.startBlock,
            lastScannedBlock: input.lastScannedBlock,
            lastScannedHash: input.lastScannedHash,
            ...(input.checkpoint
              ? { }
              : {}),
          },
        })
        if (input.checkpoint) {
          await prisma.presaleCheckpoint.upsert({
            where: { blockNumber: input.checkpoint.blockNumber },
            create: input.checkpoint,
            update: { blockHash: input.checkpoint.blockHash },
          })
        }
        return toState(row)
      } catch (error) {
        if (!isUnique(error)) throw error
        const existing = await prisma.presaleIndexerState.findUnique({ where: { id: INDEXER_STATE_ID } })
        if (!existing) throw error
        return toState(existing)
      }
    },

    async tryAcquireLock(owner, now, ttlMs) {
      const expires = new Date(now.getTime() + ttlMs)
      const updated = await prisma.presaleIndexerState.updateMany({
        where: {
          id: INDEXER_STATE_ID,
          OR: [{ lockOwner: null }, { lockExpiresAt: { lt: now } }, { lockOwner: owner }],
        },
        data: { lockOwner: owner, lockExpiresAt: expires },
      })
      return updated.count === 1
    },

    async releaseLock(owner) {
      await prisma.presaleIndexerState.updateMany({
        where: { id: INDEXER_STATE_ID, lockOwner: owner },
        data: { lockOwner: null, lockExpiresAt: null },
      })
    },

    async listCheckpoints() {
      const rows = await prisma.presaleCheckpoint.findMany()
      return rows.map((row) => ({ blockNumber: row.blockNumber, blockHash: row.blockHash }))
    },

    async applyBatch(input) {
      await prisma.$transaction(async (tx) => {
        const state = await tx.presaleIndexerState.findUnique({ where: { id: INDEXER_STATE_ID } })
        if (!state || state.lockOwner !== input.owner) throw new Error('lock lost')
        if (state.lastScannedBlock !== input.expectedLastScannedBlock) throw new Error('cursor mismatch')
        if (input.revertFromBlock !== null) {
          await tx.presaleContribution.deleteMany({ where: { blockNumber: { gte: input.revertFromBlock } } })
          await tx.presaleCheckpoint.deleteMany({ where: { blockNumber: { gte: input.revertFromBlock } } })
        }
        for (const checkpoint of dedupeCheckpoints(input.checkpoints)) {
          await tx.presaleCheckpoint.upsert({
            where: { blockNumber: checkpoint.blockNumber },
            create: checkpoint,
            update: { blockHash: checkpoint.blockHash },
          })
        }
        for (const contribution of input.contributions) {
          const data = contributionData(contribution)
          await tx.presaleContribution.upsert({
            where: { txHash_logIndex: { txHash: contribution.txHash, logIndex: contribution.logIndex } },
            create: data,
            update: data,
          })
        }
        await tx.presaleIndexerState.update({
          where: { id: INDEXER_STATE_ID },
          data: {
            ...(input.nextCursor
              ? { lastScannedBlock: input.nextCursor.block, lastScannedHash: input.nextCursor.hash }
              : {}),
            ...(input.syncedAt !== undefined ? { syncedAt: input.syncedAt } : {}),
          },
        })
      }, { timeout: 30_000, maxWait: 5_000 })
    },

    async updateConfirmations(head) {
      await prisma.$executeRaw`
        UPDATE presale_contributions
        SET confirmations = ${head} - block_number,
            updated_at = NOW()
        WHERE block_number <= ${head}
      `
    },

    async sumAmountRawUpTo(blockNumber) {
      const rows = await prisma.$queryRaw<Array<{ sum: string | null }>>`
        SELECT COALESCE(SUM(amount_raw), 0)::text AS sum
        FROM presale_contributions
        WHERE block_number <= ${blockNumber}
      `
      return asBigint(rows[0]?.sum)
    },

    async aggregate() {
      const rows = await prisma.$queryRaw<
        Array<{ total: string | null; subscribers: number; latest: Date | null }>
      >`
        SELECT
          COALESCE(SUM(amount_raw), 0)::text AS total,
          COUNT(DISTINCT from_address)::int AS subscribers,
          MAX(block_time) AS latest
        FROM presale_contributions
      `
      const row = rows[0]
      return {
        totalRaw: asBigint(row?.total),
        subscriberCount: Number(row?.subscribers ?? 0),
        latestBlockTime: row?.latest ?? null,
      } satisfies Aggregate
    },

    async contributionsForAddress(address, limit) {
      const totals = await prisma.$queryRaw<Array<{ total: string | null; count: number }>>`
        SELECT COALESCE(SUM(amount_raw), 0)::text AS total, COUNT(*)::int AS count
        FROM presale_contributions
        WHERE from_address = ${address}
      `
      const rows = await prisma.presaleContribution.findMany({
        where: { fromAddress: address },
        orderBy: [{ blockNumber: 'desc' }, { logIndex: 'desc' }],
        take: limit,
      })
      return {
        totalRaw: asBigint(totals[0]?.total),
        count: Number(totals[0]?.count ?? 0),
        rows: rows.map(fromRow),
      } satisfies AddressPage
    },

    async listContributions(query) {
      const where = {
        ...(query.address ? { fromAddress: query.address } : {}),
        ...(query.txHash ? { txHash: query.txHash } : {}),
      }
      const [total, rows] = await prisma.$transaction([
        prisma.presaleContribution.count({ where }),
        prisma.presaleContribution.findMany({
          where,
          orderBy: [{ blockNumber: 'desc' }, { logIndex: 'desc' }],
          skip: query.skip,
          take: query.take,
        }),
      ])
      return { total, rows: rows.map(fromRow) }
    },

    async saveReconciliation(row) {
      await prisma.presaleReconciliation.create({
        data: {
          ledgerRaw: row.ledgerRaw.toString(),
          openingRaw: row.openingRaw.toString(),
          closingRaw: row.closingRaw.toString(),
          chainDeltaRaw: row.chainDeltaRaw.toString(),
          diffRaw: row.diffRaw.toString(),
          matched: row.matched,
          blockNumber: row.blockNumber,
          detail: row.detail,
          alerted: row.alerted,
        },
      })
    },
  }
}

function toState(row: StateRow): IndexerState {
  return {
    startBlock: row.startBlock,
    lastScannedBlock: row.lastScannedBlock,
    lastScannedHash: row.lastScannedHash,
    syncedAt: row.syncedAt,
    lockOwner: row.lockOwner,
    lockExpiresAt: row.lockExpiresAt,
  }
}

function contributionData(contribution: Contribution) {
  return {
    txHash: contribution.txHash,
    logIndex: contribution.logIndex,
    fromAddress: contribution.fromAddress,
    toAddress: contribution.toAddress,
    amountRaw: contribution.amountRaw.toString(),
    blockNumber: contribution.blockNumber,
    blockHash: contribution.blockHash,
    blockTime: contribution.blockTime,
    confirmations: contribution.confirmations,
  }
}

function fromRow(row: {
  txHash: string
  logIndex: number
  fromAddress: string
  toAddress: string
  amountRaw: Prisma.Decimal
  blockNumber: number
  blockHash: string
  blockTime: Date
  confirmations: number
}): Contribution {
  return {
    txHash: row.txHash,
    logIndex: row.logIndex,
    fromAddress: row.fromAddress,
    toAddress: row.toAddress,
    amountRaw: asBigint(row.amountRaw),
    blockNumber: row.blockNumber,
    blockHash: row.blockHash,
    blockTime: row.blockTime,
    confirmations: row.confirmations,
  }
}

function dedupeCheckpoints(checkpoints: Checkpoint[]): Checkpoint[] {
  const byBlock = new Map<number, Checkpoint>()
  for (const checkpoint of checkpoints) byBlock.set(checkpoint.blockNumber, checkpoint)
  return [...byBlock.values()]
}

function asBigint(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (value === null || value === undefined) return 0n
  return BigInt(value.toString())
}

function isUnique(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
