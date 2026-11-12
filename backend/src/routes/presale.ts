import { Readable } from 'node:stream'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { decimalToIntegerString, rawIntegerToUsdtString } from '../../../lib/presale-ledger/amounts'
import { CONFIRMATION_DEPTH } from '../../../lib/presale-ledger/constants'
import { normalizeAddress } from '../../../lib/presale-ledger/hex'
import { writeAudit } from '../audit'
import { requirePermission } from '../auth/guard'
import type { AppConfig } from '../config'
import { getPrisma } from '../db'
import { AppError } from '../errors'
import { requestIp, requestUserAgent } from '../http'
import { csvCell } from '../csv'
import { listSubscribers, PRESALE_EXPORT_LIMIT, presaleSummary } from '../presale/queries'

const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  includePending: z.enum(['true', 'false']).optional(),
}

const listQuery = z.object({
  address: z.string().optional(),
  txHash: z.string().optional(),
  ...pageQuery,
})

const exportQuery = z.object({
  address: z.string().optional(),
  txHash: z.string().optional(),
  includePending: z.enum(['true', 'false']).optional(),
})

const subscriberQuery = z.object({
  address: z.string().optional(),
  ...pageQuery,
})

const addressParams = z.object({ address: z.string().min(1) })

export async function presaleRoutes(app: FastifyInstance, config: AppConfig) {
  app.get(
    '/api/v1/presale/summary',
    {
      preHandler: requirePermission(config, 'presale.read'),
      schema: { tags: ['presale'], security: [{ bearerAuth: [] }] },
    },
    async (request) => {
      const summary = await presaleSummary(getPrisma())
      await audit(request, 'presale.summary', {
        txCount: summary.confirmed.txCount,
        pendingTxCount: summary.pending.txCount,
      })
      return summary
    },
  )

  app.get(
    '/api/v1/presale/subscribers',
    {
      preHandler: requirePermission(config, 'presale.read'),
      schema: { tags: ['presale'], security: [{ bearerAuth: [] }], querystring: subscriberQuery },
    },
    async (request) => {
      const query = subscriberQuery.parse(request.query)
      const address = optionalAddress(query.address)
      const page = await listSubscribers(getPrisma(), {
        address,
        includePending: query.includePending === 'true',
        page: query.page,
        pageSize: query.pageSize,
      })
      await audit(request, 'presale.subscribers.list', { page: query.page, total: page.total })
      return { items: page.items, page: query.page, pageSize: query.pageSize, total: page.total }
    },
  )

  app.get(
    '/api/v1/presale/subscribers.csv',
    {
      preHandler: requirePermission(config, 'presale.export'),
      schema: { tags: ['presale'], security: [{ bearerAuth: [] }], querystring: exportQuery },
    },
    async (request, reply) => {
      const query = exportQuery.parse(request.query)
      const address = optionalAddress(query.address)
      const includePending = query.includePending === 'true'
      const counted = await listSubscribers(getPrisma(), { address, includePending, page: 1, pageSize: 1 })
      if (counted.total > PRESALE_EXPORT_LIMIT) {
        throw new AppError(400, 'export_too_large', 'Narrow the filter before exporting')
      }
      await audit(request, 'presale.subscribers.export', { total: counted.total, address: address ?? null })
      const header = 'address,totalUsdt,totalRaw,txCount,firstTransferAt,lastTransferAt,pendingTxCount,pendingUsdt,pendingRaw,pendingOnly'
      return sendCsv(reply, 'presale-subscribers.csv', header, subscriberLines(address, includePending, counted.total))
    },
  )

  app.get(
    '/api/v1/presale/subscribers/:address/transfers',
    {
      preHandler: requirePermission(config, 'presale.read'),
      schema: { tags: ['presale'], security: [{ bearerAuth: [] }], params: addressParams, querystring: z.object(pageQuery) },
    },
    async (request) => {
      const params = addressParams.parse(request.params)
      const query = z.object(pageQuery).parse(request.query)
      const address = requiredAddress(params.address)
      const where = contributionWhere({ address, includePending: query.includePending === 'true' })
      const prisma = getPrisma()
      const [total, rows] = await prisma.$transaction([
        prisma.presaleContribution.count({ where }),
        prisma.presaleContribution.findMany({
          where,
          orderBy: [{ blockNumber: 'desc' }, { logIndex: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ])
      await audit(request, 'presale.subscriber.transfers', { address, page: query.page, total })
      return {
        address,
        items: rows.map(present),
        page: query.page,
        pageSize: query.pageSize,
        total,
      }
    },
  )

  app.get(
    '/api/v1/presale/subscriptions',
    {
      preHandler: requirePermission(config, 'presale.read'),
      schema: { tags: ['presale'], security: [{ bearerAuth: [] }], querystring: listQuery },
    },
    async (request) => {
      const query = listQuery.parse(request.query)
      const filter = subscriptionFilter(query.address, query.txHash)
      const where = contributionWhere({ ...filter, includePending: query.includePending === 'true' })
      const prisma = getPrisma()
      const [total, rows] = await prisma.$transaction([
        prisma.presaleContribution.count({ where }),
        prisma.presaleContribution.findMany({
          where,
          orderBy: [{ blockNumber: 'desc' }, { logIndex: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ])
      await audit(request, 'presale.subscriptions.list', { page: query.page, total })
      return { items: rows.map(present), page: query.page, pageSize: query.pageSize, total }
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
      const where = contributionWhere({ ...filter, includePending: query.includePending === 'true' })
      const total = await getPrisma().presaleContribution.count({ where })
      if (total > PRESALE_EXPORT_LIMIT) throw new AppError(400, 'export_too_large', 'Narrow the filter before exporting')
      await audit(request, 'presale.subscriptions.export', { total, address: filter.address ?? null })
      const header = 'txHash,logIndex,fromAddress,amount,amountRaw,blockNumber,blockTime,confirmations,pending'
      return sendCsv(reply, 'presale-subscriptions.csv', header, contributionLines(where))
    },
  )
}

function optionalAddress(address?: string): string | undefined {
  if (!address?.trim()) return undefined
  return requiredAddress(address)
}

function requiredAddress(address: string): string {
  const parsed = normalizeAddress(address)
  if (!parsed) throw new AppError(400, 'invalid_address', 'address must be a 20-byte hex wallet')
  return parsed
}

function subscriptionFilter(address?: string, txHash?: string) {
  if (txHash && !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new AppError(400, 'invalid_tx', 'txHash must be a 32-byte hex hash')
  }
  return { address: optionalAddress(address), txHash: txHash?.toLowerCase() }
}

function contributionWhere(filter: { address?: string; txHash?: string; includePending: boolean }): Prisma.PresaleContributionWhereInput {
  return {
    direction: 'inbound',
    ...(filter.address ? { fromAddress: filter.address } : {}),
    ...(filter.txHash ? { txHash: filter.txHash } : {}),
    ...(filter.includePending ? {} : { confirmations: { gte: CONFIRMATION_DEPTH } }),
  }
}

function present(row: {
  txHash: string
  logIndex: number
  fromAddress: string
  toAddress: string
  amountRaw: { toFixed(digits: number): string }
  blockNumber: number
  blockHash: string
  blockTime: Date
  confirmations: number
}) {
  const amountRaw = decimalToIntegerString(row.amountRaw)
  return {
    txHash: row.txHash,
    logIndex: row.logIndex,
    fromAddress: row.fromAddress,
    toAddress: row.toAddress,
    amount: rawIntegerToUsdtString(amountRaw),
    amountRaw,
    blockNumber: row.blockNumber,
    blockHash: row.blockHash,
    blockTime: row.blockTime.toISOString(),
    confirmations: row.confirmations,
    pending: row.confirmations < CONFIRMATION_DEPTH,
  }
}

async function* subscriberLines(address: string | undefined, includePending: boolean, total: number) {
  const pageSize = 500
  for (let page = 1; (page - 1) * pageSize < total; page += 1) {
    const batch = await listSubscribers(getPrisma(), { address, includePending, page, pageSize })
    for (const row of batch.items) {
      yield [
        csvCell(row.address),
        csvCell(row.totalUsdt, 'number'),
        csvCell(row.totalRaw, 'number'),
        csvCell(String(row.txCount), 'number'),
        csvCell(row.firstTransferAt ?? ''),
        csvCell(row.lastTransferAt ?? ''),
        csvCell(String(row.pendingTxCount), 'number'),
        csvCell(row.pendingUsdt, 'number'),
        csvCell(row.pendingRaw, 'number'),
        csvCell(row.pendingOnly ? 'true' : 'false'),
      ].join(',')
    }
    if (batch.items.length < pageSize) return
  }
}

async function* contributionLines(where: Prisma.PresaleContributionWhereInput) {
  const pageSize = 500
  let skip = 0
  for (;;) {
    const rows = await getPrisma().presaleContribution.findMany({
      where,
      orderBy: [{ blockNumber: 'desc' }, { logIndex: 'desc' }],
      skip,
      take: pageSize,
    })
    for (const row of rows) {
      const view = present(row)
      yield [
        csvCell(view.txHash),
        csvCell(String(view.logIndex), 'number'),
        csvCell(view.fromAddress),
        csvCell(view.amount, 'number'),
        csvCell(view.amountRaw, 'number'),
        csvCell(String(view.blockNumber), 'number'),
        csvCell(view.blockTime),
        csvCell(String(view.confirmations), 'number'),
        csvCell(view.pending ? 'true' : 'false'),
      ].join(',')
    }
    if (rows.length < pageSize) return
    skip += rows.length
  }
}

function sendCsv(reply: FastifyReply, filename: string, header: string, lines: AsyncIterable<string>) {
  reply.header('content-type', 'text/csv; charset=utf-8')
  reply.header('content-disposition', `attachment; filename="${filename}"`)
  reply.header('cache-control', 'no-store')
  return reply.send(Readable.from(withHeader(header, lines)))
}

async function* withHeader(header: string, lines: AsyncIterable<string>) {
  yield `\uFEFF${header}\n`
  for await (const line of lines) yield `${line}\n`
}

function audit(request: FastifyRequest, action: string, metadata: Record<string, unknown>) {
  return writeAudit(getPrisma(), {
    actorId: request.admin?.id,
    action,
    targetType: 'presale',
    metadata,
    ip: requestIp(request),
    userAgent: requestUserAgent(request),
  })
}
