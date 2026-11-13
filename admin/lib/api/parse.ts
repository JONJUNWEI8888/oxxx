import type { AdminProfile, AdminRole } from '@/lib/api/types'

const ROLES: readonly AdminRole[] = ['super_admin', 'kyc_reviewer', 'support']

/** Login returns a one-time MFA challenge. Session tokens are never copied out of a body. */
export function readLoginChallenge(body: unknown): { mfaToken: string } {
  const row = asRecord(body)
  const mfaToken = row.mfaToken
  if (row.status !== 'mfa' || typeof mfaToken !== 'string' || mfaToken.length < 20) {
    throw new Error('Login did not return an MFA challenge')
  }
  return { mfaToken }
}

/** Profile fields only. Access and refresh tokens are ignored if a body still contains them. */
export function readProfile(body: unknown): AdminProfile {
  const row = asRecord(body)
  const source = asRecord(row.admin ?? row)
  const role = source.role
  if (typeof source.id !== 'string' || typeof source.email !== 'string' || !isRole(role)) {
    throw new Error('Profile response is incomplete')
  }
  const permissions = Array.isArray(source.permissions)
    ? source.permissions.filter((item): item is string => typeof item === 'string')
    : []
  return { id: source.id, email: source.email, role, permissions }
}

export function readCsrf(body: unknown): string | null {
  const token = asRecord(body).csrfToken
  return typeof token === 'string' && token.length > 0 ? token : null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function isRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ROLES.includes(value as AdminRole)
}
