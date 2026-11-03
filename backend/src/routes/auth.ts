import type { FastifyInstance } from 'fastify'
import type { AdminUser } from '@prisma/client'
import { z } from 'zod'
import { writeAudit } from '../audit'
import { requireAdmin, requireSetupToken } from '../auth/guard'
import type { AppConfig } from '../config'
import { decryptString, encryptString } from '../crypto/pii'
import { hashPassword, verifyPassword } from '../crypto/password'
import { newSecret, sha256, signToken } from '../crypto/tokens'
import { generateTotpSecret, totpUri, verifyTotp } from '../crypto/totp'
import { getPrisma } from '../db'
import { AppError } from '../errors'
import { requestIp, requestUserAgent } from '../http'

const loginBody = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
})

const mfaBody = z.object({
  mfaToken: z.string().min(20),
  code: z.string().regex(/^\d{6}$/),
})

const confirmBody = z.object({
  code: z.string().regex(/^\d{6}$/),
})

const refreshBody = z.object({
  refreshToken: z.string().min(20),
})

let dummyHash: string | null = null

export async function authRoutes(app: FastifyInstance, config: AppConfig) {
  app.post('/api/v1/auth/login', { schema: { tags: ['auth'], body: loginBody } }, async (request) => {
    const body = loginBody.parse(request.body)
    const email = body.email.trim().toLowerCase()
    const ip = requestIp(request)
    const prisma = getPrisma()
    await assertLoginAllowed(config, ip, email)
    const admin = await prisma.adminUser.findUnique({ where: { email } })
    const passwordOk = admin
      ? await verifyPassword(body.password, admin.passwordHash)
      : await verifyPassword(body.password, await getDummyHash())
    if (!admin || !passwordOk) {
      await recordFailure(ip, email)
      await writeAudit(prisma, { action: 'auth.login.failure', ip, userAgent: requestUserAgent(request) })
      throw new AppError(401, 'invalid_credentials', 'Invalid email or password')
    }
    if (admin.status !== 'active') {
      await writeAudit(prisma, { actorId: admin.id, action: 'auth.login.disabled', ip, userAgent: requestUserAgent(request) })
      throw new AppError(403, 'admin_disabled', 'This admin account is disabled')
    }
    await clearFailures(ip, email)
    if (!admin.totpEnabled) {
      const setupToken = await signToken(
        { sub: admin.id, role: admin.role, tv: admin.tokenVersion, scope: 'totp_setup' },
        config,
        600,
      )
      return { status: 'enrollment' as const, setupToken }
    }
    const mfaToken = newSecret()
    await prisma.mfaChallenge.create({
      data: {
        adminId: admin.id,
        tokenHash: sha256(mfaToken),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    })
    return { status: 'mfa' as const, mfaToken }
  })

  app.post('/api/v1/auth/mfa', { schema: { tags: ['auth'], body: mfaBody } }, async (request) => {
    const body = mfaBody.parse(request.body)
    const prisma = getPrisma()
    const challenge = await prisma.mfaChallenge.findUnique({
      where: { tokenHash: sha256(body.mfaToken) },
      include: { admin: true },
    })
    if (!challenge || challenge.expiresAt.getTime() < Date.now() || challenge.attempts >= 5) {
      throw new AppError(401, 'invalid_mfa', 'MFA challenge is invalid or expired')
    }
    const secret = challenge.admin.totpSecretCipher
      ? decryptString(challenge.admin.totpSecretCipher, config.piiKey)
      : ''
    if (!secret || !verifyTotp(secret, body.code)) {
      await prisma.mfaChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } })
      await writeAudit(prisma, {
        actorId: challenge.adminId,
        action: 'auth.mfa.failure',
        ip: requestIp(request),
        userAgent: requestUserAgent(request),
      })
      throw new AppError(401, 'invalid_mfa', 'Invalid authenticator code')
    }
    await prisma.mfaChallenge.delete({ where: { id: challenge.id } })
    const session = await issueSession(config, challenge.admin)
    await writeAudit(prisma, {
      actorId: challenge.adminId,
      action: 'auth.mfa.success',
      ip: requestIp(request),
      userAgent: requestUserAgent(request),
    })
    return session
  })

  app.post('/api/v1/auth/totp/setup', { schema: { tags: ['auth'] } }, async (request) => {
    const claims = await requireSetupToken(request, config)
    const prisma = getPrisma()
    const admin = await prisma.adminUser.findUnique({ where: { id: claims.sub } })
    if (!admin || admin.status !== 'active') throw new AppError(401, 'unauthorized', 'Admin not found')
    if (admin.totpEnabled) throw new AppError(409, 'totp_enabled', 'Authenticator is already enabled')
    const secret = admin.totpSecretCipher
      ? decryptString(admin.totpSecretCipher, config.piiKey)
      : generateTotpSecret()
    if (!admin.totpSecretCipher) {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { totpSecretCipher: encryptString(secret, config.piiKey) },
      })
    }
    return { secret, otpauthUrl: totpUri(admin.email, secret) }
  })

  app.post('/api/v1/auth/totp/confirm', { schema: { tags: ['auth'], body: confirmBody } }, async (request) => {
    const claims = await requireSetupToken(request, config)
    const body = confirmBody.parse(request.body)
    const prisma = getPrisma()
    const admin = await prisma.adminUser.findUnique({ where: { id: claims.sub } })
    if (!admin?.totpSecretCipher) throw new AppError(400, 'totp_missing', 'Call setup before confirming')
    const secret = decryptString(admin.totpSecretCipher, config.piiKey)
    if (!verifyTotp(secret, body.code)) throw new AppError(401, 'invalid_mfa', 'Invalid authenticator code')
    const updated = await prisma.adminUser.update({
      where: { id: admin.id },
      data: { totpEnabled: true },
    })
    const session = await issueSession(config, updated)
    await writeAudit(prisma, {
      actorId: admin.id,
      action: 'auth.totp.enrolled',
      ip: requestIp(request),
      userAgent: requestUserAgent(request),
    })
    return session
  })

  app.post('/api/v1/auth/refresh', { schema: { tags: ['auth'], body: refreshBody } }, async (request) => {
    const body = refreshBody.parse(request.body)
    const prisma = getPrisma()
    const row = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(body.refreshToken) },
      include: { admin: true },
    })
    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now() || row.admin.status !== 'active') {
      throw new AppError(401, 'invalid_refresh', 'Refresh token is invalid')
    }
    await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } })
    const session = await issueSession(config, row.admin)
    await writeAudit(prisma, { actorId: row.adminId, action: 'auth.refresh', ip: requestIp(request) })
    return session
  })

  app.post('/api/v1/auth/logout', { schema: { tags: ['auth'], body: refreshBody } }, async (request) => {
    const body = refreshBody.parse(request.body)
    const prisma = getPrisma()
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(body.refreshToken) } })
    if (row && !row.revokedAt) {
      await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } })
      await writeAudit(prisma, { actorId: row.adminId, action: 'auth.logout', ip: requestIp(request) })
    }
    return { ok: true }
  })

  app.get(
    '/api/v1/auth/me',
    { preHandler: requireAdmin(config), schema: { tags: ['auth'], security: [{ bearerAuth: [] }] } },
    async (request) => {
      const admin = request.admin
      if (!admin) throw new AppError(401, 'unauthorized', 'Missing access token')
      return { id: admin.id, email: admin.email, role: admin.role }
    },
  )
}

