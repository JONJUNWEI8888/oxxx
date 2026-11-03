import { PRESALE } from '../presale'
import { createAlertChannel } from './alerts'
import { authorizeCron } from './cron-auth'
import { indexConfigFromEnv, rpcUrlsFromEnv } from './config'
import { runPresaleIndexBatch } from './indexer'
import { runPresaleReconciliation } from './reconcile'
import { HttpRpcClient } from './rpc'
import type { PresaleRepository } from './types'

export async function presaleIndexHttp(
  request: Request,
  deps: { repo: PresaleRepository; env?: NodeJS.ProcessEnv },
): Promise<Response> {
  const env = deps.env ?? process.env
  if (!authorizeCron(request, env)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const result = await runPresaleIndexBatch({
      repo: deps.repo,
      rpc: new HttpRpcClient(rpcUrlsFromEnv(env)),
      config: indexConfigFromEnv(env),
      log: (message, extra) => console.info(JSON.stringify({ message, extra })),
    })
    return Response.json({ ok: true, ...result })
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: safeCronError() }, { status: 502 })
  }
}

export async function presaleReconcileHttp(
  request: Request,
  deps: { repo: PresaleRepository; env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch },
): Promise<Response> {
  const env = deps.env ?? process.env
  if (!authorizeCron(request, env)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  try {
    const result = await runPresaleReconciliation({
      repo: deps.repo,
      rpc: new HttpRpcClient(rpcUrlsFromEnv(env)),
      receivingAddress: PRESALE.address,
      usdtContract: PRESALE.usdtContract,
      alerts: createAlertChannel(env, deps.fetchImpl),
    })
    return Response.json({
      ok: true,
      skipped: result.skipped,
      reason: result.reason ?? null,
      matched: result.matched,
      ledgerRaw: result.ledgerRaw?.toString() ?? null,
      openingRaw: result.openingRaw?.toString() ?? null,
      closingRaw: result.closingRaw?.toString() ?? null,
      chainDeltaRaw: result.chainDeltaRaw?.toString() ?? null,
      diffRaw: result.diffRaw?.toString() ?? null,
      blockNumber: result.blockNumber,
      alerted: result.alerted,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false, error: safeCronError() }, { status: 502 })
  }
}

/** Never echo RPC URLs, headers, or provider keys back to the caller. */
export function safeCronError(): string {
  return 'upstream request failed'
}
