import { Secret, TOTP } from 'otpauth'

export function generateTotpSecret(): string {
  return new Secret({ size: 20 }).base32
}

export function totpUri(email: string, secret: string): string {
  return new TOTP({
    issuer: 'OXXX Admin',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  }).toString()
}

const PERIOD_SEC = 30

/** Returns the time-step that matched, so callers can reject a replay of that step. */
export function verifyTotp(secret: string, code: string, now = Date.now()): { step: number } | null {
  if (!/^\d{6}$/.test(code)) return null
  const totp = new TOTP({
    secret: Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: 6,
    period: PERIOD_SEC,
  })
  const delta = totp.validate({ token: code, window: 1, timestamp: now })
  if (delta === null) return null
  return { step: Math.floor(now / 1000 / PERIOD_SEC) + delta }
}
