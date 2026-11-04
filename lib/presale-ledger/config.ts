import { PRESALE } from '../presale'
import { CONFIRMATION_DEPTH, DEFAULT_RPC_URLS } from './constants'
import type { PresaleIndexConfig } from './indexer'

export function rpcUrlsFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.PRESALE_RPC_URLS
  if (!raw) return [...DEFAULT_RPC_URLS]
  const urls = raw.split(',').map((url) => url.trim()).filter(Boolean)
  if (urls.length === 0) return [...DEFAULT_RPC_URLS]
  return urls
}

export function startBlockFromEnv(env: NodeJS.ProcessEnv = process.env): number | null {
  const raw = env.PRESALE_INDEX_START_BLOCK
  if (raw === undefined || raw.trim() === '') return null
  const start = Number(raw)
  if (!Number.isInteger(start) || start < 0) {
    throw new Error('PRESALE_INDEX_START_BLOCK must be a non-negative integer')
  }
  return start
}

export function indexConfigFromEnv(env: NodeJS.ProcessEnv = process.env): PresaleIndexConfig {
  const chunkSize = positiveInt(env.PRESALE_INDEX_CHUNK_SIZE, 2000)
  const maxBlocksPerRun = positiveInt(env.PRESALE_INDEX_MAX_BLOCKS, 5000)
  const budgetMs = positiveInt(env.PRESALE_INDEX_BUDGET_MS, 20_000)
  return {
    receivingAddress: PRESALE.address,
    usdtContract: PRESALE.usdtContract,
    startBlock: startBlockFromEnv(env),
    confirmationDepth: CONFIRMATION_DEPTH,
    chunkSize,
    maxBlocksPerRun,
    budgetMs,
    lockTtlMs: positiveInt(env.PRESALE_INDEX_LOCK_TTL_MS, 120_000),
  }
}

function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid positive integer: ${raw}`)
  return value
}
