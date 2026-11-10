import type { FastifyInstance, FastifyReply } from 'fastify'
import type { AdminRole, AdminUser } from '@prisma/client'
import { z } from 'zod'
import { writeAudit } from '../audit'
import { permissionsFor } from '../auth/rbac'
import { requireAdmin, requirePermission } from '../auth/guard'
import type { AppConfig } from '../config'
import { decryptString, encryptString } from '../crypto/pii'
import { hashPassword, verifyPassword } from '../crypto/password'
import { newSecret, sha256, signToken, verifyToken } from '../crypto/tokens'
import { generateTotpSecret, totpUri, verifyTotp } from '../crypto/totp'
import { getPrisma } from '../db'
import { AppError } from '../errors'
import { csrfTokenForSession, sessionCsrfToken } from '../http/csrf'
import { clearSessionCookies, cookiePolicy, readCookie, readCookieHeader, setSessionCookies } from '../http/cookies'
import { requestIp, requestUserAgent } from '../http'
import { RateLimitUnavailableError, type RateLimiter } from '../../../lib/presale-ledger/rate-limit'

const loginBody = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
})

const mfaBody = z.object({
  mfaToken: z.string().min(20),
  code: z.string().regex(/^\d{6}$/),
})

const inviteBody = z.object({
  email: z.string().email().max(320),
  role: z.enum(['super_admin', 'kyc_reviewer', 'support']),
})

const inviteTokenBody = z.object({
  token: z.string().min(20),
})

const redeemBody = z.object({
  token: z.string().min(20),
  password: z.string().min(12).max(200),
  code: z.string().regex(/^\d{6}$/),
})

const MFA_MAX_FAILURES = 5
const MFA_LOCK_MS = 15 * 60 * 1000

const refreshBody = z.object({
  refreshToken: z.string().min(20).optional(),
})

let dummyHash: string | null = null

