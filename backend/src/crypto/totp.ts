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

export function verifyTotp(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false
  const totp = new TOTP({
    secret: Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })
  return totp.validate({ token: code, window: 1 }) !== null
}
