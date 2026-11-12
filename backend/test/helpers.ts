import { execSync } from 'child_process'
import { PrismaClient, type AdminRole } from '@prisma/client'
import { Secret, TOTP } from 'otpauth'
import { expect } from 'vitest'
import './env'
import { buildApp } from '../src/app'
import { loadConfig } from '../src/config'
import { encryptString } from '../src/crypto/pii'
import { hashPassword } from '../src/crypto/password'

export const PASSWORD = 'correct-horse-1'
export const TOTP_SECRET = 'JBSWY3DPEHPK3PXP'

export const prisma = new PrismaClient()

export function totpCode(secret = TOTP_SECRET): string {
  return new TOTP({
    secret: Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  }).generate()
}

export async function migrate() {
  execSync('pnpm exec prisma migrate deploy --schema ../prisma/schema.prisma', { stdio: 'inherit' })
}

export async function resetDb() {
  // The test role owns audit_logs, so it may disable the truncate trigger.
  // Production's oxxx_app role cannot. TRUNCATE itself must keep failing while the trigger is on.
  await prisma.$executeRawUnsafe(`ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_no_truncate`)
  try {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        audit_logs,
        kyc_documents,
        kyc_applications,
        admin_refresh_tokens,
        mfa_challenges,
        login_attempts,
        admin_invites,
        admin_users,
        users,
        presale_contributions,
        presale_checkpoints,
        presale_reconciliations,
        presale_indexer_state
      RESTART IDENTITY CASCADE
    `)
  } finally {
    await prisma.$executeRawUnsafe(`ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_no_truncate`)
  }
}

export async function createAdmin(role: AdminRole, email: string, opts?: { totpEnabled?: boolean }) {
  return prisma.adminUser.create({
    data: {
      email,
      role,
      passwordHash: await hashPassword(PASSWORD),
      totpSecretCipher: encryptString(TOTP_SECRET, loadConfig().piiKey),
      totpEnabled: opts?.totpEnabled ?? true,
      status: 'active',
    },
  })
}

export async function buildTestApp() {
  const app = await buildApp(loadConfig())
  await app.ready()
  return app
}

export async function login(app: Awaited<ReturnType<typeof buildTestApp>>, email: string) {
  const start = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password: PASSWORD },
  })
  expect(start.statusCode).toBe(200)
  const body = start.json()
  expect(body.status).toBe('mfa')
  const mfa = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/mfa',
    payload: { mfaToken: body.mfaToken, code: totpCode() },
  })
  expect(mfa.statusCode).toBe(200)
  expect(mfa.json().accessToken).toBeUndefined()
  expect(mfa.json().refreshToken).toBeUndefined()
  return accessTokenFromSetCookie(mfa.headers['set-cookie'])
}

export function accessTokenFromSetCookie(setCookie: string | string[] | undefined): string {
  const list = !setCookie ? [] : Array.isArray(setCookie) ? setCookie : [setCookie]
  const raw = list.find((cookie) => cookie.startsWith('__Host-oxxx_admin_access='))
  if (!raw) throw new Error('access cookie missing')
  return decodeURIComponent(raw.slice('__Host-oxxx_admin_access='.length).split(';')[0] ?? '')
}

export function auth(token: string) {
  return { authorization: `Bearer ${token}` }
}
