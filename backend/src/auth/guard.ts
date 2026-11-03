import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AppConfig } from '../config'
import { verifyToken } from '../crypto/tokens'
import { getPrisma } from '../db'
import { AppError } from '../errors'
import { roleCan, type Permission } from './rbac'

export function requireAdmin(config: AppConfig) {
  return async (request: FastifyRequest) => {
    request.admin = await authenticate(request, config)
  }
}

export function requirePermission(config: AppConfig, permission: Permission) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const admin = await authenticate(request, config)
    if (!roleCan(admin.role, permission)) throw new AppError(403, 'forbidden', 'Insufficient role')
    request.admin = admin
  }
}

async function authenticate(request: FastifyRequest, config: AppConfig) {
  const header = request.headers.authorization
  if (!header || !/^bearer\s+/i.test(header)) {
    throw new AppError(401, 'unauthorized', 'Missing access token')
  }
  let claims
  try {
    claims = await verifyToken(header.replace(/^bearer\s+/i, ''), config)
  } catch {
    throw new AppError(401, 'unauthorized', 'Invalid access token')
  }
  if (claims.scope !== 'access') throw new AppError(401, 'unauthorized', 'Access token required')
  const admin = await getPrisma().adminUser.findUnique({ where: { id: claims.sub } })
  if (!admin || admin.status !== 'active' || admin.tokenVersion !== claims.tv) {
    throw new AppError(401, 'unauthorized', 'Session is no longer valid')
  }
  return { id: admin.id, email: admin.email, role: admin.role }
}

export async function requireSetupToken(request: FastifyRequest, config: AppConfig) {
  const header = request.headers.authorization
  if (!header || !/^bearer\s+/i.test(header)) throw new AppError(401, 'unauthorized', 'Missing setup token')
  try {
    const claims = await verifyToken(header.replace(/^bearer\s+/i, ''), config)
    if (claims.scope !== 'totp_setup') throw new Error('scope')
    return claims
  } catch {
    throw new AppError(401, 'unauthorized', 'Invalid setup token')
  }
}
