import { ipAddress } from '@vercel/functions'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

export type RateLimiter = {
  check(key: string): Promise<RateLimitResult>
}

/** Redis could not answer. Admin auth must surface this as HTTP 503. */
export class RateLimitUnavailableError extends Error {
  readonly retryAfterSec: number

  constructor(retryAfterSec = 5) {
    super('rate limiter unavailable')
    this.name = 'RateLimitUnavailableError'
    this.retryAfterSec = retryAfterSec
  }
}

export type DegradePolicy = 'memory' | 'closed'

type Hit = { count: number; resetAt: number }

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

export type RemoteRateLimit = {
  limit(key: string): Promise<{ success: boolean; remaining: number; reset: number }>
}

const sharedLimiters = new Map<string, RateLimiter>()
let sharedRedis: Redis | undefined

/**
 * One limiter per name. Public queries use `memory` (log and serve from the
 * in-memory window if Redis errors). Login, MFA, and invite binding use
 * `closed` (throw RateLimitUnavailableError, never the in-memory window).
 */
export function getSharedRateLimiter(opts: {
  name: string
  limit: number
  windowMs: number
  policy: DegradePolicy
  env?: NodeJS.ProcessEnv
}): RateLimiter {
  const cacheKey = `${opts.name}:${opts.policy}:${opts.limit}:${opts.windowMs}`
  const existing = sharedLimiters.get(cacheKey)
  if (existing) return existing
  const created = createResilientRateLimiter(opts)
  sharedLimiters.set(cacheKey, created)
  return created
}

export function createResilientRateLimiter(opts: {
  name?: string
  limit: number
  windowMs: number
  policy: DegradePolicy
  env?: NodeJS.ProcessEnv
  remote?: RemoteRateLimit
  now?: () => number
  warn?: (message: string) => void
}): RateLimiter {
  const env = opts.env ?? process.env
  const memory = createMemoryRateLimiter({ limit: opts.limit, windowMs: opts.windowMs, now: opts.now })
  const remote = opts.remote ?? remoteFromEnv(env, opts)
  if (!remote) {
    if (env.NODE_ENV === 'production') {
      return {
        async check(): Promise<RateLimitResult> {
          throw new RateLimitUnavailableError()
        },
      }
    }
    return memory
  }

  let warned = false
  const warn = opts.warn ?? ((message: string) => console.warn(message))
  return {
    async check(key: string): Promise<RateLimitResult> {
      try {
        const result = await remote.limit(key)
        warned = false
        const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
        if (!result.success) return { allowed: false, remaining: 0, retryAfterSec }
        return { allowed: true, remaining: result.remaining, retryAfterSec: 0 }
      } catch (error) {
        if (error instanceof RateLimitUnavailableError) throw error
        if (opts.policy === 'closed') throw new RateLimitUnavailableError()
        if (!warned) {
          warned = true
          warn('Upstash rate limit failed; public queries are using the in-memory limiter')
        }
        return memory.check(key)
      }
    },
  }
}

function remoteFromEnv(
  env: NodeJS.ProcessEnv,
  opts: { name?: string; limit: number; windowMs: number },
): RemoteRateLimit | null {
  const url = env.UPSTASH_REDIS_REST_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  if (!sharedRedis) sharedRedis = new Redis({ url, token })
  const seconds = Math.max(1, Math.ceil(opts.windowMs / 1000))
  const ratelimit = new Ratelimit({
    redis: sharedRedis,
    limiter: Ratelimit.slidingWindow(opts.limit, `${seconds} s`),
    prefix: `oxxx:${opts.name ?? 'limit'}`,
    analytics: false,
  })
  return {
    async limit(key: string) {
      const result = await ratelimit.limit(key)
      return { success: result.success, remaining: result.remaining, reset: result.reset }
    },
  }
}

/** @deprecated Prefer createMemoryRateLimiter or getSharedRateLimiter. */
export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number }): RateLimiter {
  return createMemoryRateLimiter(opts)
}

/**
 * Client address for public rate limits.
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
