import { USDT_DECIMALS } from './constants'

const UNIT = 10n ** BigInt(USDT_DECIMALS)

/**
 * Exact integer digits for a base-unit amount (BSC USDT, 18 decimals, stored as Decimal(78, 0)).
 * Prisma's Decimal.toString() switches to scientific notation at 1e+21, which BigInt() rejects.
 */
export function decimalToIntegerString(value: unknown): string {
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error('amount exceeds exact number range')
    return String(value)
  }
  if (isFixedDecimal(value)) return value.toFixed(0)
  if (typeof value === 'string') return normalizeIntegerText(value)
  if (value == null) return '0'
  throw new Error('invalid amount')
}

/** Exact USDT string from an integer base-unit amount. Fractional digits are kept, not rounded away. */
export function rawIntegerToUsdtString(raw: string): string {
  const negative = raw.startsWith('-')
  const digits = stripLeadingZeros(negative ? raw.slice(1) : raw)
  if (!/^\d+$/.test(digits)) throw new Error('invalid raw amount')
  const padded = digits.padStart(USDT_DECIMALS + 1, '0')
  const whole = stripLeadingZeros(padded.slice(0, -USDT_DECIMALS))
  const fraction = padded.slice(-USDT_DECIMALS).replace(/0+$/, '')
  const text = fraction ? `${whole}.${fraction}` : whole
  return negative && text !== '0' ? `-${text}` : text
}

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

function isFixedDecimal(value: unknown): value is { toFixed: (digits: number) => string } {
  return typeof value === 'object' && value !== null && typeof (value as { toFixed?: unknown }).toFixed === 'function'
}

function normalizeIntegerText(value: string): string {
  const trimmed = value.trim()
  const plain = /^(-?)(\d+)(?:\.(\d+))?$/.exec(trimmed)
  if (plain) {
    const fraction = plain[3] ?? ''
    if (fraction !== '' && !/^0+$/.test(fraction)) throw new Error('base-unit amount must be an integer')
    return signed(plain[1] ?? '', stripLeadingZeros(plain[2] ?? '0'))
  }
  const scientific = /^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(trimmed)
  if (!scientific) throw new Error('invalid amount')
  const sign = scientific[1] ?? ''
  const whole = scientific[2] ?? '0'
  const fraction = scientific[3] ?? ''
  const exponent = Number(scientific[4])
  if (!Number.isInteger(exponent)) throw new Error('invalid amount')
  const digits = `${whole}${fraction}`
  const point = whole.length + exponent
  if (point <= 0) return '0'
  if (point >= digits.length) return signed(sign, stripLeadingZeros(digits.padEnd(point, '0')))
  if (!/^0*$/.test(digits.slice(point))) throw new Error('base-unit amount must be an integer')
  return signed(sign, stripLeadingZeros(digits.slice(0, point) || '0'))
}

function stripLeadingZeros(digits: string): string {
  return digits.replace(/^0+(?=\d)/, '')
}

function signed(sign: string, digits: string): string {
  return sign === '-' && digits !== '0' ? `-${digits}` : digits
}
