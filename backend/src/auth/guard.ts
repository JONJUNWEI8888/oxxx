import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AppConfig } from '../config'
import { verifyToken } from '../crypto/tokens'
import { getPrisma } from '../db'
import { AppError } from '../errors'
import { cookiePolicy, readCookie, readCookieHeader } from '../http/cookies'
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
  const bearer = typeof header === 'string' && /^bearer\s+\S/i.test(header) ? header.replace(/^bearer\s+/i, '').trim() : ''
  if (typeof header === 'string' && !bearer) throw new AppError(401, 'unauthorized', 'Invalid access token')
  const cookieToken = readCookie(readCookieHeader(request), cookiePolicy(config).names.access)
  const token = bearer || cookieToken
  if (!token) throw new AppError(401, 'unauthorized', 'Missing access token')
  let claims
  try {
    claims = await verifyToken(token, config)
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

