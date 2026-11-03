import type { FastifyInstance } from 'fastify'
import type { AppConfig } from '../config'
import { AppError } from '../errors'
import { verifyStorageToken, type ObjectStorage } from '../storage'

const BINARY = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/octet-stream']

export async function storageRoutes(app: FastifyInstance, config: AppConfig, storage: ObjectStorage) {
  for (const type of BINARY) {
    if (!app.hasContentTypeParser(type)) {
      app.addContentTypeParser(type, { parseAs: 'buffer' }, (_request, body, done) => done(null, body))
    }
  }

  app.put('/api/v1/storage/local', { schema: { tags: ['storage'], hide: true } }, async (request, reply) => {
    const token = tokenFrom(request.query)
    const payload = verifyStorageToken(token, config.JWT_SECRET)
    if (!payload || payload.op !== 'put') throw new AppError(401, 'invalid_storage_token', 'Upload URL is invalid or expired')
    if (!Buffer.isBuffer(request.body)) throw new AppError(400, 'invalid_body', 'Upload body must be raw bytes')
    await storage.putObject(payload.key, request.body, payload.contentType ?? 'application/octet-stream')
    return reply.code(204).send()
  })

  app.get('/api/v1/storage/local', { schema: { tags: ['storage'], hide: true } }, async (request, reply) => {
    const token = tokenFrom(request.query)
    const payload = verifyStorageToken(token, config.JWT_SECRET)
    if (!payload || payload.op !== 'get') throw new AppError(401, 'invalid_storage_token', 'Download URL is invalid or expired')
    const object = await storage.getObject(payload.key)
    if (!object) throw new AppError(404, 'not_found', 'Object not found')
    return reply.header('content-type', object.contentType).header('cache-control', 'private, no-store').send(object.body)
  })
}

function tokenFrom(query: unknown): string {
  const token = (query as { token?: unknown }).token
  if (typeof token !== 'string' || !token) throw new AppError(401, 'invalid_storage_token', 'Missing storage token')
  return token
}
