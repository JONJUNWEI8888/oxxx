import type { AdminRole } from '@prisma/client'

export const PERMISSIONS = {
  'users.read': ['super_admin', 'kyc_reviewer', 'support'],
  'users.create': ['super_admin'],
  'admins.read': ['super_admin'],
  'admins.invite': ['super_admin'],
  'admins.update': ['super_admin'],
  'users.freeze': ['super_admin', 'support'],
  'users.unfreeze': ['super_admin', 'support'],
  'users.ban': ['super_admin'],
  'kyc.read': ['super_admin', 'kyc_reviewer'],
  'kyc.create': ['super_admin'],
  'kyc.review': ['super_admin', 'kyc_reviewer'],
  'audit.read': ['super_admin', 'kyc_reviewer', 'support'],
  'presale.read': ['super_admin', 'support'],
  'presale.export': ['super_admin', 'support'],
} as const satisfies Record<string, readonly AdminRole[]>

export type Permission = keyof typeof PERMISSIONS

export function roleCan(role: AdminRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly AdminRole[]).includes(role)
}

/** UI hint only. Every route checks the role again on the server. */
export function permissionsFor(role: AdminRole): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((permission) => roleCan(role, permission))
}