export async function authRoutes(app: FastifyInstance, config: AppConfig, authLimiter: RateLimiter) {
  app.post('/api/v1/auth/login', { schema: { tags: ['auth'], body: loginBody } }, async (request) => {
    const ip = requestIp(request)
    await enforceDistributedLimit(authLimiter, `login:${ip}`)
    const body = loginBody.parse(request.body)
    const email = body.email.trim().toLowerCase()
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
      throw new AppError(403, 'enrollment_required', 'This admin must enroll with a one-time invite link')
    }
    if (admin.mfaLockedUntil && admin.mfaLockedUntil.getTime() > Date.now()) {
      throw new AppError(429, 'mfa_locked', 'Authenticator attempts are locked')
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

  app.post('/api/v1/auth/mfa', { schema: { tags: ['auth'], body: mfaBody } }, async (request, reply) => {
    await enforceDistributedLimit(authLimiter, `mfa:${requestIp(request)}`)
    const body = mfaBody.parse(request.body)
    const prisma = getPrisma()
    const challenge = await prisma.mfaChallenge.findUnique({
      where: { tokenHash: sha256(body.mfaToken) },
      include: { admin: true },
    })
    if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
      throw new AppError(401, 'invalid_mfa', 'MFA challenge is invalid or expired')
    }
    if (challenge.admin.mfaLockedUntil && challenge.admin.mfaLockedUntil.getTime() > Date.now()) {
      throw new AppError(429, 'mfa_locked', 'Authenticator attempts are locked')
    }
    const secret = challenge.admin.totpSecretCipher
      ? decryptString(challenge.admin.totpSecretCipher, config.piiKey)
      : ''
    const proof = secret ? verifyTotp(secret, body.code) : null
    if (!proof) {
      await recordMfaFailure(challenge.adminId)
      await writeAudit(prisma, {
        actorId: challenge.adminId,
        action: 'auth.mfa.failure',
        ip: requestIp(request),
        userAgent: requestUserAgent(request),
      })
      throw new AppError(401, 'invalid_mfa', 'Invalid authenticator code')
    }
    const claimed = await claimTotpStep(challenge.adminId, proof.step)
    if (!claimed) {
      const current = await prisma.adminUser.findUnique({
        where: { id: challenge.adminId },
        select: { mfaLockedUntil: true },
      })
      if (current?.mfaLockedUntil && current.mfaLockedUntil.getTime() > Date.now()) {
        throw new AppError(429, 'mfa_locked', 'Authenticator attempts are locked')
      }
      await recordMfaFailure(challenge.adminId)
      await writeAudit(prisma, {
        actorId: challenge.adminId,
        action: 'auth.mfa.replay',
        ip: requestIp(request),
        userAgent: requestUserAgent(request),
      })
      throw new AppError(401, 'totp_replay', 'Authenticator code was already used')
    }
    await prisma.mfaChallenge.delete({ where: { id: challenge.id } })
    const session = await issueSession(config, challenge.admin, reply)
    await writeAudit(prisma, {
      actorId: challenge.adminId,
      action: 'auth.mfa.success',
      ip: requestIp(request),
      userAgent: requestUserAgent(request),
    })
    return session
  })

  app.post(
    '/api/v1/auth/invites',
    {
      preHandler: requirePermission(config, 'admins.invite'),
      schema: { tags: ['auth'], security: [{ bearerAuth: [] }], body: inviteBody },
    },
    async (request) => {
      const body = inviteBody.parse(request.body)
      return createAdminInvite(request.admin?.id, body, {
        ip: requestIp(request),
        userAgent: requestUserAgent(request),
      })
    },
  )

  app.post('/api/v1/auth/invites/start', { schema: { tags: ['auth'], body: inviteTokenBody } }, async (request) => {
    await enforceDistributedLimit(authLimiter, `invite-start:${requestIp(request)}`)
    const body = inviteTokenBody.parse(request.body)
    const invite = await loadInvite(body.token)
    const secret = invite.totpSecretCipher
      ? decryptString(invite.totpSecretCipher, config.piiKey)
      : generateTotpSecret()
    if (!invite.totpSecretCipher) {
      await getPrisma().adminInvite.update({
        where: { id: invite.id },
        data: { totpSecretCipher: encryptString(secret, config.piiKey) },
      })
    }
    return { email: invite.email, role: invite.role, secret, otpauthUrl: totpUri(invite.email, secret) }
  })

  app.post('/api/v1/auth/invites/redeem', { schema: { tags: ['auth'], body: redeemBody } }, async (request) => {
    await enforceDistributedLimit(authLimiter, `invite-redeem:${requestIp(request)}`)
    const body = redeemBody.parse(request.body)
    const invite = await loadInvite(body.token)
    if (!invite.totpSecretCipher) throw new AppError(400, 'totp_missing', 'Open the invite before confirming')
    const secret = decryptString(invite.totpSecretCipher, config.piiKey)
    const proof = verifyTotp(secret, body.code)
    if (!proof) throw new AppError(401, 'invalid_mfa', 'Invalid authenticator code')
    const prisma = getPrisma()
    const passwordHash = await hashPassword(body.password)
    await prisma.$transaction(async (tx) => {
      const existing = await tx.adminUser.findUnique({ where: { email: invite.email } })
      if (existing?.totpEnabled) throw new AppError(409, 'admin_exists', 'This admin is already enrolled')
      if (existing) {
        await tx.adminUser.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            role: invite.role,
            totpSecretCipher: invite.totpSecretCipher,
            totpEnabled: true,
            totpLastStep: proof.step,
            status: 'active',
          },
        })
      } else {
        await tx.adminUser.create({
          data: {
            email: invite.email,
            passwordHash,
            role: invite.role,
            totpSecretCipher: invite.totpSecretCipher,
            totpEnabled: true,
            totpLastStep: proof.step,
          },
        })
      }
      const consumed = await tx.adminInvite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: new Date() },
      })
      if (consumed.count !== 1) throw new AppError(409, 'invite_used', 'Invite was already used')
    })
    await writeAudit(prisma, {
      action: 'auth.invite.redeem',
      targetType: 'admin_invite',
      targetId: invite.id,
      ip: requestIp(request),
      userAgent: requestUserAgent(request),
    })
    return { ok: true }
  })

  app.post('/api/v1/auth/refresh', { schema: { tags: ['auth'], body: refreshBody } }, async (request, reply) => {
    const body = refreshBody.parse(request.body ?? {})
    const refreshToken = body.refreshToken || readCookie(readCookieHeader(request), cookiePolicy(config).names.refresh)
    if (!refreshToken) throw new AppError(401, 'invalid_refresh', 'Refresh token is invalid')
    const prisma = getPrisma()
    const row = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { admin: true },
    })
    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now() || row.admin.status !== 'active') {
      throw new AppError(401, 'invalid_refresh', 'Refresh token is invalid')
    }
    await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } })
    const session = await issueSession(config, row.admin, reply)
    await writeAudit(prisma, { actorId: row.adminId, action: 'auth.refresh', ip: requestIp(request) })
    return session
  })

  app.post('/api/v1/auth/logout', { schema: { tags: ['auth'], body: refreshBody } }, async (request, reply) => {
    const body = refreshBody.parse(request.body ?? {})
    const names = cookiePolicy(config).names
    const secrets = [body.refreshToken, readCookie(readCookieHeader(request), names.refresh)].filter(
      (value): value is string => Boolean(value),
    )
    const prisma = getPrisma()
    const sessionIds = new Set<string>()
    let actorId: string | undefined
    for (const tokenHash of new Set(secrets.map(sha256))) {
      const row = await prisma.refreshToken.findUnique({ where: { tokenHash } })
      if (row) sessionIds.add(row.id)
    }
    const access = readCookie(readCookieHeader(request), names.access)
    if (access) {
      try {
        sessionIds.add((await verifyToken(access, config)).sid)
      } catch {
        // A bad access cookie does not keep the refresh session alive.
      }
    }
    if (sessionIds.size > 0) {
      const rows = await prisma.refreshToken.findMany({
        where: { id: { in: [...sessionIds] }, revokedAt: null },
        select: { adminId: true },
      })
      await prisma.refreshToken.updateMany({
        where: { id: { in: [...sessionIds] }, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      actorId = rows[0]?.adminId
    }
    if (actorId) await writeAudit(prisma, { actorId, action: 'auth.logout', ip: requestIp(request) })
    clearSessionCookies(reply, config)
    return { ok: true }
  })

  app.get(
    '/api/v1/auth/csrf',
    { schema: { tags: ['auth'] } },
    async (request) => ({ csrfToken: await sessionCsrfToken(request, config) }),
  )

  app.get(
    '/api/v1/auth/me',
    {
      preHandler: requireAdmin(config),
      schema: { tags: ['auth'], security: [{ bearerAuth: [] }, { cookieAuth: [] }] },
    },
    async (request) => {
      const admin = request.admin
      if (!admin) throw new AppError(401, 'unauthorized', 'Missing access token')
      return {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        permissions: permissionsFor(admin.role),
        csrfToken: await sessionCsrfToken(request, config),
      }
    },
  )
}

export async function createAdminInvite(
  actorId: string | undefined,
  input: { email: string; role: AdminRole },
  meta: { ip: string | null; userAgent: string | null },
) {
  const email = input.email.trim().toLowerCase()
  const token = newSecret()
  const prisma = getPrisma()
  await prisma.adminInvite.create({
    data: {
      email,
      role: input.role,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdById: actorId,
    },
  })
  await writeAudit(prisma, {
    actorId,
    action: 'auth.invite.create',
    targetType: 'admin_invite',
    metadata: { emailHash: sha256(email), role: input.role },
    ip: meta.ip,
    userAgent: meta.userAgent,
  })
  return { token, email, role: input.role, expiresInSec: 24 * 60 * 60 }
}

async function issueSession(config: AppConfig, admin: AdminUser, reply: FastifyReply) {
  const prisma = getPrisma()
  const refreshToken = newSecret()
  const session = await prisma.refreshToken.create({
    data: {
      adminId: admin.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  })
  const accessToken = await signToken(
    { sub: admin.id, role: admin.role, tv: admin.tokenVersion, scope: 'access', sid: session.id },
    config,
    config.ACCESS_TOKEN_TTL_SEC,
  )
  const csrfToken = csrfTokenForSession(session.id, config.CSRF_SECRET)
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } })
  setSessionCookies(reply, config, { accessToken, refreshToken, csrfToken })
  return {
    expiresIn: config.ACCESS_TOKEN_TTL_SEC,
    csrfToken,
    admin: {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: permissionsFor(admin.role),
    },
  }
}

