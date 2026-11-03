import {
  ADDRESS_RATE_LIMIT,
  PRESALE_CACHE_STALE_MS,
  PRESALE_CACHE_TTL_MS,
  PRESALE_RATE_LIMIT,
  PRESALE_RATE_WINDOW_MS,
} from './constants'
import { normalizeAddress } from './hex'
import { buildAddressResponse, buildPresaleResponse, type PresaleAddressResponse, type PresalePublicResponse } from './snapshot'
import { withCache, type RemoteCache } from './cache'
import { clientIpFromHeaders, createRateLimiter, type RateLimitResult } from './rate-limit'
import type { PresaleRepository } from './types'

export type Clock = () => number

export type PublicHttpDeps = {
  repo: PresaleRepository
  limiter?: ReturnType<typeof createRateLimiter>
  addressLimiter?: ReturnType<typeof createRateLimiter>
  remote?: RemoteCache
  now?: Clock
  ttlMs?: number
  staleMs?: number
}

const sharedLimiter = createRateLimiter({ limit: PRESALE_RATE_LIMIT, windowMs: PRESALE_RATE_WINDOW_MS })
const sharedAddressLimiter = createRateLimiter({ limit: ADDRESS_RATE_LIMIT, windowMs: PRESALE_RATE_WINDOW_MS })

export async function presaleGet(request: Request, deps: PublicHttpDeps): Promise<Response> {
  const limiter = deps.limiter ?? sharedLimiter
  const decision = limiter.check(`presale:${clientIpFromHeaders(request.headers)}`)
  if (!decision.allowed) return rateLimited(decision)

  try {
    const { value, cache } = await withCache({
      key: 'presale:snapshot',
      ttlMs: deps.ttlMs ?? PRESALE_CACHE_TTL_MS,
      staleMs: deps.staleMs ?? PRESALE_CACHE_STALE_MS,
      now: deps.now,
      remote: deps.remote,
      loader: () => loadSnapshot(deps.repo, deps.now?.() ?? Date.now()),
    })
    return json(value, 200, cacheHeaders(decision, cache))
  } catch {
    return json({ error: 'Unable to read on-chain balance', code: 'ledger_unavailable' }, 503, {
      'cache-control': 'no-store',
    })
  }
}

export async function presaleAddressGet(
  request: Request,
  addressParam: string,
  deps: PublicHttpDeps,
): Promise<Response> {
  const address = normalizeAddress(addressParam)
  if (!address) return json({ error: 'invalid_address' }, 400, { 'cache-control': 'no-store' })

  const limiter = deps.addressLimiter ?? sharedAddressLimiter
  const decision = limiter.check(`address:${clientIpFromHeaders(request.headers)}`)
  if (!decision.allowed) return rateLimited(decision)

  const limit = addressLimit(request)
  try {
    const { value, cache } = await withCache({
      key: `presale:address:${address}:${limit}`,
      ttlMs: deps.ttlMs ?? PRESALE_CACHE_TTL_MS,
      staleMs: deps.staleMs ?? PRESALE_CACHE_STALE_MS,
      now: deps.now,
      remote: deps.remote,
      loader: async () => {
        const page = await deps.repo.contributionsForAddress(address, limit)
        return buildAddressResponse(address, page, limit)
      },
    })
    return json(value, 200, cacheHeaders(decision, cache))
  } catch {
    return json({ error: 'Unable to read on-chain balance', code: 'ledger_unavailable' }, 503, {
      'cache-control': 'no-store',
    })
  }
}

async function loadSnapshot(repo: PresaleRepository, updatedAt: number): Promise<PresalePublicResponse> {
  const [state, aggregate] = await Promise.all([repo.getState(), repo.aggregate()])
  return buildPresaleResponse({ state, aggregate, updatedAt })
}

function addressLimit(request: Request): number {
  const raw = new URL(request.url).searchParams.get('limit')
  const parsed = raw ? Number(raw) : 50
  if (!Number.isInteger(parsed) || parsed < 1) return 50
  return Math.min(parsed, 100)
}

function rateLimited(decision: RateLimitResult): Response {
  return json({ error: 'rate_limited' }, 429, {
    'cache-control': 'no-store',
    'retry-after': String(decision.retryAfterSec),
    'x-ratelimit-remaining': '0',
  })
}

function cacheHeaders(decision: RateLimitResult, cache: string): Record<string, string> {
  const control = 'public, s-maxage=10, stale-while-revalidate=30'
  return {
    'cache-control': control,
    'vercel-cdn-cache-control': control,
    'x-presale-cache': cache,
    'x-ratelimit-remaining': String(decision.remaining),
  }
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return Response.json(body, { status, headers })
}

export type { PresaleAddressResponse, PresalePublicResponse }