async function issueSession(config: AppConfig, admin: AdminUser) {
  const prisma = getPrisma()
  const accessToken = await signToken(
    { sub: admin.id, role: admin.role, tv: admin.tokenVersion, scope: 'access' },
    config,
    config.ACCESS_TOKEN_TTL_SEC,
  )
  const refreshToken = newSecret()
  await prisma.refreshToken.create({
    data: {
      adminId: admin.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  })
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
  return {
    tokenType: 'Bearer' as const,
    accessToken,
    refreshToken,
    expiresIn: config.ACCESS_TOKEN_TTL_SEC,
    admin: { id: admin.id, email: admin.email, role: admin.role },
  }
}

async function assertLoginAllowed(config: AppConfig, ip: string, email: string) {
  const since = new Date(Date.now() - config.LOGIN_WINDOW_SEC * 1000)
  const prisma = getPrisma()
  const [byIp, byEmail] = await Promise.all([
    prisma.loginAttempt.count({ where: { key: `ip:${ip}`, createdAt: { gt: since } } }),
    prisma.loginAttempt.count({ where: { key: `email:${email}`, createdAt: { gt: since } } }),
  ])
  if (byIp >= config.LOGIN_MAX_FAILURES || byEmail >= config.LOGIN_MAX_FAILURES) {
    await writeAudit(prisma, { action: 'auth.login.rate_limited', ip, metadata: { emailHash: sha256(email) } })
    throw new AppError(429, 'rate_limited', 'Too many login attempts')
  }
}

async function recordFailure(ip: string, email: string) {
  const prisma = getPrisma()
  await prisma.loginAttempt.createMany({ data: [{ key: `ip:${ip}` }, { key: `email:${email}` }] })
}

async function clearFailures(ip: string, email: string) {
  await getPrisma().loginAttempt.deleteMany({ where: { key: { in: [`ip:${ip}`, `email:${email}`] } } })
}

async function getDummyHash(): Promise<string> {
  dummyHash ??= await hashPassword('oxxx-dummy-password-not-used')
  return dummyHash
}
