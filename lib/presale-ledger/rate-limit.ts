export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }) {
  const hits = new Map<string, number[]>()
  return {
    check(key: string): RateLimitResult {
      const now = (opts.now ?? Date.now)()
      const from = now - opts.windowMs
      const recent = (hits.get(key) ?? []).filter((stamp) => stamp > from)
      if (recent.length >= opts.limit) {
        const retryAfterMs = recent[0] + opts.windowMs - now
        hits.set(key, recent)
        return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
      }
      recent.push(now)
      hits.set(key, recent)
      return { allowed: true, remaining: opts.limit - recent.length, retryAfterSec: 0 }
    },
  }
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const real = headers.get('x-real-ip')?.trim()
  return real || 'unknown'
}
