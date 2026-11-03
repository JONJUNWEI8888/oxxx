process.env.NODE_ENV = 'test'
process.env.DATABASE_URL ??= 'postgresql://oxxx:oxxx@localhost:5432/oxxx_test'
process.env.JWT_SECRET ??= 'test-jwt-secret-should-be-32-characters-long'
process.env.PII_ENCRYPTION_KEY ??= Buffer.from('0123456789abcdef0123456789abcdef').toString('base64')
process.env.ADMIN_CORS_ORIGINS ??= 'http://localhost:3000'
process.env.STORAGE_DRIVER ??= 'local'
process.env.LOCAL_STORAGE_DIR ??= '/tmp/oxxx-admin-storage'
process.env.PUBLIC_BASE_URL ??= 'http://127.0.0.1:4000'
process.env.CRON_SECRET ??= 'test-cron-secret'
process.env.RATE_LIMIT_MAX ??= '10000'

if (!String(process.env.DATABASE_URL).includes('oxxx_test')) {
  throw new Error('Refusing to run admin tests against a non-test database')
}
