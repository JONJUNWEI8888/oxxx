import { timingSafeEqual } from 'crypto'

export function authorizeCron(request: Request, env: NodeJS.ProcessEnv = process.env): boolean {
  const secret = env.CRON_SECRET ?? ''
  if (!secret) return false
  const header = request.headers.get('authorization') ?? ''
  const bearer = /^bearer\s+/i.test(header) ? header.replace(/^bearer\s+/i, '') : ''
  const alternate = request.headers.get('x-cron-secret') ?? ''
  return safeEqual(bearer, secret) || safeEqual(alternate, secret)
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length || a.length === 0) return false
  return timingSafeEqual(a, b)
}
