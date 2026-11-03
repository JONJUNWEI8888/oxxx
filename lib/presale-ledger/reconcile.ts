import type { AlertChannel } from './alerts'
import type { PresaleRepository, RpcClient } from './types'

export type ReconcileResult = {
  skipped: boolean
  reason?: 'not_indexed'
  matched: boolean | null
  ledgerRaw: bigint | null
  openingRaw: bigint | null
  closingRaw: bigint | null
  chainDeltaRaw: bigint | null
  diffRaw: bigint | null
  blockNumber: number | null
  alerted: boolean
}

/**
 * Compare the ledger sum through the cursor with the on-chain USDT balance
 * change over the same block range. Incoming transfers before `startBlock`
 * sit in the opening balance and are not treated as a mismatch.
 * Outgoing transfers are not part of the subscriber ledger, so they alert.
 */
export async function runPresaleReconciliation(input: {
  repo: PresaleRepository
  rpc: RpcClient
  receivingAddress: string
  usdtContract: string
  alerts: AlertChannel
}): Promise<ReconcileResult> {
  const state = await input.repo.getState()
  if (!state || state.lastScannedBlock < state.startBlock) {
    return {
      skipped: true,
      reason: 'not_indexed',
      matched: null,
      ledgerRaw: null,
      openingRaw: null,
      closingRaw: null,
      chainDeltaRaw: null,
      diffRaw: null,
      blockNumber: state?.lastScannedBlock ?? null,
      alerted: false,
    }
  }

  const ledgerRaw = await input.repo.sumAmountRawUpTo(state.lastScannedBlock)
  const closingRaw = await input.rpc.getUsdtBalance(
    input.usdtContract,
    input.receivingAddress,
    state.lastScannedBlock,
  )
  const openingRaw =
    state.startBlock > 0
      ? await input.rpc.getUsdtBalance(input.usdtContract, input.receivingAddress, state.startBlock - 1)
      : 0n
  const chainDeltaRaw = closingRaw - openingRaw
  const diffRaw = chainDeltaRaw - ledgerRaw
  const matched = diffRaw === 0n
  let alerted = false
  if (!matched) {
    await input.alerts.send({
      severity: 'critical',
      title: 'Presale ledger does not match the on-chain USDT balance',
      message:
        `Indexed transfers through block ${state.lastScannedBlock} sum to ${ledgerRaw} ` +
        `but the address balance changed by ${chainDeltaRaw} ` +
        `(closing ${closingRaw} - opening ${openingRaw}).`,
      details: {
        blockNumber: state.lastScannedBlock,
        startBlock: state.startBlock,
        ledgerRaw: ledgerRaw.toString(),
        openingRaw: openingRaw.toString(),
        closingRaw: closingRaw.toString(),
        chainDeltaRaw: chainDeltaRaw.toString(),
        diffRaw: diffRaw.toString(),
      },
    })
    alerted = true
  }

  await input.repo.saveReconciliation({
    ledgerRaw,
    openingRaw,
    closingRaw,
    chainDeltaRaw,
    diffRaw,
    matched,
    blockNumber: state.lastScannedBlock,
    detail: matched ? null : 'ledger total diverged from balance delta',
    alerted,
  })

  return {
    skipped: false,
    matched,
    ledgerRaw,
    openingRaw,
    closingRaw,
    chainDeltaRaw,
    diffRaw,
    blockNumber: state.lastScannedBlock,
    alerted,
  }
}
