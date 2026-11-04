export type CacheStatus = 'hit' | 'miss' | 'stale'

type Entry = { value: unknown; freshUntil: number; staleUntil: number }

export type RemoteCache = {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T, ttlSec: number): Promise<void>
}

const memory = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()

export function clearPresaleCache(): void {
  memory.clear()
  inflight.clear()
}

export async function withCache<T>(opts: {
  key: string
  ttlMs: number
  staleMs?: number
  now?: () => number
  loader: () => Promise<T>
  remote?: RemoteCache
}): Promise<{ value: T; cache: CacheStatus }> {
  const now = opts.now ?? Date.now
  const staleMs = opts.staleMs ?? opts.ttlMs
  const current = memory.get(opts.key)
  if (current && current.freshUntil > now()) {
    return { value: current.value as T, cache: 'hit' }
  }

  const pending = inflight.get(opts.key)
  if (pending) return { value: (await pending) as T, cache: 'miss' }

  const run = load(opts.key, opts.ttlMs, staleMs, now, opts.loader, opts.remote, current)
  inflight.set(opts.key, run)
  try {
    return (await run) as { value: T; cache: CacheStatus }
  } finally {
    inflight.delete(opts.key)
  }
}

async function load<T>(
  key: string,
  ttlMs: number,
  staleMs: number,
  now: () => number,
  loader: () => Promise<T>,
  remote: RemoteCache | undefined,
  previous: Entry | undefined,
): Promise<{ value: T; cache: CacheStatus }> {
  if (remote) {
    try {
      const remoteHit = await remote.get<T>(key)
      if (remoteHit !== undefined) {
        memory.set(key, { value: remoteHit, freshUntil: now() + ttlMs, staleUntil: now() + ttlMs + staleMs })
        return { value: remoteHit, cache: 'hit' }
      }
    } catch {
      // Runtime cache is best-effort. The loader and in-memory entry still work.
    }
  }

  try {
    const value = await loader()
    const stamp = now()
    memory.set(key, { value, freshUntil: stamp + ttlMs, staleUntil: stamp + ttlMs + staleMs })
    if (remote) {
      try {
        await remote.set(key, value, Math.max(1, Math.ceil(ttlMs / 1000)))
      } catch {
        // Ignore remote write failures.
      }
    }
    return { value, cache: 'miss' }
  } catch (error) {
    if (previous && previous.staleUntil > now()) {
      return { value: previous.value as T, cache: 'stale' }
    }
    throw error
  }
}

export function vercelRuntimeCache(): RemoteCache {
  return {
    async get<T>(key: string): Promise<T | undefined> {
      const { getCache } = await import('@vercel/functions')
      const cache = getCache({ namespace: 'oxxx-presale' })
      const value = await cache.get(key)
      return (value ?? undefined) as T | undefined
    },
    async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
      const { getCache } = await import('@vercel/functions')
      const cache = getCache({ namespace: 'oxxx-presale' })
      await cache.set(key, value, { ttl: ttlSec, name: key })
    },
  }
}
