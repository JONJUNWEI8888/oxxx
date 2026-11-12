import { Prisma, type PrismaClient } from '@prisma/client'
import { decimalToIntegerString, rawIntegerToUsdtString } from '../../../lib/presale-ledger/amounts'
import { CONFIRMATION_DEPTH } from '../../../lib/presale-ledger/constants'

export const PRESALE_EXPORT_LIMIT = 100_000

export type SubscriberRow = {
  address: string
  totalUsdt: string
  totalRaw: string
  txCount: number
  firstTransferAt: string | null
  lastTransferAt: string | null
  pendingTxCount: number
  pendingUsdt: string
  pendingRaw: string
  pendingOnly: boolean
}

type RawSubscriber = {
  address: string
  total_raw: string
  tx_count: number
  first_time: Date | null
  last_time: Date | null
  pending_count: number
  pending_raw: string
}

export async function listSubscribers(
  prisma: PrismaClient,
  args: { address?: string; includePending: boolean; page: number; pageSize: number },
): Promise<{ total: number; items: SubscriberRow[] }> {
  const rows = await prisma.$queryRaw<RawSubscriber[]>(subscriberSql(args, false))
  const totals = await prisma.$queryRaw<Array<{ total: number }>>(subscriberSql(args, true))
  return {
    total: Number(totals[0]?.total ?? 0),
    items: rows.map(presentSubscriber),
  }
}

export async function presaleSummary(prisma: PrismaClient) {
  const depth = CONFIRMATION_DEPTH
  const rows = await prisma.$queryRaw<
    Array<{
      confirmed_raw: string
      tx_count: number
      subscribers: number
      latest: Date | null
      pending_raw: string
      pending_tx_count: number
      pending_subscribers: number
    }>
  >`
    SELECT
      COALESCE(SUM(amount_raw) FILTER (WHERE confirmations >= ${depth}), 0)::text AS confirmed_raw,
      COUNT(*) FILTER (WHERE confirmations >= ${depth})::int AS tx_count,
      COUNT(DISTINCT from_address) FILTER (WHERE confirmations >= ${depth})::int AS subscribers,
      MAX(block_time) FILTER (WHERE confirmations >= ${depth}) AS latest,
      COALESCE(SUM(amount_raw) FILTER (WHERE confirmations < ${depth}), 0)::text AS pending_raw,
      COUNT(*) FILTER (WHERE confirmations < ${depth})::int AS pending_tx_count,
      COUNT(DISTINCT from_address) FILTER (WHERE confirmations < ${depth})::int AS pending_subscribers
    FROM presale_contributions
    WHERE direction = 'inbound'
  `
  const row = rows[0]
  const confirmedRaw = wholeRaw(row?.confirmed_raw)
  const pendingRaw = wholeRaw(row?.pending_raw)
  return {
    confirmationThreshold: depth,
    confirmed: {
      totalUsdt: rawIntegerToUsdtString(confirmedRaw),
      totalRaw: confirmedRaw,
      txCount: Number(row?.tx_count ?? 0),
      subscriberCount: Number(row?.subscribers ?? 0),
      latestTransferAt: row?.latest ? new Date(row.latest).toISOString() : null,
    },
    pending: {
      totalUsdt: rawIntegerToUsdtString(pendingRaw),
      totalRaw: pendingRaw,
      txCount: Number(row?.pending_tx_count ?? 0),
      subscriberCount: Number(row?.pending_subscribers ?? 0),
    },
  }
}

function subscriberSql(
  args: { address?: string; includePending: boolean; page: number; pageSize: number },
  count: boolean,
) {
  const depth = CONFIRMATION_DEPTH
  const addressSql = args.address ? Prisma.sql`AND from_address = ${args.address}` : Prisma.empty
  const having = args.includePending ? Prisma.sql`(tx_count > 0 OR pending_count > 0)` : Prisma.sql`tx_count > 0`
  const offset = (args.page - 1) * args.pageSize
  const select = count
    ? Prisma.sql`SELECT COUNT(*)::int AS total FROM grouped WHERE ${having}`
    : Prisma.sql`
        SELECT address, total_raw, tx_count, first_time, last_time, pending_count, pending_raw
        FROM grouped
        WHERE ${having}
        ORDER BY last_time DESC NULLS LAST, address ASC
        LIMIT ${args.pageSize} OFFSET ${offset}
      `
  return Prisma.sql`
    WITH grouped AS (
      SELECT
        from_address AS address,
        COALESCE(SUM(amount_raw) FILTER (WHERE confirmations >= ${depth}), 0)::text AS total_raw,
        COUNT(*) FILTER (WHERE confirmations >= ${depth})::int AS tx_count,
        MIN(block_time) FILTER (WHERE confirmations >= ${depth}) AS first_time,
        MAX(block_time) FILTER (WHERE confirmations >= ${depth}) AS last_time,
        COUNT(*) FILTER (WHERE confirmations < ${depth})::int AS pending_count,
        COALESCE(SUM(amount_raw) FILTER (WHERE confirmations < ${depth}), 0)::text AS pending_raw
      FROM presale_contributions
      WHERE direction = 'inbound'
      ${addressSql}
      GROUP BY from_address
    )
    ${select}
  `
}

function wholeRaw(value: string | null | undefined): string {
  return decimalToIntegerString(value ?? '0')
}

function presentSubscriber(row: RawSubscriber): SubscriberRow {
  const txCount = Number(row.tx_count ?? 0)
  const pendingTxCount = Number(row.pending_count ?? 0)
  const totalRaw = wholeRaw(row.total_raw)
  const pendingRaw = wholeRaw(row.pending_raw)
  return {
    address: row.address,
    totalUsdt: rawIntegerToUsdtString(totalRaw),
    totalRaw,
    txCount,
    firstTransferAt: row.first_time ? new Date(row.first_time).toISOString() : null,
    lastTransferAt: row.last_time ? new Date(row.last_time).toISOString() : null,
    pendingTxCount,
    pendingUsdt: rawIntegerToUsdtString(pendingRaw),
    pendingRaw,
    pendingOnly: txCount === 0 && pendingTxCount > 0,
  }
}
