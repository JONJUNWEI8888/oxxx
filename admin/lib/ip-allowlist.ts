export type AllowRule =
  | { kind: 'exact'; value: string }
  | { kind: 'cidr4'; base: number; mask: number }

/** `null` means the allowlist is off and every client IP is accepted. */
export function parseAllowlist(raw: string | undefined | null): AllowRule[] | null {
  if (!raw?.trim()) return null
  const rules: AllowRule[] = []
  for (const part of raw.split(/[,\s]+/)) {
    if (!part) continue
    const rule = parseRule(part.trim())
    if (!rule) throw new Error(`Invalid ADMIN_IP_ALLOWLIST entry: ${part}`)
    rules.push(rule)
  }
  return rules.length > 0 ? rules : null
}

export function ipAllowed(ip: string | null, rules: AllowRule[] | null): boolean {
  if (!rules) return true
  if (!ip) return false
  const normalized = normalizeIp(ip)
  return rules.some((rule) => matches(normalized, rule))
}

export function clientIpFromHeaders(headers: Headers, platformIp?: string | null): string | null {
  const vercel = firstHop(headers.get('x-vercel-forwarded-for'))
  if (vercel) return vercel
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = firstHop(headers.get('x-forwarded-for'))
  if (forwarded) return forwarded
  const platform = platformIp?.trim()
  return platform || null
}

function parseRule(entry: string): AllowRule | null {
  if (entry.includes('/')) {
    const [base, bitsRaw] = entry.split('/')
    if (!base || bitsRaw == null || entry.split('/').length !== 2) return null
    const bits = Number(bitsRaw)
    const baseInt = ipv4ToInt(base)
    if (baseInt == null || !Number.isInteger(bits) || bits < 0 || bits > 32) return null
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return { kind: 'cidr4', base: baseInt & mask, mask }
  }
  const normalized = normalizeIp(entry)
  if (!normalized) return null
  if (ipv4ToInt(normalized) == null && !normalized.includes(':')) return null
  return { kind: 'exact', value: normalized }
}

function matches(ip: string, rule: AllowRule): boolean {
  if (rule.kind === 'exact') return ip === rule.value
  const value = ipv4ToInt(ip)
  if (value == null) return false
  return (value & rule.mask) === rule.base
}

function normalizeIp(ip: string): string {
  let value = ip.trim().toLowerCase()
  if (value.startsWith('[') && value.endsWith(']')) value = value.slice(1, -1)
  const zone = value.indexOf('%')
  if (zone !== -1) value = value.slice(0, zone)
  if (value.startsWith('::ffff:')) {
    const mapped = value.slice('::ffff:'.length)
    if (ipv4ToInt(mapped) != null) return mapped
  }
  return value
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n > 255) return null
    value = (value << 8) + n
  }
  return value >>> 0
}

function firstHop(value: string | null): string | null {
  if (!value) return null
  const hop = value.split(',')[0]?.trim()
  return hop || null
}
