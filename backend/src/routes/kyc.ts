import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { writeAudit } from '../audit'
import { requirePermission } from '../auth/guard'
import type { AppConfig } from '../config'
import { decryptString, encryptString } from '../crypto/pii'
import { getPrisma } from '../db'
import { AppError } from '../errors'
import { requestIp, requestUserAgent } from '../http'
import type { ObjectStorage } from '../storage'

const personalSchema = z.object({
  legalName: z.string().min(1).max(120),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  country: z.string().regex(/^[A-Za-z]{2}$/),
  documentType: z.enum(['passport', 'id_card', 'drivers_license']),
  documentNumber: z.string().min(3).max(64),
  address: z.string().max(300).optional(),
})

const createBody = z.object({
  userId: z.string().uuid(),
  level: z.enum(['basic', 'advanced', 'enhanced']),
  personal: personalSchema,
})

const listQuery = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  level: z.enum(['basic', 'advanced', 'enhanced']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const idParams = z.object({ id: z.string().uuid() })
const docParams = z.object({ id: z.string().uuid(), docId: z.string().uuid() })
const rejectBody = z.object({ reason: z.string().trim().min(2).max(500) })
const uploadBody = z.object({
  fileName: z.string().min(1).max(180),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
})

export async function kycRoutes(app: FastifyInstance, config: AppConfig, storage: ObjectStorage) {
  const prisma = getPrisma()

  app.post(
    '/api/v1/kyc',
    {
      preHandler: requirePermission(config, 'kyc.create'),
      schema: { tags: ['kyc'], security: [{ bearerAuth: [] }], body: createBody },
    },
    async (request) => {
      const body = createBody.parse(request.body)
      const user = await prisma.user.findUnique({ where: { id: body.userId } })
      if (!user) throw new AppError(404, 'not_found', 'User not found')
      const application = await prisma.kycApplication.create({
        data: {
          userId: body.userId,
          level: body.level,
          personalCipher: encryptString(JSON.stringify(body.personal), config.piiKey),
        },
      })
      await writeAudit(prisma, meta(request, 'kyc.create', application.id, { userId: body.userId, level: body.level }))
      return summarize(application)
    },
  )

  app.get(
    '/api/v1/kyc',
    {
      preHandler: requirePermission(config, 'kyc.read'),
      schema: { tags: ['kyc'], security: [{ bearerAuth: [] }], querystring: listQuery },
    },
    async (request) => {
      const query = listQuery.parse(request.query)
      const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.level ? { level: query.level } : {}),
      }
      const [total, rows] = await prisma.$transaction([
        prisma.kycApplication.count({ where }),
        prisma.kycApplication.findMany({
          where,
          orderBy: { submittedAt: 'asc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ])
      await writeAudit(prisma, meta(request, 'kyc.list', null, { page: query.page, total }))
      return { items: rows.map(summarize), page: query.page, pageSize: query.pageSize, total }
    },
  )

  app.get(
    '/api/v1/kyc/:id',
    {
      preHandler: requirePermission(config, 'kyc.read'),
      schema: { tags: ['kyc'], security: [{ bearerAuth: [] }], params: idParams },
    },
    async (request) => {
      const { id } = idParams.parse(request.params)
      const application = await prisma.kycApplication.findUnique({
        where: { id },
        include: { documents: true, reviewer: true },
      })
      if (!application) throw new AppError(404, 'not_found', 'KYC application not found')
      await writeAudit(prisma, meta(request, 'kyc.read', id))
      return {
        ...summarize(application),
        personal: JSON.parse(decryptString(application.personalCipher, config.piiKey)),
        reviewer: application.reviewer ? { id: application.reviewer.id, email: application.reviewer.email } : null,
        documents: application.documents.map((doc) => ({
          id: doc.id,
          fileName: doc.fileName,
          contentType: doc.contentType,
          createdAt: doc.createdAt.toISOString(),
        })),
      }
    },
  )

  app.post(
    '/api/v1/kyc/:id/approve',
    {
      preHandler: requirePermission(config, 'kyc.review'),
      schema: { tags: ['kyc'], security: [{ bearerAuth: [] }], params: idParams },
    },
    async (request) => {
      const { id } = idParams.parse(request.params)
      const updated = await prisma.kycApplication.updateMany({
        where: { id, status: 'pending' },
        data: { status: 'approved', reviewerId: request.admin?.id, reviewedAt: new Date(), rejectReason: null },
      })
      if (updated.count !== 1) throw new AppError(409, 'invalid_status', 'Only a pending application can be approved')
      await writeAudit(prisma, meta(request, 'kyc.approve', id))
      const application = await prisma.kycApplication.findUniqueOrThrow({ where: { id } })
      return summarize(application)
    },
  )

  app.post(
    '/api/v1/kyc/:id/reject',
    {
      preHandler: requirePermission(config, 'kyc.review'),
      schema: { tags: ['kyc'], security: [{ bearerAuth: [] }], params: idParams, body: rejectBody },
    },
    async (request) => {
      const { id } = idParams.parse(request.params)
      const body = rejectBody.parse(request.body)
      const updated = await prisma.kycApplication.updateMany({
        where: { id, status: 'pending' },
        data: {
          status: 'rejected',
          reviewerId: request.admin?.id,
          reviewedAt: new Date(),
          rejectReason: body.reason,
        },
      })
      if (updated.count !== 1) throw new AppError(409, 'invalid_status', 'Only a pending application can be rejected')
      await writeAudit(prisma, meta(request, 'kyc.reject', id, { reason: body.reason }))
      const application = await prisma.kycApplication.findUniqueOrThrow({ where: { id } })
      return summarize(application)
    },
  )

  app.post(
    '/api/v1/kyc/:id/documents',
    {
      preHandler: requirePermission(config, 'kyc.create'),
      schema: { tags: ['kyc'], security: [{ bearerAuth: [] }], params: idParams, body: uploadBody },
    },
    async (request) => {
      const { id } = idParams.parse(request.params)
      const body = uploadBody.parse(request.body)
      const application = await prisma.kycApplication.findUnique({ where: { id } })
      if (!application) throw new AppError(404, 'not_found', 'KYC application not found')
      const fileName = body.fileName.split(/[/\\]/).pop()?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'document'
      const document = await prisma.kycDocument.create({
        data: {
          applicationId: id,
          storageKey: 'pending',
          fileName,
          contentType: body.contentType,
        },
      })
      const storageKey = `kyc/${id}/${document.id}`
      await prisma.kycDocument.update({ where: { id: document.id }, data: { storageKey } })
      const upload = await storage.signedUpload({ key: storageKey, contentType: body.contentType, expiresInSec: 300 })
      await writeAudit(prisma, meta(request, 'kyc.document.upload_url', document.id))
      return { documentId: document.id, upload }
    },
  )

  app.get(
    '/api/v1/kyc/:id/documents/:docId/url',
    {
      preHandler: requirePermission(config, 'kyc.read'),
      schema: { tags: ['kyc'], security: [{ bearerAuth: [] }], params: docParams },
    },
    async (request) => {
      const { id, docId } = docParams.parse(request.params)
      const document = await prisma.kycDocument.findFirst({ where: { id: docId, applicationId: id } })
      if (!document) throw new AppError(404, 'not_found', 'Document not found')
      const download = await storage.signedDownload({ key: document.storageKey, expiresInSec: 120 })
      await writeAudit(prisma, meta(request, 'kyc.document.download_url', docId))
      return { documentId: docId, download }
    },
  )
}

function summarize(application: {
  id: string
  userId: string
  level: string
  status: string
  rejectReason: string | null
  submittedAt: Date
  reviewedAt: Date | null
}) {
  return {
    id: application.id,
    userId: application.userId,
    level: application.level,
    status: application.status,
    rejectReason: application.rejectReason,
    submittedAt: application.submittedAt.toISOString(),
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
  }
}

function meta(
  request: { admin: { id: string } | null; ip: string; headers: { 'user-agent'?: string | string[] } },
  action: string,
  targetId: string | null,
  metadata?: Record<string, unknown>,
) {
  return {
    actorId: request.admin?.id,
    action,
    targetType: 'kyc',
    targetId,
    metadata,
    ip: requestIp(request as never),
    userAgent: requestUserAgent(request as never),
  }
}
