import type { AdminRole } from '@prisma/client'

declare module 'fastify' {
  interface FastifyRequest {
    admin: { id: string; email: string; role: AdminRole } | null
  }
}

export type AdminActor = { id: string; email: string; role: AdminRole }
