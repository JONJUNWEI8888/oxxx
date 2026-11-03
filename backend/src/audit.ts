import type { Prisma, PrismaClient } from '@prisma/client'

export async function writeAudit(
  prisma: PrismaClient,
  entry: {
    actorId?: string | null
    action: string
    targetType?: string | null
    targetId?: string | null
    metadata?: Record<string, unknown>
    ip?: string | null
    userAgent?: string | null
  },
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata as Prisma.InputJsonValue | undefined,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    },
  })
}
