import type { FastifyInstance, FastifyRequest } from 'fastify'
import { presaleIndexHttp, presaleReconcileHttp } from '../../../lib/presale-ledger/cron-http'
import { createPrismaPresaleRepo } from '../../../lib/presale-ledger/prisma-repo'
import { writeAudit } from '../audit'
import { getPrisma } from '../db'
import { requestIp } from '../http'

export async function internalRoutes(app: FastifyInstance) {
  app.post('/api/v1/internal/presale/index', { schema: { tags: ['internal'] } }, async (request, reply) => {
    const response = await presaleIndexHttp(toWebRequest(request), { repo: createPrismaPresaleRepo(getPrisma()) })
    if (response.status !== 401) {
      await writeAudit(getPrisma(), {
        action: 'presale.index',
        targetType: 'presale',
        metadata: { status: response.status },
        ip: requestIp(request),
      })
    }
    const body = await response.json()
    return reply.code(response.status).send(body)
  })

  app.post('/api/v1/internal/presale/reconcile', { schema: { tags: ['internal'] } }, async (request, reply) => {
    const response = await presaleReconcileHttp(toWebRequest(request), { repo: createPrismaPresaleRepo(getPrisma()) })
    if (response.status !== 401) {
      await writeAudit(getPrisma(), {
        action: 'presale.reconcile',
        targetType: 'presale',
        metadata: { status: response.status },
        ip: requestIp(request),
      })
    }
    const body = await response.json()
    return reply.code(response.status).send(body)
  })
}

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers()
  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === 'string') headers.set(key, value)
  }
  return new Request('http://internal/cron', { method: 'POST', headers })
}
