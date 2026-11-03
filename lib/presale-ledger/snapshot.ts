import { PRESALE } from '../presale'
import { rawToUsdtNumber } from './amounts'
import { BSC_CHAIN_ID, CONFIRMATION_DEPTH, USDT_DECIMALS } from './constants'
import type { AddressPage, Aggregate, Contribution, IndexerState } from './types'

export type PresalePublicResponse = {
  /** USDT amount credited from confirmed inbound transfers. Display-safe number. */
  raised: number
  /** Exact amount in token base units (18 decimals). */
  raisedRaw: string
  decimals: number
  /** Milliseconds timestamp of this response. The homepage chart uses it as the x value. */
  updatedAt: number
  ledgerUpdatedAt: string | null
  hardCapUsdt: number
  priceUsdt: number
  roundSupply: number
  /** raised / hardCap, not capped. */
  progress: number
  /** Same ratio as a 0–100+ percentage, not capped. */
  progressPercent: number
  subscriberCount: number
  receivingAddress: string
  usdtContract: string
  chainId: number
  confirmationThreshold: number
  indexedBlock: number | null
  indexedBlockHash: string | null
  indexedBlockTime: string | null
  startBlock: number | null
  /** True once the cursor has passed the configured start block. */
  ready: boolean
  /** True once a run has reached the safe head. False while backfill is in progress. */
  synced: boolean
  source: 'ledger'
}

export type PresaleAddressContribution = {
  txHash: string
  logIndex: number
  amount: number
  amountRaw: string
  blockNumber: number
  blockHash: string
  blockTime: string
  confirmations: number
}

export type PresaleAddressResponse = {
  address: string
  total: number
  totalRaw: string
  decimals: number
  contributionCount: number
  truncated: boolean
  contributions: PresaleAddressContribution[]
}

export function buildPresaleResponse(input: {
  state: IndexerState | null
  aggregate: Aggregate
  updatedAt?: number
}): PresalePublicResponse {
  const raised = rawToUsdtNumber(input.aggregate.totalRaw)
  const hardCap = PRESALE.hardCapUsdt
  const state = input.state
  const ready = Boolean(state && state.lastScannedBlock >= state.startBlock)
  return {
    raised,
    raisedRaw: input.aggregate.totalRaw.toString(),
    decimals: USDT_DECIMALS,
    updatedAt: input.updatedAt ?? Date.now(),
    ledgerUpdatedAt: input.aggregate.latestBlockTime?.toISOString() ?? null,
    hardCapUsdt: hardCap,
    priceUsdt: PRESALE.priceUsdt,
    roundSupply: PRESALE.roundSupply,
    progress: raised / hardCap,
    progressPercent: (raised / hardCap) * 100,
    subscriberCount: input.aggregate.subscriberCount,
    receivingAddress: PRESALE.address,
    usdtContract: PRESALE.usdtContract,
    chainId: BSC_CHAIN_ID,
    confirmationThreshold: CONFIRMATION_DEPTH,
    indexedBlock: state && state.lastScannedBlock >= 0 ? state.lastScannedBlock : null,
    indexedBlockHash: state?.lastScannedHash ?? null,
    indexedBlockTime: input.aggregate.latestBlockTime?.toISOString() ?? null,
    startBlock: state?.startBlock ?? null,
    ready,
    synced: Boolean(state?.syncedAt),
    source: 'ledger',
  }
}

export function buildAddressResponse(address: string, page: AddressPage, limit: number): PresaleAddressResponse {
  return {
    address,
    total: rawToUsdtNumber(page.totalRaw),
    totalRaw: page.totalRaw.toString(),
    decimals: USDT_DECIMALS,
    contributionCount: page.count,
    truncated: page.count > limit,
    contributions: page.rows.map(toPublicContribution),
  }
}

function toPublicContribution(row: Contribution): PresaleAddressContribution {
  return {
    txHash: row.txHash,
    logIndex: row.logIndex,
    amount: rawToUsdtNumber(row.amountRaw),
    amountRaw: row.amountRaw.toString(),
    blockNumber: row.blockNumber,
    blockHash: row.blockHash,
    blockTime: row.blockTime.toISOString(),
    confirmations: row.confirmations,
  }
}
