import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { rawToUsdtNumber } from '../../../lib/presale-ledger/amounts'
import { normalizeAddress } from '../../../lib/presale-ledger/hex'
import { createPrismaPresaleRepo } from '../../../lib/presale-ledger/prisma-repo'
import { writeAudit } from '../audit'
import { requirePermission } from '../auth/guard'
import type { AppConfig } from '../config'
import { getPrisma } from '../db'
import { AppError } from '../errors'
import { requestIp, requestUserAgent } from '../http'
import type { Contribution } from '../../../lib/presale-ledger/types'

const listQuery = z.object({
  address: z.string().optional(),
  txHash: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const exportQuery = z.object({
  address: z.string().optional(),
  txHash: z.string().optional(),
})

export async function presaleRoutes(app: FastifyInstance, config: AppConfig) {
  app.get(
    '/api/v1/presale/subscriptions',
    {
      preHandler: requirePermission(config, 'presale.read'),
      schema: { tags: ['presale'], security: [{ bearerAuth: [] }], querystring: listQuery },
    },
    async (request) => {
      const query = listQuery.parse(request.query)
      const filter = subscriptionFilter(query.address, query.txHash)
      const repo = createPrismaPresaleRepo(getPrisma())
      const page = await repo.listContributions({
        ...filter,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      })
      await writeAudit(getPrisma(), {
        actorId: request.admin?.id,
        action: 'presale.subscriptions.list',
        targetType: 'presale',
        metadata: { page: query.page, total: page.total },
        ip: requestIp(request),
        userAgent: requestUserAgent(request),
      })
      return {
        items: page.rows.map(present),
        page: query.page,
        pageSize: query.pageSize,
        total: page.total,
      }
    },
  )

  app.get(
    '/api/v1/presale/subscriptions.csv',
    {
      preHandler: requirePermission(config, 'presale.export'),
      schema: { tags: ['presale'], security: [{ bearerAuth: [] }], querystring: exportQuery },
    },
    async (request, reply) => {
      const query = exportQuery.parse(request.query)
      const filter = subscriptionFilter(query.address, query.txHash)
      const repo = createPrismaPresaleRepo(getPrisma())
      const page = await repo.listContributions({ ...filter, skip: 0, take: 100_000 })
      if (page.total > 100_000) throw new AppError(400, 'export_too_large', 'Narrow the filter before exporting')
      await writeAudit(getPrisma(), {
        actorId: request.admin?.id,
        action: 'presale.subscriptions.export',
        targetType: 'presale',
        metadata: { total: page.total, address: filter.address ?? null },
        ip: requestIp(request),
        userAgent: requestUserAgent(request),
      })
      return csv(reply, page.rows)
    },
  )
}

function subscriptionFilter(address?: string, txHash?: string) {
  let normalized: string | undefined
  if (address?.trim()) {
    const parsed = normalizeAddress(address)
    if (!parsed) throw new AppError(400, 'invalid_address', 'address must be a 20-byte hex wallet')
    normalized = parsed
  }
  if (txHash && !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new AppError(400, 'invalid_tx', 'txHash must be a 32-byte hex hash')
  }
  return { address: normalized, txHash: txHash?.toLowerCase() }
}

function present(row: Contribution) {
  return {
    txHash: row.txHash,
    logIndex: row.logIndex,
    fromAddress: row.fromAddress,
    toAddress: row.toAddress,
    amount: rawToUsdtNumber(row.amountRaw),
    amountRaw: row.amountRaw.toString(),
    blockNumber: row.blockNumber,
    blockHash: row.blockHash,
    blockTime: row.blockTime.toISOString(),
    confirmations: row.confirmations,
  }
}

function csv(reply: FastifyReply, rows: Contribution[]) {
  const header = 'txHash,logIndex,fromAddress,amount,amountRaw,blockNumber,blockTime,confirmations'
  const lines = rows.map((row) =>
    [
      row.txHash,
      String(row.logIndex),
      row.fromAddress,
      String(rawToUsdtNumber(row.amountRaw)),
      row.amountRaw.toString(),
      String(row.blockNumber),
      row.blockTime.toISOString(),
      String(row.confirmations),
    ].map(csvCell).join(','),
  )
  reply.header('content-type', 'text/csv; charset=utf-8')
  reply.header('content-disposition', 'attachment; filename="presale-subscriptions.csv"')
  return `\uFEFF${header}\n${lines.join('\n')}\n`
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}
