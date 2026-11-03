import type { FastifyRequest } from 'fastify'

export function requestIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0]!.trim()
  return request.ip
}

export function requestUserAgent(request: FastifyRequest): string | null {
  const value = request.headers['user-agent']
  return typeof value === 'string' ? value.slice(0, 300) : null
}
