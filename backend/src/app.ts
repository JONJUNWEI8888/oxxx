import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify from 'fastify'
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod'
import type { AppConfig } from './config'
import { AppError } from './errors'
import { assertCsrf } from './http/csrf'
import { requestIp } from './http'
import { ipInAllowlist, isAdminNetworkRoute, isNoIndexRoute } from './net/ip-allowlist'
import { adminRoutes } from './routes/admins'
import { auditRoutes } from './routes/audit'
import { authRoutes } from './routes/auth'
import { internalRoutes } from './routes/internal'
import { kycRoutes } from './routes/kyc'
import { presaleRoutes } from './routes/presale'
import { storageRoutes } from './routes/storage'
import { userRoutes } from './routes/users'
import { createObjectStorage } from './storage'
import { getSharedRateLimiter, type RateLimiter } from '../../lib/presale-ledger/rate-limit'
import './types'

export async function buildApp(config: AppConfig, options?: { authLimiter?: RateLimiter }) {
  const app = Fastify({
    logger: config.NODE_ENV === 'production',
    trustProxy: (_address: string, hop: number) => hop < config.TRUST_PROXY_HOPS,
    bodyLimit: 10 * 1024 * 1024,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.decorateRequest('admin', null)

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) callback(null, true)
      else callback(null, false)
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization', 'x-cron-secret', 'x-csrf-token'],
    exposedHeaders: ['retry-after'],
  })
  await app.register(rateLimit, { max: config.RATE_LIMIT_MAX, timeWindow: '1 minute' })
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'OXXX Admin API',
        version: '1.0.0',
        description:
          'Admin API for the separate admin console. Authorization is enforced on the server. GET /api/v1/auth/me returns permissions only so the UI can hide controls. Browser sessions use host-only httpOnly cookies (no Domain attribute, so they are not shared with the public site) plus an X-CSRF-Token header on cookie-authenticated mutations. CORS allows only ADMIN_CONSOLE_ORIGIN when that variable is set. ADMIN_IP_ALLOWLIST, when non-empty, restricts auth and admin routes using request.ip after TRUST_PROXY_HOPS. Responses under /api and /docs send X-Robots-Tag: noindex.',
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          cookieAuth: { type: 'apiKey', in: 'cookie', name: 'oxxx_admin_access' },
          csrfHeader: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
        },
      },
    },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })

  app.addHook('onRequest', async (request, reply) => {
    if (isNoIndexRoute(request.url)) reply.header('x-robots-tag', 'noindex, nofollow')
    if (!isAdminNetworkRoute(request.url) || config.ipAllowlist.length === 0) return
    if (!ipInAllowlist(requestIp(request), config.ipAllowlist)) {
      throw new AppError(403, 'ip_forbidden', 'This network is not allowed to call the admin API')
    }
  })
  app.addHook('preHandler', async (request) => {
    assertCsrf(request, config)
  })

  const storage = createObjectStorage(config)
  const authLimiter = options?.authLimiter ?? getSharedRateLimiter({
    name: 'admin-auth',
    limit: 30,
    windowMs: 60_000,
    policy: 'closed',
  })
  await authRoutes(app, config, authLimiter)
  await adminRoutes(app, config)
  await userRoutes(app, config)
  await kycRoutes(app, config, storage)
  await auditRoutes(app, config)
  await presaleRoutes(app, config)
  await internalRoutes(app)
  await storageRoutes(app, config, storage)

  app.get('/health', { schema: { tags: ['meta'] } }, async () => ({ ok: true }))

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: { code: 'not_found', message: 'Not found' } })
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      if (error.retryAfterSec) reply.header('retry-after', String(error.retryAfterSec))
      return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } })
    }
    const err = error as { statusCode?: number; message?: string }
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500
    if (statusCode === 429) {
      return reply.code(429).send({ error: { code: 'rate_limited', message: 'Too many requests' } })
    }
    if (statusCode === 400) {
      return reply.code(400).send({ error: { code: 'validation_error', message: err.message ?? 'Invalid request' } })
    }
    request.log.error(error)
    return reply.code(500).send({ error: { code: 'internal_error', message: 'Internal error' } })
  })

  return app
}
