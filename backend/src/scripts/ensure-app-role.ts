import { PrismaClient } from '@prisma/client'

const password = process.env.APP_DB_PASSWORD ?? ''
if (!password) {
  console.log('APP_DB_PASSWORD is unset; the API keeps using the migration role')
  process.exit(0)
}

const prisma = new PrismaClient()
try {
  const privilege = await prisma.$queryRaw<Array<{ ok: boolean }>>`
    SELECT (rolsuper OR rolcreaterole) AS ok
    FROM pg_roles
    WHERE rolname = current_user
  `
  if (!privilege[0]?.ok) {
    console.log('current database user cannot create roles; run prisma/production-app-role.sql as the owner')
    process.exit(0)
  }
  const databases = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
  const dbName = databases[0]?.name ?? ''
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(dbName)) {
    throw new Error('refusing to grant on an unexpected database name')
  }
  const passwordSql = `'${password.replace(/'/g, "''")}'`
  const existing = await prisma.$queryRaw<Array<{ rolname: string }>>`
    SELECT rolname FROM pg_roles WHERE rolname = 'oxxx_app'
  `
  if (existing.length === 0) {
    await prisma.$executeRawUnsafe(`CREATE ROLE oxxx_app LOGIN PASSWORD ${passwordSql}`)
  } else {
    await prisma.$executeRawUnsafe(`ALTER ROLE oxxx_app WITH LOGIN PASSWORD ${passwordSql}`)
  }
  await prisma.$executeRawUnsafe(`GRANT CONNECT ON DATABASE ${dbName} TO oxxx_app`)
  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO oxxx_app`)
  await prisma.$executeRawUnsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO oxxx_app`,
  )
  await prisma.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO oxxx_app`)
  await prisma.$executeRawUnsafe(`REVOKE ALL ON TABLE audit_logs FROM oxxx_app`)
  await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT ON TABLE audit_logs TO oxxx_app`)
  await prisma.$executeRawUnsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO oxxx_app`,
  )
  await prisma.$executeRawUnsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO oxxx_app`,
  )
  console.log('oxxx_app can INSERT and SELECT audit_logs only, and does not own the table')
} finally {
  await prisma.$disconnect()
}
