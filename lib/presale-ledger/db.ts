import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { oxxxPrisma?: PrismaClient }

export function databaseConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.DATABASE_URL)
}

export function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
  if (!globalForPrisma.oxxxPrisma) {
    globalForPrisma.oxxxPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
  return globalForPrisma.oxxxPrisma
}
