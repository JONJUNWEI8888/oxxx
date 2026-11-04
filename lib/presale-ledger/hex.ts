const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const HEX_BYTES32 = /^0x[0-9a-fA-F]{64}$/
const HEX_QUANTITY = /^0x[0-9a-fA-F]{1,64}$/

export function isAddress(value: string): boolean {
  return HEX_ADDRESS.test(value)
}

export function normalizeAddress(value: string): string | null {
  const trimmed = value.trim()
  if (!HEX_ADDRESS.test(trimmed)) return null
  return trimmed.toLowerCase()
}

export function padAddressTopic(address: string): string {
  const normalized = normalizeAddress(address)
  if (!normalized) throw new Error(`Invalid address ${address}`)
  return `0x${normalized.slice(2).padStart(64, '0')}`
}

export function topicToAddress(topic: string | undefined): string | null {
  if (!topic || !HEX_BYTES32.test(topic)) return null
  const address = `0x${topic.slice(-40)}`
  return normalizeAddress(address)
}

export function parseHexInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && Number.isSafeInteger(value)) {
    return value
  }
  if (typeof value === 'string' && HEX_QUANTITY.test(value)) {
    const parsed = Number(BigInt(value))
    if (!Number.isSafeInteger(parsed)) return null
    return parsed
  }
  return null
}

export function parseQuantity(value: unknown): bigint | null {
  if (typeof value !== 'string' || !HEX_QUANTITY.test(value)) return null
  return BigInt(value)
}

export function isBytes32(value: unknown): value is string {
  return typeof value === 'string' && HEX_BYTES32.test(value)
}

export function toHex(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`Invalid block number ${n}`)
  return `0x${n.toString(16)}`
}

export function uint256Hex(value: bigint): string {
  if (value < 0n) throw new Error('negative uint')
  return `0x${value.toString(16).padStart(64, '0')}`
}
