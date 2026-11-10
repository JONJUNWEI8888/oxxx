const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ADDRESS = /^0x[0-9a-fA-F]{40}$/

/** Documented API paths. Segments are validated and inserted raw, never percent-encoded. */
export const paths = {
  login: '/api/v1/auth/login',
  mfa: '/api/v1/auth/mfa',
  refresh: '/api/v1/auth/refresh',
  logout: '/api/v1/auth/logout',
  me: '/api/v1/auth/me',
  csrf: '/api/v1/auth/csrf',
  inviteStart: '/api/v1/auth/invites/start',
  inviteRedeem: '/api/v1/auth/invites/redeem',
  users: '/api/v1/users',
  kyc: '/api/v1/kyc',
  kycHistory: '/api/v1/kyc/history',
  audit: '/api/v1/audit',
  presaleSummary: '/api/v1/presale/summary',
  presaleSubscribers: '/api/v1/presale/subscribers',
  presaleSubscribersCsv: '/api/v1/presale/subscribers.csv',
  presaleSubscriptions: '/api/v1/presale/subscriptions',
  presaleSubscriptionsCsv: '/api/v1/presale/subscriptions.csv',
  admins: '/api/v1/admin/admins',
  adminInvites: '/api/v1/admin/invites',
} as const

export function userPath(id: string): string {
  return `/api/v1/users/${uuid(id)}`
}

export function userActionPath(id: string, action: 'freeze' | 'unfreeze' | 'ban'): string {
  return `${userPath(id)}/${action}`
}

export function kycPath(id: string): string {
  return `/api/v1/kyc/${uuid(id)}`
}

export function kycActionPath(id: string, action: 'approve' | 'reject'): string {
  return `${kycPath(id)}/${action}`
}

export function subscriberTransfersPath(address: string): string {
  return `/api/v1/presale/subscribers/${wallet(address)}/transfers`
}

export function adminPath(id: string): string {
  return `/api/v1/admin/admins/${uuid(id)}`
}

export function adminDisablePath(id: string): string {
  return `${adminPath(id)}/disable`
}

export function withQuery(path: string, query: Record<string, string | number | boolean | undefined>): string {
  assertCanonicalPath(path)
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '' || value === false) continue
    params.append(key, value === true ? 'true' : String(value))
  }
  const text = params.toString()
  return text ? `${path}?${text}` : path
}

export function assertCanonicalPath(path: string) {
  if (!path.startsWith('/api/v1/') || path.includes('%') || path.includes('?') || path.includes('//')) {
    throw new Error('API path must be canonical and unencoded')
  }
}

function uuid(id: string): string {
  if (!UUID.test(id)) throw new Error('API path id must be a UUID')
  return id
}

function wallet(address: string): string {
  if (!ADDRESS.test(address)) throw new Error('API path address must be a 20-byte hex wallet')
  return address
}
