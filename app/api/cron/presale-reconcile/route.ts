import { presaleReconcileHttp } from '@/lib/presale-ledger/cron-http'
import { databaseConfigured, getPrisma } from '@/lib/presale-ledger/db'
import { createPrismaPresaleRepo } from '@/lib/presale-ledger/prisma-repo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  return GET(request)
}

export async function GET(request: Request) {
  if (!databaseConfigured()) {
    return Response.json({ ok: false, error: 'DATABASE_URL is not set' }, { status: 503 })
  }
  return presaleReconcileHttp(request, { repo: createPrismaPresaleRepo(getPrisma()) })
}
