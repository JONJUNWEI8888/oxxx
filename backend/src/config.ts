import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  PII_ENCRYPTION_KEY: z.string().min(1),
  ADMIN_CORS_ORIGINS: z.string().default('http://localhost:3000'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_DIR: z.string().default('./var/storage'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),
  S3_ENDPOINT: z.string().optional().default(''),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional().default(''),
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('true'),
  CRON_SECRET: z.string().optional().default(''),
  ACCESS_TOKEN_TTL_SEC: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  LOGIN_MAX_FAILURES: z.coerce.number().int().positive().default(8),
  LOGIN_WINDOW_SEC: z.coerce.number().int().positive().default(900),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
})

export type AppConfig = z.infer<typeof envSchema> & {
  corsOrigins: string[]
  piiKey: Buffer
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env)
  if (parsed.STORAGE_DRIVER === 's3' && (!parsed.S3_BUCKET || !parsed.S3_ACCESS_KEY_ID || !parsed.S3_SECRET_ACCESS_KEY)) {
    throw new Error('S3 storage requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY')
  }
  return {
    ...parsed,
    corsOrigins: parsed.ADMIN_CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
    piiKey: decodeKey(parsed.PII_ENCRYPTION_KEY),
  }
}

function decodeKey(value: string): Buffer {
  const trimmed = value.trim()
  const fromBase64 = Buffer.from(trimmed, 'base64')
  if (fromBase64.length === 32 && fromBase64.toString('base64').replace(/=+$/, '') === trimmed.replace(/=+$/, '')) {
    return fromBase64
  }
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, 'hex')
  throw new Error('PII_ENCRYPTION_KEY must be 32 bytes, base64 or hex')
}