export function loginDelayMs(priorFailures: number): number {
  if (priorFailures <= 0) return 0
  return Math.min(25 * 2 ** Math.min(priorFailures - 1, 5), 800)
}

function pairKey(ip: string, email: string): string {
  return `pair:${ip}:${sha256(email)}`
}

async function assertLoginAllowed(config: AppConfig, ip: string, email: string) {
  const since = new Date(Date.now() - config.LOGIN_WINDOW_SEC * 1000)
  const prisma = getPrisma()
  const [byPair, byIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { key: pairKey(ip, email), createdAt: { gt: since } } }),
    prisma.loginAttempt.count({ where: { key: `ip:${ip}`, createdAt: { gt: since } } }),
  ])
  if (byPair >= config.LOGIN_MAX_FAILURES || byIp >= config.LOGIN_MAX_FAILURES * 5) {
    await delay(loginDelayMs(Math.max(byPair, 1)))
    await writeAudit(prisma, { action: 'auth.login.rate_limited', ip, metadata: { emailHash: sha256(email) } })
    throw new AppError(429, 'rate_limited', 'Too many login attempts')
  }
}

async function recordFailure(ip: string, email: string) {
  const prisma = getPrisma()
  await prisma.loginAttempt.createMany({ data: [{ key: pairKey(ip, email) }, { key: `ip:${ip}` }] })
  const since = new Date(Date.now() - 15 * 60 * 1000)
  const count = await prisma.loginAttempt.count({ where: { key: pairKey(ip, email), createdAt: { gt: since } } })
  await delay(loginDelayMs(count))
}

