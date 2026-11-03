export type RpcBlock = {
  number: number
  hash: string
  parentHash: string
  timestamp: number
}

export type RpcLog = {
  address: string
  topics: string[]
  data: string
  blockNumber: number
  blockHash: string
  transactionHash: string
  logIndex: number
  removed: boolean
}

export type LogFilter = {
  address: string
  fromBlock: number
  toBlock: number
  topics: Array<string | null>
}

export interface RpcClient {
  blockNumber(): Promise<number>
  getBlock(blockNumber: number): Promise<RpcBlock | null>
  getLogs(filter: LogFilter): Promise<RpcLog[]>
  getUsdtBalance(contract: string, holder: string, block: number | 'latest'): Promise<bigint>
}

export type Contribution = {
  txHash: string
  logIndex: number
  fromAddress: string
  toAddress: string
  amountRaw: bigint
  blockNumber: number
  blockHash: string
  blockTime: Date
  confirmations: number
}

export type IndexerState = {
  startBlock: number
  lastScannedBlock: number
  lastScannedHash: string
  syncedAt: Date | null
  lockOwner: string | null
  lockExpiresAt: Date | null
}

export type Checkpoint = {
  blockNumber: number
  blockHash: string
}

export type ApplyBatchInput = {
  owner: string
  expectedLastScannedBlock: number
  revertFromBlock: number | null
  nextCursor: { block: number; hash: string } | null
  contributions: Contribution[]
  checkpoints: Checkpoint[]
  syncedAt: Date | null | undefined
}

export type ContributionQuery = {
  address?: string
  txHash?: string
  skip: number
  take: number
}

export type Aggregate = {
  totalRaw: bigint
  subscriberCount: number
  latestBlockTime: Date | null
}

export type AddressPage = {
  totalRaw: bigint
  count: number
  rows: Contribution[]
}

export type ReconciliationRow = {
  ledgerRaw: bigint
  openingRaw: bigint
  closingRaw: bigint
  chainDeltaRaw: bigint
  diffRaw: bigint
  matched: boolean
  blockNumber: number
  detail: string | null
  alerted: boolean
}

export interface PresaleRepository {
  getState(): Promise<IndexerState | null>
  createInitialState(input: {
    startBlock: number
    lastScannedBlock: number
    lastScannedHash: string
    checkpoint: Checkpoint | null
  }): Promise<IndexerState>
  tryAcquireLock(owner: string, now: Date, ttlMs: number): Promise<boolean>
  releaseLock(owner: string): Promise<void>
  listCheckpoints(): Promise<Checkpoint[]>
  applyBatch(input: ApplyBatchInput): Promise<void>
  updateConfirmations(head: number): Promise<void>
  sumAmountRawUpTo(blockNumber: number): Promise<bigint>
  aggregate(): Promise<Aggregate>
  contributionsForAddress(address: string, limit: number): Promise<AddressPage>
  listContributions(query: ContributionQuery): Promise<{ total: number; rows: Contribution[] }>
  saveReconciliation(row: ReconciliationRow): Promise<void>
}
