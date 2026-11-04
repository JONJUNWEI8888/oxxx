import { Prisma, type AdminRole, type AdminStatus } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { writeAudit } from '../audit'
import { requirePermission } from '../auth/guard'
import type { AppConfig } from '../config'
import { getPrisma } from '../db'
import { AppError } from '../errors'
import { requestIp, requestUserAgent } from '../http'
import { createAdminInvite } from './auth'

const listQuery = z.object({
  role: z.enum(['super_admin', 'kyc_reviewer', 'support']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const inviteBody = z.object({
  email: z.string().email().max(320),
  role: z.enum(['super_admin', 'kyc_reviewer', 'support']),
})

const idParams = z.object({ id: z.string().uuid() })
const roleBody = z.object({ role: z.enum(['super_admin', 'kyc_reviewer', 'support']) })
const reasonBody = z.object({ reason: z.string().max(500).optional() })

export async function adminRoutes(app: FastifyInstance, config: AppConfig) {
  app.get(
    '/api/v1/admin/admins',
    {
      preHandler: requirePermission(config, 'admins.read'),
      schema: { tags: ['admin'], security: [{ bearerAuth: [] }], querystring: listQuery },
    },
    async (request) => {
      const query = listQuery.parse(request.query)
      const where = {
        ...(query.role ? { role: query.role } : {}),
        ...(query.status ? { status: query.status } : {}),
      }
      const prisma = getPrisma()
      const [total, rows] = await prisma.$transaction([
        prisma.adminUser.count({ where }),
        prisma.adminUser.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ])
      await writeAudit(prisma, {
        actorId: request.admin?.id,
        action: 'admin.list',
        targetType: 'admin',
        metadata: { page: query.page, total },
        ip: requestIp(request),
        userAgent: requestUserAgent(request),
      })
      return {
        items: rows.map(presentAdmin),
        page: query.page,
        pageSize: query.pageSize,
        total,
      }
    },
  )

  app.post(
    '/api/v1/admin/invites',
    {
      preHandler: requirePermission(config, 'admins.invite'),
      schema: { tags: ['admin'], security: [{ bearerAuth: [] }, { cookieAuth: [], csrfHeader: [] }], body: inviteBody },
    },
    async (request) => {
      const body = inviteBody.parse(request.body)
      return createAdminInvite(request.admin?.id, body, {
        ip: requestIp(request),
        userAgent: requestUserAgent(request),
      })
    },
  )

  app.patch(
    '/api/v1/admin/admins/:id',
    {
      preHandler: requirePermission(config, 'admins.update'),
      schema: { tags: ['admin'], security: [{ bearerAuth: [] }, { cookieAuth: [], csrfHeader: [] }], params: idParams, body: roleBody },
    },
    async (request) => {
      const { id } = idParams.parse(request.params)
      const body = roleBody.parse(request.body)
      const prisma = getPrisma()
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.adminUser.findUnique({ where: { id } })
        if (!current) throw new AppError(404, 'not_found', 'Admin not found')
        if (current.role !== body.role) await assertKeepsSuperAdmin(tx, current, body.role)
        if (current.id === request.admin?.id) throw new AppError(409, 'self_change', 'Cannot change your own role')
        if (current.role === body.role) return { admin: current, changed: false, from: current.role }
        const next = await tx.adminUser.update({
          where: { id },
          data: { role: body.role, tokenVersion: { increment: 1 } },
        })
        await tx.refreshToken.updateMany({
          where: { adminId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        return { admin: next, changed: true, from: current.role }
      })
      if (updated.changed) {
        await writeAudit(prisma, {
          actorId: request.admin?.id,
          action: 'admin.role.update',
          targetType: 'admin',
          targetId: id,
          metadata: { from: updated.from, to: body.role },
          ip: requestIp(request),
          userAgent: requestUserAgent(request),
        })
      }
      return presentAdmin(updated.admin)
    },
  )

  app.post(
    '/api/v1/admin/admins/:id/disable',
    {
      preHandler: requirePermission(config, 'admins.update'),
      schema: {
        tags: ['admin'],
        security: [{ bearerAuth: [] }, { cookieAuth: [], csrfHeader: [] }],
        params: idParams,
        body: reasonBody,
      },
    },
    async (request) => {
      const { id } = idParams.parse(request.params)
      const body = reasonBody.parse(request.body ?? {})
      const prisma = getPrisma()
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.adminUser.findUnique({ where: { id } })
        if (!current) throw new AppError(404, 'not_found', 'Admin not found')
        if (current.status === 'disabled') throw new AppError(409, 'invalid_status', 'Admin is already disabled')
        await assertKeepsSuperAdmin(tx, current, 'disabled')
        if (current.id === request.admin?.id) throw new AppError(409, 'self_change', 'Cannot disable your own account')
        const next = await tx.adminUser.update({
          where: { id },
          data: { status: 'disabled', tokenVersion: { increment: 1 } },
        })
        await tx.refreshToken.updateMany({
          where: { adminId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        return next
      })
      await writeAudit(prisma, {
        actorId: request.admin?.id,
        action: 'admin.disable',
        targetType: 'admin',
        targetId: id,
        metadata: { reason: body.reason ?? null },
        ip: requestIp(request),
        userAgent: requestUserAgent(request),
      })
      return presentAdmin(updated)
    },
  )
}

async function assertKeepsSuperAdmin(
  tx: Prisma.TransactionClient,
  admin: { id: string; role: AdminRole; status: AdminStatus },
  next: AdminRole | 'disabled',
) {
  const removes = admin.role === 'super_admin' && admin.status === 'active' && next !== 'super_admin'
  if (!removes) return
  await tx.$queryRaw`
    SELECT id FROM admin_users
    WHERE role = 'super_admin'::"admin_role"
      AND status = 'active'::"admin_status"
    ORDER BY id
    FOR UPDATE
  `
  const fresh = await tx.adminUser.findUnique({ where: { id: admin.id }, select: { role: true, status: true } })
  if (!fresh || fresh.role !== 'super_admin' || fresh.status !== 'active') return
  const others = await tx.adminUser.count({
    where: { role: 'super_admin', status: 'active', NOT: { id: admin.id } },
  })
  if (others === 0) throw new AppError(409, 'last_super_admin', 'Cannot remove the last active super admin')
}

function presentAdmin(admin: {
  id: string
  email: string
  role: AdminRole
  status: AdminStatus
  totpEnabled: boolean
  createdAt: Date
  lastLoginAt: Date | null
}) {
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    totpEnabled: admin.totpEnabled,
    createdAt: admin.createdAt.toISOString(),
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
  }
}
