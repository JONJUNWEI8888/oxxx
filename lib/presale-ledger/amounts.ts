import { USDT_DECIMALS } from './constants'

const UNIT = 10n ** BigInt(USDT_DECIMALS)

/** Display amount in USDT. Exact integer units live in `raisedRaw`. */
export function rawToUsdtNumber(raw: bigint): number {
  if (raw < 0n) return -rawToUsdtNumber(-raw)
  const whole = raw / UNIT
  const fraction = Number(raw % UNIT) / 1e18
  return Number(whole) + fraction
}

export function usdtToRaw(amount: number): bigint {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('invalid amount')
  const [whole, frac = ''] = amount.toString().split('.')
  const fracPadded = `${frac}000000000000000000`.slice(0, USDT_DECIMALS)
  return BigInt(whole) * UNIT + BigInt(fracPadded)
}
