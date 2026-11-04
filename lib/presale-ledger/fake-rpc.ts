import type { LogFilter, RpcBlock, RpcClient, RpcLog, RpcTransaction } from './types'

/** In-memory chain used by indexer tests. Not a network client. */
export class FakeRpc implements RpcClient {
  head = 0
  blocks = new Map<number, RpcBlock>()
  logs: RpcLog[] = []
  balances = new Map<string, bigint>()
  logCalls: LogFilter[] = []

  seed(from: number, to: number, timestamp0 = 1_700_000_000) {
    for (let number = from; number <= to; number += 1) {
      this.blocks.set(number, {
        number,
        hash: hashOf(number, 0),
        parentHash: number === 0 ? `0x${'0'.repeat(64)}` : hashOf(number - 1, 0),
        timestamp: timestamp0 + number * 3,
      })
    }
    this.head = to
  }

  /** Replace hashes from `from` upward so stored checkpoints no longer match. */
  reorg(from: number, to: number) {
    for (let number = from; number <= to; number += 1) {
      const current = this.blocks.get(number)
      this.blocks.set(number, {
        number,
        hash: hashOf(number, 1),
        parentHash: current?.parentHash ?? `0x${'0'.repeat(64)}`,
        timestamp: current?.timestamp ?? 1_700_000_000 + number * 3,
      })
    }
  }

  setBalance(block: number, holder: string, amount: bigint) {
    this.balances.set(`${block}:${holder.toLowerCase()}`, amount)
  }

  async blockNumber(): Promise<number> {
    return this.head
  }

  async getBlock(blockNumber: number): Promise<RpcBlock | null> {
    return this.blocks.get(blockNumber) ?? null
  }

  async getTransaction(hash: string): Promise<RpcTransaction | null> {
    const log = this.logs.find((entry) => entry.transactionHash === hash.toLowerCase())
    if (!log) return null
    const block = this.blocks.get(log.blockNumber)
    if (!block) return null
    return { hash: log.transactionHash, blockNumber: log.blockNumber, blockHash: block.hash }
  }

  async getLogs(filter: LogFilter): Promise<RpcLog[]> {
    this.logCalls.push(filter)
    return this.logs.filter((log) => {
      if (log.address.toLowerCase() !== filter.address.toLowerCase()) return false
      if (log.blockNumber < filter.fromBlock || log.blockNumber > filter.toBlock) return false
      const [topic0, topic1, topic2] = filter.topics
      if (topic0 && log.topics[0] !== topic0.toLowerCase()) return false
      if (topic1 && log.topics[1] !== topic1.toLowerCase()) return false
      if (topic2 && log.topics[2] !== topic2.toLowerCase()) return false
      return true
    })
  }

  async getUsdtBalance(_contract: string, holder: string, block: number | 'latest'): Promise<bigint> {
    const key = `${block}:${holder.toLowerCase()}`
    return this.balances.get(key) ?? 0n
  }
}

export function hashOf(block: number, generation: number): string {
  return `0x${generation.toString(16)}${block.toString(16).padStart(63, '0')}`
}
