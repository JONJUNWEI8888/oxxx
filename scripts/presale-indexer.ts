import { createAlertChannel } from '../lib/presale-ledger/alerts'
import { indexConfigFromEnv, rpcUrlsFromEnv } from '../lib/presale-ledger/config'
import { getPrisma } from '../lib/presale-ledger/db'
import { runPresaleIndexBatch } from '../lib/presale-ledger/indexer'
import { createPrismaPresaleRepo } from '../lib/presale-ledger/prisma-repo'
import { runPresaleReconciliation } from '../lib/presale-ledger/reconcile'
import { HttpRpcClient } from '../lib/presale-ledger/rpc'
import { PRESALE } from '../lib/presale'

const loop = process.argv.includes('--loop')
const reconcile = process.argv.includes('--reconcile')

async function main() {
  const repo = createPrismaPresaleRepo(getPrisma())
  const rpc = new HttpRpcClient(rpcUrlsFromEnv())
  if (reconcile) {
    const result = await runPresaleReconciliation({
      repo,
      rpc,
      receivingAddress: PRESALE.address,
      usdtContract: PRESALE.usdtContract,
      alerts: createAlertChannel(process.env),
    })
    console.log(
      JSON.stringify({
        ...result,
        ledgerRaw: result.ledgerRaw?.toString() ?? null,
        openingRaw: result.openingRaw?.toString() ?? null,
        closingRaw: result.closingRaw?.toString() ?? null,
        chainDeltaRaw: result.chainDeltaRaw?.toString() ?? null,
        diffRaw: result.diffRaw?.toString() ?? null,
      }),
    )
    return
  }

  do {
    const result = await runPresaleIndexBatch({
      repo,
      rpc,
      config: indexConfigFromEnv(),
      log: (message, extra) => console.info(JSON.stringify({ message, extra })),
    })
    console.log(JSON.stringify(result))
    if (!loop) return
    await new Promise((resolve) => setTimeout(resolve, result.caughtUp ? 15_000 : 1_000))
  } while (loop)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
