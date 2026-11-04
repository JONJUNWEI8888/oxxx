import type { FastifyInstance } from 'fastify'
import { Prisma, type AdminRole, type UserStatus } from '@prisma/client'
import { z } from 'zod'
import { writeAudit } from '../audit'
import { requirePermission } from '../auth/guard'
import type { AppConfig } from '../config'
import { blindIndex, decryptString, encryptString } from '../crypto/pii'
import { getPrisma } from '../db'
import { AppError } from '../errors'

const createBody = z.object({
  email: z.string().email().max(320),
  phone: z.string().min(6).max(32).optional(),
})

const listQuery = z.object({
  q: z.string().max(320).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().min(6).max(32).optional(),
  status: z.enum(['active', 'frozen', 'banned']).optional(),
  kycStatus: z.enum(['pending', 'approved', 'rejected', 'none']).optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const reasonBody = z.object({
  reason: z.string().max(500).optional(),
})

const idParams = z.object({ id: z.string().uuid() })

export async function userRoutes(app: FastifyInstance, config: AppConfig) {
  const prisma = getPrisma()

  app.post(
    '/api/v1/users',
    {
      preHandler: requirePermission(config, 'users.create'),
      schema: { tags: ['users'], security: [{ bearerAuth: [] }], body: createBody },
    },
    async (request) => {
      const body = createBody.parse(request.body)
      const email = body.email.trim().toLowerCase()
      const phone = body.phone?.trim() || null
      const emailHash = blindIndex(email, config.piiKey)
      const phoneHash = phone ? blindIndex(phone, config.piiKey) : null
      const clash = await prisma.user.findFirst({
        where: { OR: [{ emailHash }, ...(phoneHash ? [{ phoneHash }] : [])] },
      })
      if (clash) throw new AppError(409, 'user_exists', 'A user with that email or phone already exists')
      const user = await prisma.user.create({
        data: {
          emailCipher: encryptString(email, config.piiKey),
          emailHash,
          phoneCipher: phone ? encryptString(phone, config.piiKey) : null,
          phoneHash,
        },
      })
      await writeAudit(prisma, audit(request, 'user.create', 'user', user.id))
      return presentUser(user, config, request.admin?.role ?? 'support')
    },
  )

  app.get(
    '/api/v1/users',
    {
      preHandler: requirePermission(config, 'users.read'),
      schema: { tags: ['users'], security: [{ bearerAuth: [] }], querystring: listQuery },
    },
    async (request) => {
      const query = listQuery.parse(request.query)
      const kycIds = query.kycStatus ? await userIdsForKycStatus(query.kycStatus) : null
      if (kycIds && kycIds.length === 0) {
        await writeAudit(prisma, audit(request, 'user.list', 'user', null, listAuditMeta(query, 0)))
        return { items: [], page: query.page, pageSize: query.pageSize, total: 0 }
      }
      const where = userListWhere(query, config, kycIds)
      const [total, rows] = await prisma.$transaction([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          include: {
            applications: { orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }], take: 1 },
          },
        }),
      ])
      await writeAudit(prisma, audit(request, 'user.list', 'user', null, listAuditMeta(query, total)))
      return {
        items: rows.map((row) => ({
          ...presentUser(row, config, request.admin?.role ?? 'support'),
          kyc: row.applications[0]
            ? { id: row.applications[0].id, level: row.applications[0].level, status: row.applications[0].status }
            : null,
        })),
        page: query.page,
        pageSize: query.pageSize,
        total,
      }
    },
  )

  app.get(
    '/api/v1/users/:id',
    {
      preHandler: requirePermission(config, 'users.read'),
      schema: { tags: ['users'], security: [{ bearerAuth: [] }], params: idParams },
    },
    async (request) => {
      const { id } = idParams.parse(request.params)
      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) throw new AppError(404, 'not_found', 'User not found')
      const latest = await prisma.kycApplication.findFirst({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
      })
      await writeAudit(prisma, audit(request, 'user.read', 'user', id))
      return {
        ...presentUser(user, config, request.admin?.role ?? 'support'),
        kyc: latest ? { id: latest.id, level: latest.level, status: latest.status } : null,
      }
    },
  )

  app.post(
    '/api/v1/users/:id/freeze',
    {
      preHandler: requirePermission(config, 'users.freeze'),
      schema: { tags: ['users'], security: [{ bearerAuth: [] }], params: idParams, body: reasonBody },
    },
    async (request) => changeStatus(request, config, 'active', 'frozen', 'user.freeze'),
  )

  app.post(
    '/api/v1/users/:id/unfreeze',
    {
      preHandler: requirePermission(config, 'users.unfreeze'),
      schema: { tags: ['users'], security: [{ bearerAuth: [] }], params: idParams, body: reasonBody },
    },
    async (request) => changeStatus(request, config, 'frozen', 'active', 'user.unfreeze'),
  )

  app.post(
    '/api/v1/users/:id/ban',
    {
      preHandler: requirePermission(config, 'users.ban'),
      schema: { tags: ['users'], security: [{ bearerAuth: [] }], params: idParams, body: reasonBody },
    },
    async (request) => {
      const { id } = idParams.parse(request.params)
      const body = reasonBody.parse(request.body ?? {})
      const updated = await prisma.user.updateMany({
        where: { id, status: { in: ['active', 'frozen'] } },
        data: { status: 'banned' },
      })
      if (updated.count !== 1) throw new AppError(409, 'invalid_status', 'User cannot be banned from its current status')
      await writeAudit(prisma, audit(request, 'user.ban', 'user', id, { reason: body.reason ?? null }))
      const user = await prisma.user.findUniqueOrThrow({ where: { id } })
      return presentUser(user, config, request.admin?.role ?? 'support')
    },
  )
}

