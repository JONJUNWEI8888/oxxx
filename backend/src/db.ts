import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { adminPrisma?: PrismaClient }

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.adminPrisma) {
    globalForPrisma.adminPrisma = new PrismaClient()
  }
  return globalForPrisma.adminPrisma
}
