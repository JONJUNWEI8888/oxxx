import { z } from 'zod'
import { cookieSecurityWarning } from './http/cookies'
import { parseAllowlist, type CidrRange } from './net/ip-allowlist'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  PII_ENCRYPTION_KEY: z.string().min(1),
  /** Legacy comma-separated origins. Ignored when ADMIN_CONSOLE_ORIGIN is set. */
  ADMIN_CORS_ORIGINS: z.string().default('http://localhost:3000'),
  /** Single admin-console origin, for example https://admin.oxxx.io. No path. */
  ADMIN_CONSOLE_ORIGIN: z.string().default(''),
  /** Comma-separated IPs and CIDRs. Required in production unless the opt-out below is exactly "true". */
  ADMIN_IP_ALLOWLIST: z.string().default(''),
  /** Set to the exact string "true" to allow every client IP. Production logs this loudly. */
  ADMIN_IP_ALLOWLIST_DISABLED: z.string().default(''),
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
  /** Trusted reverse-proxy hops. 0 ignores X-Forwarded-For. Never use "trust all". */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
})

export type AppConfig = z.infer<typeof envSchema> & {
  /** Origins the browser may call with credentials. One entry when ADMIN_CONSOLE_ORIGIN is set. */
  corsOrigins: string[]
  /** The admin console origin. Null when the legacy CORS list is in use. */
  consoleOrigin: string | null
  ipAllowlist: CidrRange[]
  /** True only when ADMIN_IP_ALLOWLIST_DISABLED is exactly "true". */
  ipAllowlistDisabled: boolean
  piiKey: Buffer
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env)
  if (parsed.STORAGE_DRIVER === 's3' && (!parsed.S3_BUCKET || !parsed.S3_ACCESS_KEY_ID || !parsed.S3_SECRET_ACCESS_KEY)) {
    throw new Error('S3 storage requires S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY')
  }
  const consoleOrigin = parseConsoleOrigin(parsed.ADMIN_CONSOLE_ORIGIN)
  let ipAllowlist: CidrRange[] = []
  try {
    ipAllowlist = parseAllowlist(parsed.ADMIN_IP_ALLOWLIST)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ADMIN_IP_ALLOWLIST is invalid'
    throw new Error(message)
  }
  const ipAllowlistDisabled = parsed.ADMIN_IP_ALLOWLIST_DISABLED === 'true'
  if (parsed.NODE_ENV === 'production') {
    if (ipAllowlistDisabled && ipAllowlist.length > 0) {
      throw new Error('ADMIN_IP_ALLOWLIST_DISABLED=true conflicts with a non-empty ADMIN_IP_ALLOWLIST')
    }
    if (!ipAllowlistDisabled && ipAllowlist.length === 0) {
      throw new Error(
        'Refusing to start: production requires ADMIN_IP_ALLOWLIST (comma-separated CIDRs). Set ADMIN_IP_ALLOWLIST_DISABLED=true only to explicitly allow every client IP.',
      )
    }
  }
  const legacyOrigins = parsed.ADMIN_CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  return {
    ...parsed,
    consoleOrigin,
    corsOrigins: consoleOrigin ? [consoleOrigin] : legacyOrigins,
    ipAllowlist,
    ipAllowlistDisabled,
    piiKey: decodeKey(parsed.PII_ENCRYPTION_KEY),
  }
}

export function startupWarnings(config: AppConfig): string[] {
  const warnings: string[] = []
  if (config.ipAllowlistDisabled) {
    warnings.push(
      'SECURITY: ADMIN_IP_ALLOWLIST_DISABLED=true — every client IP can reach admin and auth routes. Do not use this opt-out in a real deployment.',
    )
  }
  if (config.NODE_ENV === 'production' && !config.consoleOrigin) {
    warnings.push(
      'ADMIN_CONSOLE_ORIGIN is unset. CORS is falling back to ADMIN_CORS_ORIGINS. Set ADMIN_CONSOLE_ORIGIN to the admin console origin.',
    )
  }
  const cookieWarning = cookieSecurityWarning(config)
  if (cookieWarning) warnings.push(cookieWarning)
  return warnings
}

function parseConsoleOrigin(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new Error('ADMIN_CONSOLE_ORIGIN must be an absolute origin, for example https://admin.oxxx.io')
  }
  if (url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('ADMIN_CONSOLE_ORIGIN must be an origin without a path, query, or credentials')
  }
  return url.origin
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
