import type { FastifyInstance } from 'fastify'
import type { AppConfig } from '../config'
import { AppError } from '../errors'
import { verifyStorageToken, type ObjectStorage } from '../storage'

const BINARY = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/octet-stream']
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

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
    if (request.body.length === 0 || request.body.length > MAX_UPLOAD_BYTES) {
      throw new AppError(413, 'upload_too_large', 'Upload must be between 1 byte and 8 MB')
    }
    const sent = String(request.headers['content-type'] ?? '').split(';')[0]?.trim().toLowerCase()
    const expected = (payload.contentType ?? '').toLowerCase()
    if (!expected || sent !== expected || !BINARY.includes(expected)) {
      throw new AppError(415, 'unsupported_media_type', 'Upload content type does not match the signed URL')
    }
    await storage.putObject(payload.key, request.body, expected)
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
