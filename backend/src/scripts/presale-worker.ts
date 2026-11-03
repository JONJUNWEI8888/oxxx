import { indexConfigFromEnv, rpcUrlsFromEnv } from '../../../lib/presale-ledger/config'
import { runPresaleIndexBatch } from '../../../lib/presale-ledger/indexer'
import { createPrismaPresaleRepo } from '../../../lib/presale-ledger/prisma-repo'
import { HttpRpcClient } from '../../../lib/presale-ledger/rpc'
import { getPrisma } from '../db'

const once = process.argv.includes('--once')
const repo = createPrismaPresaleRepo(getPrisma())
const rpc = new HttpRpcClient(rpcUrlsFromEnv())

do {
  const result = await runPresaleIndexBatch({
    repo,
    rpc,
    config: indexConfigFromEnv(),
    log: (message, extra) => console.info(JSON.stringify({ message, extra })),
  })
  console.log(JSON.stringify(result))
  if (once) break
  await new Promise((resolve) => setTimeout(resolve, result.caughtUp || result.skipped ? 15_000 : 500))
} while (true)
