/** Keys from GET /api/v1/auth/me. Hiding a button is not authorization. */
export const PERMISSIONS = [
  'users.read',
  'users.create',
  'users.freeze',
  'users.unfreeze',
  'users.ban',
  'kyc.read',
  'kyc.create',
  'kyc.review',
  'audit.read',
  'presale.read',
  'presale.export',
  'admins.read',
  'admins.invite',
  'admins.update',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export function can(permissions: readonly string[] | undefined, permission: Permission): boolean {
  return Boolean(permissions?.includes(permission))
}
