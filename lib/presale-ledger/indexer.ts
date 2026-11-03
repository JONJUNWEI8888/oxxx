import { randomUUID } from 'crypto'
import { CONFIRMATION_DEPTH, TRANSFER_TOPIC } from './constants'
import { decodeTransferLog } from './decode'
import { padAddressTopic } from './hex'
import { isRangeError } from './rpc'
import type { Contribution, LogFilter, PresaleRepository, RpcClient, RpcLog } from './types'

export type PresaleIndexConfig = {
  receivingAddress: string
  usdtContract: string
  /** First block to scan. Null means "start at the current safe head" (no backfill). */
  startBlock: number | null
  confirmationDepth: number
  chunkSize: number
  maxBlocksPerRun: number
  budgetMs: number
  lockTtlMs: number
}

export type IndexBatchResult = {
  skipped: boolean
  reason?: 'locked' | 'chain_too_short'
  caughtUp: boolean
  fromBlock: number | null
  toBlock: number | null
  logs: number
  safeHead: number | null
  head: number | null
  lastScannedBlock: number | null
  revertedFromBlock: number | null
}

const EMPTY: IndexBatchResult = {
  skipped: false,
  caughtUp: false,
  fromBlock: null,
  toBlock: null,
  logs: 0,
  safeHead: null,
  head: null,
  lastScannedBlock: null,
  revertedFromBlock: null,
}

/**
 * Scan USDT Transfer logs into the presale address.
 *
 * Credits only blocks at least `confirmationDepth` (15) behind the head.
 * The cursor and block hashes live in Postgres. A hash mismatch rewinds to the
 * last checkpoint that still matches the canonical chain and deletes ledger
 * rows from the rolled-back blocks. Replays upsert on (txHash, logIndex).
 */
export async function runPresaleIndexBatch(input: {
  repo: PresaleRepository
  rpc: RpcClient
  config: PresaleIndexConfig
  now?: Date
  log?: (message: string, extra?: unknown) => void
}): Promise<IndexBatchResult> {
  const { repo, rpc, config } = input
  const log = input.log ?? (() => {})
  const now = input.now ?? new Date()
  const owner = randomUUID()
  let locked = false

  try {
    let state = await repo.getState()
    if (!state) {
      state = await initializeState(repo, rpc, config)
      log('presale indexer initialized', { startBlock: state.startBlock, cursor: state.lastScannedBlock })
    }

    locked = await repo.tryAcquireLock(owner, now, config.lockTtlMs)
    if (!locked) return { ...EMPTY, skipped: true, reason: 'locked', lastScannedBlock: state.lastScannedBlock }

    state = (await repo.getState()) ?? state
    const head = await rpc.blockNumber()
    if (head < config.confirmationDepth) {
      return { ...EMPTY, skipped: true, reason: 'chain_too_short', head, lastScannedBlock: state.lastScannedBlock }
    }
    const safeHead = head - config.confirmationDepth
    let cursor = state.lastScannedBlock
    let revertedFromBlock: number | null = null

    if (cursor >= 0) {
      const tip = await rpc.getBlock(cursor)
      if (!tip) throw new Error(`Canonical block ${cursor} is missing`)
      if (tip.hash !== state.lastScannedHash) {
        const floor = await findCheckpointFloor(repo, rpc, cursor, state.startBlock)
        const revertFrom = floor + 1
        const floorBlock = floor >= 0 ? await rpc.getBlock(floor) : null
        if (floor >= 0 && !floorBlock) throw new Error(`Cannot load reorg floor block ${floor}`)
        revertedFromBlock = revertFrom
        log('presale reorg detected', { cursor, floor, revertFrom })
        await repo.applyBatch({
          owner,
          expectedLastScannedBlock: cursor,
          revertFromBlock: revertFrom,
          nextCursor: { block: floor, hash: floorBlock?.hash ?? '0x00' },
          contributions: [],
          checkpoints: floorBlock ? [{ blockNumber: floor, blockHash: floorBlock.hash }] : [],
          syncedAt: null,
        })
        cursor = floor
      }
    }

    if (cursor >= safeHead) {
      await repo.updateConfirmations(head)
      await repo.applyBatch({
        owner,
        expectedLastScannedBlock: cursor,
        revertFromBlock: null,
        nextCursor: null,
        contributions: [],
        checkpoints: [],
        syncedAt: now,
      })
      return {
        ...EMPTY,
        caughtUp: true,
        safeHead,
        head,
        lastScannedBlock: cursor,
        revertedFromBlock,
      }
    }

    const scanEnd = Math.min(safeHead, cursor + config.maxBlocksPerRun)
    const started = Date.now()
    let from = cursor + 1
    let scannedTo = cursor
    const contributions: Contribution[] = []
    const checkpoints: { blockNumber: number; blockHash: string }[] = []

    while (from <= scanEnd) {
      if (Date.now() - started > config.budgetMs && scannedTo > cursor) break
      const to = Math.min(from + config.chunkSize - 1, scanEnd)
      const padded = padAddressTopic(config.receivingAddress)
      const inbound = await getLogsResilient(rpc, {
        address: config.usdtContract,
        fromBlock: from,
        toBlock: to,
        topics: [TRANSFER_TOPIC, null, padded],
      })
      const outbound = await getLogsResilient(rpc, {
        address: config.usdtContract,
        fromBlock: from,
        toBlock: to,
        topics: [TRANSFER_TOPIC, padded, null],
      })
      const logs = dedupeLogs([...inbound, ...outbound])
      const needed = new Set<number>([to])
      for (const entry of logs) needed.add(entry.blockNumber)
      const blocks = new Map<number, { hash: string; timestamp: number }>()
      for (const blockNumber of needed) {
        const block = await rpc.getBlock(blockNumber)
        if (!block) throw new Error(`Missing block ${blockNumber} while indexing`)
        blocks.set(blockNumber, block)
      }
      for (const entry of logs) {
        const block = blocks.get(entry.blockNumber)
        if (!block || block.hash !== entry.blockHash) {
          throw new Error(`Log/block hash mismatch at ${entry.blockNumber}`)
        }
        const decoded = decodeTransferLog(entry, config.receivingAddress, config.usdtContract)
        if (!decoded) continue
        const tx = await rpc.getTransaction(decoded.txHash)
        if (!tx || tx.blockHash !== block.hash || tx.blockNumber !== entry.blockNumber) {
          throw new Error(`Transaction block hash mismatch for ${decoded.txHash}`)
        }
        contributions.push({
          ...decoded,
          blockTime: new Date(block.timestamp * 1000),
          confirmations: head - entry.blockNumber,
        })
      }
      for (const [blockNumber, block] of blocks) {
        checkpoints.push({ blockNumber, blockHash: block.hash })
      }
      scannedTo = to
      from = to + 1
    }

    const endCheckpoint = checkpoints.find((checkpoint) => checkpoint.blockNumber === scannedTo)
    if (!endCheckpoint) throw new Error(`Missing checkpoint for block ${scannedTo}`)
    const caughtUp = scannedTo >= safeHead
    await repo.applyBatch({
      owner,
      expectedLastScannedBlock: cursor,
      revertFromBlock: null,
      nextCursor: { block: scannedTo, hash: endCheckpoint.blockHash },
      contributions,
      checkpoints,
      syncedAt: caughtUp ? now : null,
    })
    await repo.updateConfirmations(await rpc.blockNumber())

    return {
      skipped: false,
      caughtUp,
      fromBlock: cursor + 1,
      toBlock: scannedTo,
      logs: contributions.length,
      safeHead,
      head,
      lastScannedBlock: scannedTo,
      revertedFromBlock,
    }
  } finally {
    if (locked) await repo.releaseLock(owner).catch(() => {})
  }
}