async function changeStatus(
  request: { params: unknown; body?: unknown; admin: { id: string; role: AdminRole } | null; ip: string; headers: { 'user-agent'?: string | string[] } },
  config: AppConfig,
  from: UserStatus,
  to: UserStatus,
  action: string,
) {
  const { id } = idParams.parse(request.params)
  const body = reasonBody.parse(request.body ?? {})
  const prisma = getPrisma()
  const updated = await prisma.user.updateMany({ where: { id, status: from }, data: { status: to } })
  if (updated.count !== 1) throw new AppError(409, 'invalid_status', `User must be ${from} to become ${to}`)
  await writeAudit(prisma, {
    actorId: request.admin?.id,
    action,
    targetType: 'user',
    targetId: id,
    metadata: { reason: body.reason ?? null },
    ip: request.ip,
    userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
  })
  const user = await prisma.user.findUniqueOrThrow({ where: { id } })
  return presentUser(user, config, request.admin?.role ?? 'support')
}

function presentUser(
  user: { id: string; emailCipher: string; phoneCipher: string | null; status: UserStatus; createdAt: Date; lastLoginAt: Date | null },
  config: AppConfig,
  role: AdminRole,
) {
  const email = decryptString(user.emailCipher, config.piiKey)
  const phone = user.phoneCipher ? decryptString(user.phoneCipher, config.piiKey) : null
  const mask = role === 'support'
  return {
    id: user.id,
    email: mask ? maskEmail(email) : email,
    phone: phone && mask ? maskPhone(phone) : phone,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  }
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!domain) return '***'
  return `${(name ?? '').slice(0, 1)}***@${domain}`
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return '***'
  return `${phone.slice(0, 2)}***${phone.slice(-2)}`
}

function userListWhere(
  query: z.infer<typeof listQuery>,
  config: AppConfig,
  kycIds: string[] | null,
): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = []
  if (query.status) and.push({ status: query.status })
  if (query.createdFrom || query.createdTo) {
    and.push({
      createdAt: {
        ...(query.createdFrom ? { gte: new Date(query.createdFrom) } : {}),
        ...(query.createdTo ? { lte: new Date(query.createdTo) } : {}),
      },
    })
  }
  const searched = searchWhere(query.q, config)
  if (Object.keys(searched).length > 0) and.push(searched)
  if (query.email) and.push({ emailHash: blindIndex(query.email.trim().toLowerCase(), config.piiKey) })
  if (query.phone) and.push({ phoneHash: blindIndex(query.phone.trim(), config.piiKey) })
  if (kycIds) and.push({ id: { in: kycIds } })
  return and.length > 0 ? { AND: and } : {}
}

function listAuditMeta(query: z.infer<typeof listQuery>, total: number) {
  return {
    page: query.page,
    total,
    status: query.status ?? null,
    kycStatus: query.kycStatus ?? null,
    createdFrom: query.createdFrom ?? null,
    createdTo: query.createdTo ?? null,
    search: query.email ? 'email' : query.phone ? 'phone' : query.q ? 'q' : null,
  }
}

async function userIdsForKycStatus(status: 'pending' | 'approved' | 'rejected' | 'none'): Promise<string[]> {
  const rows = await getPrisma().$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT u.id
    FROM users u
    LEFT JOIN LATERAL (
      SELECT status::text AS status
      FROM kyc_applications k
      WHERE k.user_id = u.id
      ORDER BY k.submitted_at DESC, k.created_at DESC
      LIMIT 1
    ) latest ON true
    WHERE ${status === 'none' ? Prisma.sql`latest.status IS NULL` : Prisma.sql`latest.status = ${status}`}
  `)
  return rows.map((row) => row.id)
}

function searchWhere(q: string | undefined, config: AppConfig): Prisma.UserWhereInput {
  if (!q?.trim()) return {}
  const value = q.trim()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return { id: value }
  if (value.includes('@')) return { emailHash: blindIndex(value.toLowerCase(), config.piiKey) }
  return { phoneHash: blindIndex(value, config.piiKey) }
}

function audit(
  request: { admin: { id: string } | null; ip: string; headers: { 'user-agent'?: string | string[] } },
  action: string,
  targetType: string,
  targetId: string | null,
  metadata?: Record<string, unknown>,
) {
  return {
    actorId: request.admin?.id,
    action,
    targetType,
    targetId,
    metadata,
    ip: request.ip,
    userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
  }
}