async function clearFailures(ip: string, email: string) {
  await getPrisma().loginAttempt.deleteMany({ where: { key: { in: [pairKey(ip, email), `ip:${ip}`] } } })
}

async function loadInvite(token: string) {
  const invite = await getPrisma().adminInvite.findUnique({ where: { tokenHash: sha256(token) } })
  if (!invite || invite.usedAt || invite.expiresAt.getTime() < Date.now()) {
    throw new AppError(410, 'invite_invalid', 'Invite is invalid or expired')
  }
  return invite
}

export async function recordMfaFailure(adminId: string): Promise<number> {
  const updated = await getPrisma().adminUser.update({
    where: { id: adminId },
    data: { mfaFailedAttempts: { increment: 1 } },
    select: { mfaFailedAttempts: true },
  })
  if (updated.mfaFailedAttempts >= MFA_MAX_FAILURES) {
    await getPrisma().adminUser.update({
      where: { id: adminId },
      data: { mfaLockedUntil: new Date(Date.now() + MFA_LOCK_MS) },
    })
  }
  return updated.mfaFailedAttempts
}

/** One winner for this time-step. `false` means another request already stored this step or a newer one. */
export async function claimTotpStep(adminId: string, step: number): Promise<boolean> {
  const updated = await getPrisma().adminUser.updateMany({
    where: {
      id: adminId,
      OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
    },
    data: { totpLastStep: step, mfaFailedAttempts: 0, mfaLockedUntil: null },
  })
  return updated.count === 1
}

async function enforceDistributedLimit(limiter: RateLimiter, key: string) {
  try {
    const decision = await limiter.check(key)
    if (!decision.allowed) throw new AppError(429, 'rate_limited', 'Too many requests', decision.retryAfterSec)
  } catch (error) {
    if (error instanceof AppError) throw error
    if (error instanceof RateLimitUnavailableError) {
      throw new AppError(503, 'rate_limiter_unavailable', 'Authentication is temporarily unavailable', error.retryAfterSec)
    }
    throw error
  }
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getDummyHash(): Promise<string> {
  dummyHash ??= await hashPassword('oxxx-dummy-password-not-used')
  return dummyHash
}
