import { databaseConfigured, getPrisma } from '@/lib/presale-ledger/db'
import { createPrismaPresaleRepo } from '@/lib/presale-ledger/prisma-repo'
import { presaleGet } from '@/lib/presale-ledger/public-http'
import { vercelRuntimeCache } from '@/lib/presale-ledger/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request) {
  if (!databaseConfigured()) {
    return Response.json(
      { error: 'Unable to read on-chain balance', code: 'ledger_unavailable' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }
  return presaleGet(request, {
    repo: createPrismaPresaleRepo(getPrisma()),
    remote: vercelRuntimeCache(),
  })
}
