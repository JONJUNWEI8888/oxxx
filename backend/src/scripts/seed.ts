import { PrismaClient } from '@prisma/client'
import { loadConfig } from '../config'
import { encryptString } from '../crypto/pii'
import { hashPassword } from '../crypto/password'
import { generateTotpSecret } from '../crypto/totp'

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD ?? ''

if (!email) {
  if (process.env.NODE_ENV === 'production') {
    console.error('ADMIN_EMAIL is required to seed the super admin')
    process.exit(1)
  }
  console.log('ADMIN_EMAIL is unset; skipping super admin seed')
  process.exit(0)
}

if (password.length < 12) {
  console.error('ADMIN_PASSWORD must be at least 12 characters')
  process.exit(1)
}

const generated = !process.env.ADMIN_TOTP_SECRET
if (generated && process.env.NODE_ENV === 'production') {
  console.error('ADMIN_TOTP_SECRET is required in production')
  process.exit(1)
}
const totpSecret = process.env.ADMIN_TOTP_SECRET || generateTotpSecret()
const config = loadConfig()
const prisma = new PrismaClient()

const existing = await prisma.adminUser.findUnique({ where: { email } })
if (existing && process.env.ADMIN_RESET_PASSWORD !== 'true') {
  console.log(`super admin ${email} already exists`)
} else {
  const passwordHash = await hashPassword(password)
  const totpSecretCipher = encryptString(totpSecret, config.piiKey)
  await prisma.adminUser.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: 'super_admin',
      totpSecretCipher,
      totpEnabled: true,
      status: 'active',
    },
    update: {
      passwordHash,
      role: 'super_admin',
      totpSecretCipher,
      totpEnabled: true,
      status: 'active',
    },
  })
  console.log(`super admin ${email} ready`)
  if (generated) console.log(`generated ADMIN_TOTP_SECRET=${totpSecret}`)
}

await prisma.$disconnect()
