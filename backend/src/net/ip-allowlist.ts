export type CidrRange = {
  version: 4 | 6
  network: bigint
  prefix: number
}

/** Parse a comma-separated list of IPs and CIDR blocks. An empty string is an empty list. */
export function parseAllowlist(value: string): CidrRange[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseEntry)
}

export function ipInAllowlist(ip: string, ranges: readonly CidrRange[]): boolean {
  const normalized = normalizeIp(ip)
  if (!normalized) return false
  return ranges.some((range) => matches(normalized, range))
}

const RESTRICTED_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/admin',
  '/api/v1/users',
  '/api/v1/kyc',
  '/api/v1/audit',
  '/api/v1/presale',
  '/api/v1/storage',
]

/** Admin console and auth routes. Cron (`/api/v1/internal`) stays off this list. */
export function isAdminNetworkRoute(url: string): boolean {
  const path = url.split('?')[0] ?? url
  return RESTRICTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

export function isNoIndexRoute(url: string): boolean {
  const path = url.split('?')[0] ?? url
  return path.startsWith('/api/') || path === '/docs' || path.startsWith('/docs/')
}

type ParsedIp = { version: 4 | 6; value: bigint }

export function normalizeIp(ip: string): ParsedIp | null {
  let value = ip.trim()
  if (!value) return null
  const zone = value.indexOf('%')
  if (zone >= 0) value = value.slice(0, zone)
  if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1)
  if (value.toLowerCase().startsWith('::ffff:')) {
    const mapped = value.slice('::ffff:'.length)
    if (mapped.includes('.')) {
      const v4 = parseV4(mapped)
      if (v4) return v4
    }
  }
  if (value.includes('.')) return parseV4(value)
  if (value.includes(':')) return parseV6(value)
  return null
}

function parseEntry(entry: string): CidrRange {
  const slash = entry.indexOf('/')
  const host = slash === -1 ? entry : entry.slice(0, slash)
  const prefixRaw = slash === -1 ? undefined : entry.slice(slash + 1)
  if (!host || (prefixRaw !== undefined && (prefixRaw.includes('/') || prefixRaw === ''))) {
    throw new Error(`ADMIN_IP_ALLOWLIST entry is invalid: ${entry}`)
  }
  const parsed = normalizeIp(host)
  if (!parsed) throw new Error(`ADMIN_IP_ALLOWLIST entry is invalid: ${entry}`)
  const max = parsed.version === 4 ? 32 : 128
  const prefix = prefixRaw === undefined ? max : Number(prefixRaw)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > max) {
    throw new Error(`ADMIN_IP_ALLOWLIST prefix is invalid: ${entry}`)
  }
  return { version: parsed.version, network: parsed.value & mask(parsed.version, prefix), prefix }
}

function matches(ip: ParsedIp, range: CidrRange): boolean {
  if (ip.version !== range.version) return false
  return (ip.value & mask(ip.version, range.prefix)) === range.network
}

function mask(version: 4 | 6, prefix: number): bigint {
  if (prefix === 0) return 0n
  const max = version === 4 ? 32 : 128
  return ((1n << BigInt(prefix)) - 1n) << BigInt(max - prefix)
}

function parseV4(value: string): ParsedIp | null {
  const parts = value.split('.')
  if (parts.length !== 4) return null
  let out = 0n
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n > 255) return null
    out = (out << 8n) + BigInt(n)
  }
  return { version: 4, value: out }
}

function parseV6(value: string): ParsedIp | null {
  let text = value
  if (text.includes('.')) {
    const lastColon = text.lastIndexOf(':')
    const v4 = parseV4(text.slice(lastColon + 1))
    if (!v4 || lastColon < 0) return null
    const hi = ((v4.value >> 16n) & 0xffffn).toString(16)
    const lo = (v4.value & 0xffffn).toString(16)
    text = `${text.slice(0, lastColon)}:${hi}:${lo}`
  }
  const halves = text.split('::')
  if (halves.length > 2) return null
  const left = splitGroups(halves[0] ?? '')
  const right = halves.length === 2 ? splitGroups(halves[1] ?? '') : []
  if (!left || !right) return null
  if (halves.length === 1) {
    if (left.length !== 8) return null
    return groupsToIp(left)
  }
  const missing = 8 - left.length - right.length
  if (missing < 1) return null
  return groupsToIp([...left, ...Array.from({ length: missing }, () => '0'), ...right])
}

function splitGroups(value: string): string[] | null {
  if (!value) return []
  const parts = value.split(':')
  if (parts.some((part) => !isGroup(part))) return null
  return parts
}

function groupsToIp(groups: string[]): ParsedIp {
  let out = 0n
  for (const group of groups) out = (out << 16n) + BigInt(Number.parseInt(group, 16))
  return { version: 6, value: out }
}

function isGroup(value: string): boolean {
  return /^[0-9a-fA-F]{1,4}$/.test(value)
}
