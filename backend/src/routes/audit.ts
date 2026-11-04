import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { writeAudit } from '../audit'
import { requirePermission } from '../auth/guard'
import type { AppConfig } from '../config'
import { getPrisma } from '../db'
import { requestIp, requestUserAgent } from '../http'

const querySchema = z.object({
  actorId: z.string().uuid().optional(),
  action: z.string().max(80).optional(),
  targetType: z.string().max(40).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function auditRoutes(app: FastifyInstance, config: AppConfig) {
  app.get(
    '/api/v1/audit',
    {
      preHandler: requirePermission(config, 'audit.read'),
      schema: { tags: ['audit'], security: [{ bearerAuth: [] }], querystring: querySchema },
    },
    async (request) => {
      const query = querySchema.parse(request.query)
      const where = {
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.targetType ? { targetType: query.targetType } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      }
      const prisma = getPrisma()
      const [total, rows] = await prisma.$transaction([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          include: { actor: { select: { id: true, email: true, role: true } } },
        }),
      ])
      await writeAudit(prisma, {
        actorId: request.admin?.id,
        action: 'audit.list',
        metadata: { page: query.page, total },
        ip: requestIp(request),
        userAgent: requestUserAgent(request),
      })
      return {
        items: rows.map((row) => ({
          id: row.id,
          action: row.action,
          targetType: row.targetType,
          targetId: row.targetId,
          metadata: row.metadata,
          ip: row.ip,
          createdAt: row.createdAt.toISOString(),
          actor: row.actor ? { id: row.actor.id, email: row.actor.email, role: row.actor.role } : null,
        })),
        page: query.page,
        pageSize: query.pageSize,
        total,
      }
    },
  )
}
