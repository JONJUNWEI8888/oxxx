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

export class MemoryPresaleRepo implements PresaleRepository {
  state: IndexerState | null = null
  contributions: Contribution[] = []
  checkpoints: Checkpoint[] = []
  reconciliations: ReconciliationRow[] = []

  async getState(): Promise<IndexerState | null> {
    return this.state ? { ...this.state } : null
  }

  async createInitialState(input: {
    startBlock: number
    lastScannedBlock: number
    lastScannedHash: string
    checkpoint: Checkpoint | null
  }): Promise<IndexerState> {
    if (this.state) return { ...this.state }
    this.state = {
      startBlock: input.startBlock,
      lastScannedBlock: input.lastScannedBlock,
      lastScannedHash: input.lastScannedHash,
      syncedAt: null,
      lockOwner: null,
      lockExpiresAt: null,
    }
    if (input.checkpoint) this.upsertCheckpoint(input.checkpoint)
    return { ...this.state }
  }

  async tryAcquireLock(owner: string, now: Date, ttlMs: number): Promise<boolean> {
    if (!this.state) return false
    const locked =
      this.state.lockOwner &&
      this.state.lockOwner !== owner &&
      this.state.lockExpiresAt &&
      this.state.lockExpiresAt > now
    if (locked) return false
    this.state.lockOwner = owner
    this.state.lockExpiresAt = new Date(now.getTime() + ttlMs)
    return true
  }

  async releaseLock(owner: string): Promise<void> {
    if (!this.state || this.state.lockOwner !== owner) return
    this.state.lockOwner = null
    this.state.lockExpiresAt = null
  }

  async listCheckpoints(): Promise<Checkpoint[]> {
    return this.checkpoints.map((checkpoint) => ({ ...checkpoint }))
  }

  async applyBatch(input: ApplyBatchInput): Promise<void> {
    if (!this.state) throw new Error('indexer state missing')
    if (this.state.lockOwner !== input.owner) throw new Error('lock lost')
    if (this.state.lastScannedBlock !== input.expectedLastScannedBlock) throw new Error('cursor mismatch')
    if (input.revertFromBlock !== null) {
      this.contributions = this.contributions.filter((row) => row.blockNumber < input.revertFromBlock!)
      this.checkpoints = this.checkpoints.filter((row) => row.blockNumber < input.revertFromBlock!)
    }
    for (const checkpoint of input.checkpoints) this.upsertCheckpoint(checkpoint)
    for (const contribution of input.contributions) this.upsertContribution(contribution)
    if (input.nextCursor) {
      this.state.lastScannedBlock = input.nextCursor.block
      this.state.lastScannedHash = input.nextCursor.hash
    }
    if (input.syncedAt !== undefined) this.state.syncedAt = input.syncedAt
  }

  async updateConfirmations(head: number): Promise<void> {
    for (const row of this.contributions) {
      if (row.blockNumber <= head) row.confirmations = head - row.blockNumber
    }
  }

  async sumAmountRawUpTo(blockNumber: number): Promise<bigint> {
    return this.contributions
      .filter((row) => row.blockNumber <= blockNumber)
      .reduce((sum, row) => sum + (row.direction === 'outbound' ? -row.amountRaw : row.amountRaw), 0n)
  }

  async aggregate(): Promise<Aggregate> {
    const inbound = this.contributions.filter((row) => row.direction !== 'outbound')
    const addresses = new Set(inbound.map((row) => row.fromAddress))
    const latest = inbound.reduce<Date | null>((max, row) => {
      if (!max || row.blockTime > max) return row.blockTime
      return max
    }, null)
    return {
      totalRaw: inbound.reduce((sum, row) => sum + row.amountRaw, 0n),
      subscriberCount: addresses.size,
      latestBlockTime: latest,
    }
  }

  async contributionsForAddress(address: string, limit: number): Promise<AddressPage> {
    const rows = this.contributions
      .filter((row) => row.fromAddress === address && row.direction !== 'outbound')
      .sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex)
    return {
      totalRaw: rows.reduce((sum, row) => sum + row.amountRaw, 0n),
      count: rows.length,
      rows: rows.slice(0, limit).map((row) => ({ ...row })),
    }
  }

  async listContributions(query: ContributionQuery): Promise<{ total: number; rows: Contribution[] }> {
    let rows = [...this.contributions]
    if (query.address) rows = rows.filter((row) => row.fromAddress === query.address)
    if (query.txHash) rows = rows.filter((row) => row.txHash === query.txHash)
    rows.sort((a, b) => b.blockNumber - a.blockNumber || b.logIndex - a.logIndex)
    return { total: rows.length, rows: rows.slice(query.skip, query.skip + query.take).map((row) => ({ ...row })) }
  }

  async saveReconciliation(row: ReconciliationRow): Promise<void> {
    this.reconciliations.push(row)
  }

  private upsertCheckpoint(checkpoint: Checkpoint) {
    const index = this.checkpoints.findIndex((row) => row.blockNumber === checkpoint.blockNumber)
    if (index === -1) this.checkpoints.push({ ...checkpoint })
    else this.checkpoints[index] = { ...checkpoint }
  }

  private upsertContribution(contribution: Contribution) {
    const index = this.contributions.findIndex(
      (row) => row.txHash === contribution.txHash && row.logIndex === contribution.logIndex,
    )
    if (index === -1) this.contributions.push({ ...contribution, blockTime: new Date(contribution.blockTime) })
    else this.contributions[index] = { ...contribution, blockTime: new Date(contribution.blockTime) }
  }
}
