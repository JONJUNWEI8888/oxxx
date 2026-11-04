import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify from 'fastify'
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod'
import type { AppConfig } from './config'
import { AppError } from './errors'
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
    allowedHeaders: ['content-type', 'authorization', 'x-cron-secret'],
  })
  await app.register(rateLimit, { max: config.RATE_LIMIT_MAX, timeWindow: '1 minute' })
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'OXXX Admin API',
        version: '1.0.0',
        description:
          'Admin API for exchange users, KYC review, audit history, and presale subscription ledger. Every route checks a role.',
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    transform: jsonSchemaTransform,
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })

  const storage = createObjectStorage(config)
  const authLimiter = options?.authLimiter ?? getSharedRateLimiter({
    name: 'admin-auth',
    limit: 30,
    windowMs: 60_000,
    policy: 'closed',
  })
  await authRoutes(app, config, authLimiter)
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
