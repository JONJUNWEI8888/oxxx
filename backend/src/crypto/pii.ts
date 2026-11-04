import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto'

export function encryptString(plain: string, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`
}

export function decryptString(payload: string, key: Buffer): string {
  const [version, iv, tag, data] = payload.split(':')
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unknown ciphertext')
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8')
}

export function blindIndex(value: string, key: Buffer): string {
  const hmacKey = createHmac('sha256', key).update('oxxx-pii-blind-index').digest()
  return createHmac('sha256', hmacKey).update(value.trim().toLowerCase()).digest('hex')
}
