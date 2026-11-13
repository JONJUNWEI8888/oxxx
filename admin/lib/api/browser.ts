import { ApiError, errorFromResponse } from '@/lib/api/errors'
import { readCsrf } from '@/lib/api/parse'
import { assertCanonicalPath, paths } from '@/lib/api/paths'

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  return new ApiError(503, 'backend_unavailable', 'Admin API is unreachable', 5)
}

export function apiBase(): string {
  return (process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '')
}

export async function browserJson<T>(path: string, init?: { method?: string; body?: unknown }, retried = false): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  assertCanonicalPath(path.split('?')[0] ?? path)
  const headers = new Headers({ accept: 'application/json' })
  let body: string | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    headers.set('content-type', 'application/json')
    body = JSON.stringify(init?.body ?? {})
    const csrf = await loadCsrf()
    if (csrf) headers.set('x-csrf-token', csrf)
  }
  let response: Response
  try {
    response = await fetch(`${apiBase()}${path}`, {
      method,
      headers,
      body,
      credentials: 'include',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new ApiError(503, 'backend_unavailable', 'Admin API is unreachable', 5)
  }
  if (response.status === 401 && !retried && canRefresh(path)) {
    if (await refreshSession()) return browserJson<T>(path, init, true)
  }
  if (response.status === 403 && !retried && method !== 'GET') {
    const error = await errorFromResponse(response.clone())
    if (error.code === 'csrf_invalid' && (await loadCsrf())) return browserJson<T>(path, init, true)
    throw error
  }
  if (!response.ok) throw await errorFromResponse(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function downloadCsv(path: string, filename: string): Promise<void> {
  assertCanonicalPath(path.split('?')[0] ?? path)
  const response = await fetch(`${apiBase()}${path}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'text/csv, application/json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw await errorFromResponse(response)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function refreshSession(): Promise<boolean> {
  const csrf = await loadCsrf()
  const headers = new Headers({ accept: 'application/json', 'content-type': 'application/json' })
  if (csrf) headers.set('x-csrf-token', csrf)
  const response = await fetch(`${apiBase()}${paths.refresh}`, {
    method: 'POST',
    headers,
    body: '{}',
    credentials: 'include',
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })
  return response.ok
}

async function loadCsrf(): Promise<string | null> {
  const response = await fetch(`${apiBase()}${paths.csrf}`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) return null
  return readCsrf(await response.json())
}

function canRefresh(path: string): boolean {
  const bare = path.split('?')[0]
  return bare !== paths.login && bare !== paths.mfa && bare !== paths.refresh && bare !== paths.csrf
}