function dedupeLogs(logs: RpcLog[]): RpcLog[] {
  const seen = new Set<string>()
  const unique = []
  for (const log of logs) {
    const key = `${log.transactionHash}:${log.logIndex}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(log)
  }
  return unique
}

async function initializeState(repo: PresaleRepository, rpc: RpcClient, config: PresaleIndexConfig) {
  const head = await rpc.blockNumber()
  const safeHead = Math.max(0, head - config.confirmationDepth)
  const startBlock = config.startBlock ?? safeHead
  if (!Number.isInteger(startBlock) || startBlock < 0) throw new Error('Invalid presale start block')
  const cursor = startBlock - 1
  let hash = '0x00'
  let checkpoint: { blockNumber: number; blockHash: string } | null = null
  if (cursor >= 0) {
    const block = await rpc.getBlock(cursor)
    if (!block) throw new Error(`Cannot load start block parent ${cursor}`)
    hash = block.hash
    checkpoint = { blockNumber: cursor, blockHash: hash }
  }
  return repo.createInitialState({
    startBlock,
    lastScannedBlock: cursor,
    lastScannedHash: hash,
    checkpoint,
  })
}

async function findCheckpointFloor(
  repo: PresaleRepository,
  rpc: RpcClient,
  cursor: number,
  startBlock: number,
): Promise<number> {
  const checkpoints = (await repo.listCheckpoints())
    .filter((checkpoint) => checkpoint.blockNumber <= cursor)
    .sort((a, b) => b.blockNumber - a.blockNumber)
  for (const checkpoint of checkpoints) {
    const block = await rpc.getBlock(checkpoint.blockNumber)
    if (block && block.hash === checkpoint.blockHash) {
      return Math.max(checkpoint.blockNumber, startBlock - 1)
    }
  }
  return startBlock - 1
}

async function getLogsResilient(rpc: RpcClient, filter: LogFilter): Promise<RpcLog[]> {
  try {
    return await rpc.getLogs(filter)
  } catch (error) {
    const span = filter.toBlock - filter.fromBlock
    if (span >= 1 && isRangeError(error)) {
      const mid = filter.fromBlock + Math.floor(span / 2)
      const left = await getLogsResilient(rpc, { ...filter, toBlock: mid })
      const right = await getLogsResilient(rpc, { ...filter, fromBlock: mid + 1 })
      return [...left, ...right]
    }
    throw error
  }
}

export function defaultIndexConfig(partial: Pick<PresaleIndexConfig, 'receivingAddress' | 'usdtContract' | 'startBlock'> & Partial<PresaleIndexConfig>): PresaleIndexConfig {
  return {
    confirmationDepth: CONFIRMATION_DEPTH,
    chunkSize: 2000,
    maxBlocksPerRun: 5000,
    budgetMs: 20_000,
    lockTtlMs: 120_000,
    ...partial,
  }
}
