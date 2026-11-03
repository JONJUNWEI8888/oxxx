import { BALANCE_OF_SELECTOR } from './constants'
import { isBytes32, padAddressTopic, parseHexInt, parseQuantity, toHex } from './hex'
import type { LogFilter, RpcBlock, RpcClient, RpcLog } from './types'

type Parsed<T> = { value: T }

export type RpcFetch = (url: string, init: RequestInit) => Promise<Response>

const RANGE_ERROR = /limit|exceed|too many|response size|more than|timeout|header|range|10,?000/i

export class RpcFailoverError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RpcFailoverError'
  }
}

/**
 * JSON-RPC client that fails over to the next BSC node when the HTTP response,
 * the JSON-RPC error object, or the result shape is unusable. It never coerces
 * a bad payload into a number.
 */
export class HttpRpcClient implements RpcClient {
  constructor(
    private readonly urls: string[],
    private readonly fetchImpl: RpcFetch = fetch,
    private readonly timeoutMs = 8000,
  ) {
    if (urls.length === 0) throw new Error('No BSC RPC endpoints configured')
  }

  blockNumber(): Promise<number> {
    return this.call('eth_blockNumber', [], (result) => {
      const value = parseHexInt(result)
      if (value === null) return undefined
      return { value }
    })
  }

  getBlock(blockNumber: number): Promise<RpcBlock | null> {
    return this.call('eth_getBlockByNumber', [toHex(blockNumber), false], (result) => {
      if (result === null) return { value: null }
      const block = parseBlock(result)
      if (!block) return undefined
      return { value: block }
    })
  }

  getLogs(filter: LogFilter): Promise<RpcLog[]> {
    return this.call(
      'eth_getLogs',
      [
        {
          address: filter.address,
          fromBlock: toHex(filter.fromBlock),
          toBlock: toHex(filter.toBlock),
          topics: filter.topics,
        },
      ],
      (result) => {
        const logs = parseLogs(result)
        if (!logs) return undefined
        return { value: logs }
      },
    )
  }

  getUsdtBalance(contract: string, holder: string, block: number | 'latest'): Promise<bigint> {
    const data = BALANCE_OF_SELECTOR + padAddressTopic(holder).slice(2)
    const blockTag = block === 'latest' ? 'latest' : toHex(block)
    return this.call('eth_call', [{ to: contract, data }, blockTag], (result) => {
      const value = parseQuantity(result)
      if (value === null) return undefined
      return { value }
    })
  }

  private async call<T>(
    method: string,
    params: unknown[],
    parse: (result: unknown) => Parsed<T> | undefined,
  ): Promise<T> {
    let last = 'no endpoints'
    for (const url of this.urls) {
      try {
        const res = await this.fetchImpl(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          cache: 'no-store',
          signal: AbortSignal.timeout(this.timeoutMs),
        })
        if (!res.ok) {
          last = `${url} http ${res.status}`
          continue
        }
        let body: unknown
        try {
          body = await res.json()
        } catch {
          last = `${url} invalid json`
          continue
        }
        if (!body || typeof body !== 'object') {
          last = `${url} invalid body`
          continue
        }
        const record = body as { error?: { message?: string }; result?: unknown }
        if (record.error) {
          last = `${url} ${record.error.message ?? 'json-rpc error'}`
          continue
        }
        if (!('result' in record)) {
          last = `${url} missing result`
          continue
        }
        const parsed = parse(record.result)
        if (!parsed) {
          last = `${url} invalid result`
          continue
        }
        return parsed.value
      } catch (error) {
        last = `${url} ${error instanceof Error ? error.message : 'request failed'}`
      }
    }
    const error = new RpcFailoverError(`All BSC RPC endpoints failed: ${last}`)
    if (RANGE_ERROR.test(last)) error.name = 'RpcRangeError'
    throw error
  }
}

function parseBlock(result: unknown): RpcBlock | null {
  if (!result || typeof result !== 'object') return null
  const block = result as Record<string, unknown>
  const number = parseHexInt(block.number)
  const timestamp = parseHexInt(block.timestamp)
  if (number === null || timestamp === null) return null
  if (!isBytes32(block.hash) || !isBytes32(block.parentHash)) return null
  return {
    number,
    timestamp,
    hash: block.hash.toLowerCase(),
    parentHash: block.parentHash.toLowerCase(),
  }
}

function parseLogs(result: unknown): RpcLog[] | null {
  if (!Array.isArray(result)) return null
  const logs: RpcLog[] = []
  for (const item of result) {
    const log = parseLog(item)
    if (!log) return null
    logs.push(log)
  }
  return logs
}

function parseLog(item: unknown): RpcLog | null {
  if (!item || typeof item !== 'object') return null
  const log = item as Record<string, unknown>
  if (typeof log.address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(log.address)) return null
  if (!Array.isArray(log.topics) || log.topics.some((topic) => typeof topic !== 'string' || !/^0x[0-9a-fA-F]*$/.test(topic))) {
    return null
  }
  if (typeof log.data !== 'string' || !/^0x[0-9a-fA-F]*$/.test(log.data)) return null
  const blockNumber = parseHexInt(log.blockNumber)
  const logIndex = parseHexInt(log.logIndex)
  if (blockNumber === null || logIndex === null) return null
  if (!isBytes32(log.blockHash) || !isBytes32(log.transactionHash)) return null
  return {
    address: log.address.toLowerCase(),
    topics: log.topics.map((topic) => topic.toLowerCase()),
    data: log.data.toLowerCase(),
    blockNumber,
    blockHash: log.blockHash.toLowerCase(),
    transactionHash: log.transactionHash.toLowerCase(),
    logIndex,
    removed: log.removed === true,
  }
}

export function isRangeError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'RpcRangeError' || RANGE_ERROR.test(error.message))
}
