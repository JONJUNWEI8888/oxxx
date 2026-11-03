import { ipAddress } from '@vercel/functions'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

export type RateLimiter = {
  check(key: string): Promise<RateLimitResult>
}

type Hit = { count: number; resetAt: number }

/**
 * Fixed-window counter. In-memory is only for local dev and tests.
 * Production must use Upstash so limits survive across Vercel instances.
 */
export function createMemoryRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }): RateLimiter {
  const buckets = new Map<string, Hit>()
  return {
    async check(key: string): Promise<RateLimitResult> {
      const now = (opts.now ?? Date.now)()
      const windowStart = Math.floor(now / opts.windowMs) * opts.windowMs
      const current = buckets.get(key)
      const hit = current && current.resetAt === windowStart + opts.windowMs
        ? current
        : { count: 0, resetAt: windowStart + opts.windowMs }
      hit.count += 1
      buckets.set(key, hit)
      const retryAfterSec = Math.max(1, Math.ceil((hit.resetAt - now) / 1000))
      if (hit.count > opts.limit) return { allowed: false, remaining: 0, retryAfterSec }
      return { allowed: true, remaining: opts.limit - hit.count, retryAfterSec: 0 }
    },
  }
}

export type Counter = {
  increment(key: string, windowMs: number): Promise<number>
}

export function createCounterRateLimiter(opts: { limit: number; windowMs: number; counter: Counter }): RateLimiter {
  return {
    async check(key: string): Promise<RateLimitResult> {
      const count = await opts.counter.increment(key, opts.windowMs)
      if (count > opts.limit) {
        return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil(opts.windowMs / 1000)) }
      }
      return { allowed: true, remaining: opts.limit - count, retryAfterSec: 0 }
    },
  }
}

export function createRateLimiterFromEnv(
  env: NodeJS.ProcessEnv,
  opts: { limit: number; windowMs: number },
): RateLimiter {
  const url = env.UPSTASH_REDIS_REST_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) return createCounterRateLimiter({ ...opts, counter: upstashCounter(url, token) })
  if (env.NODE_ENV === 'production') {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production')
  }
  return createMemoryRateLimiter(opts)
}

function upstashCounter(url: string, token: string): Counter {
  let redis: { incr: (key: string) => Promise<number>; pexpire: (key: string, ms: number) => Promise<unknown> } | undefined
  return {
    async increment(key: string, windowMs: number): Promise<number> {
      if (!redis) {
        const { Redis } = await import('@upstash/redis')
        redis = new Redis({ url, token })
      }
      const bucket = Math.floor(Date.now() / windowMs)
      const redisKey = `presale:rl:${key}:${bucket}`
      const count = await redis.incr(redisKey)
      if (count === 1) await redis.pexpire(redisKey, windowMs)
      return count
    },
  }
}

/** @deprecated Use createMemoryRateLimiter. Kept so existing tests can construct a limiter. */
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }): RateLimiter {
  return createMemoryRateLimiter(opts)
}

/**
 * Client address for rate limits.
 * On Vercel, `x-real-ip` is set by the platform. Elsewhere we do not trust
 * forwarding headers, so every local caller shares one bucket.
 */
export function clientIp(request: Request, env: NodeJS.ProcessEnv = process.env): string {
  if (env.VERCEL) {
    const trusted = ipAddress(request)?.trim()
    if (trusted) return trusted
  }
  return 'local'
}
