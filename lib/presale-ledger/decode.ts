import { TRANSFER_TOPIC } from './constants'
import { normalizeAddress, topicToAddress } from './hex'
import type { Contribution, RpcLog } from './types'

export class UndecodableLogError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UndecodableLogError'
  }
}

/**
 * Decode a BEP-20 Transfer into the presale address.
 * Returns null for logs that are structurally valid but irrelevant (removed, zero, other recipient).
 * Throws when a matching Transfer cannot be decoded safely.
 */
export function decodeTransferLog(
  log: RpcLog,
  receivingAddress: string,
  usdtContract: string,
): Omit<Contribution, 'blockTime' | 'confirmations'> | null {
  const receiving = normalizeAddress(receivingAddress)
  const usdt = normalizeAddress(usdtContract)
  if (!receiving || !usdt) throw new UndecodableLogError('bad configured address')
  if (log.removed) return null
  if (log.address !== usdt) return null
  if (log.topics[0] !== TRANSFER_TOPIC) return null

  const from = topicToAddress(log.topics[1])
  const to = topicToAddress(log.topics[2])
  if (!from || !to) throw new UndecodableLogError(`invalid transfer topics in ${log.transactionHash}`)
  if (to !== receiving) return null
  if (!/^0x[0-9a-fA-F]{64}$/.test(log.data)) {
    throw new UndecodableLogError(`invalid transfer amount in ${log.transactionHash}`)
  }
  const amountRaw = BigInt(log.data)
  if (amountRaw === 0n) return null
  return {
    txHash: log.transactionHash,
    logIndex: log.logIndex,
    fromAddress: from,
    toAddress: to,
    amountRaw,
    blockNumber: log.blockNumber,
    blockHash: log.blockHash,
  }
}
