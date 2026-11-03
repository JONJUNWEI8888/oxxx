import { vercelRuntimeCache } from '@/lib/presale-ledger/cache'
import { databaseConfigured, getPrisma } from '@/lib/presale-ledger/db'
import { createPrismaPresaleRepo } from '@/lib/presale-ledger/prisma-repo'
import { presaleAddressGet } from '@/lib/presale-ledger/public-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET(request: Request, context: { params: Promise<{ address: string }> }) {
  if (!databaseConfigured()) {
    return Response.json(
      { error: 'Unable to read on-chain balance', code: 'ledger_unavailable' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }
  const { address } = await context.params
  return presaleAddressGet(request, address, {
    repo: createPrismaPresaleRepo(getPrisma()),
    remote: vercelRuntimeCache(),
  })
}
