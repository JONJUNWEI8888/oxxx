import type { FastifyRequest } from 'fastify'

/** Socket address after Fastify applies the configured proxy hop count. */
export function requestIp(request: FastifyRequest): string {
  return request.ip
}

export function requestUserAgent(request: FastifyRequest): string | null {
  const value = request.headers['user-agent']
  return typeof value === 'string' ? value.slice(0, 300) : null
}
