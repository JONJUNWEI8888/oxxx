import { createHmac, timingSafeEqual } from 'crypto'
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { AppConfig } from './config'

export type SignedObject = {
  url: string
  method: 'PUT' | 'GET'
  headers: Record<string, string>
}

export interface ObjectStorage {
  signedUpload(input: { key: string; contentType: string; expiresInSec: number }): Promise<SignedObject>
  signedDownload(input: { key: string; expiresInSec: number }): Promise<SignedObject>
  putObject(key: string, body: Buffer, contentType: string): Promise<void>
  getObject(key: string): Promise<{ body: Buffer; contentType: string } | null>
}

export function createObjectStorage(config: AppConfig): ObjectStorage {
  if (config.STORAGE_DRIVER === 's3') return new S3ObjectStorage(config)
  return new LocalObjectStorage(config)
}

class LocalObjectStorage implements ObjectStorage {
  constructor(private readonly config: AppConfig) {}

  async signedUpload(input: { key: string; contentType: string; expiresInSec: number }): Promise<SignedObject> {
    const token = signToken(
      { key: input.key, op: 'put', exp: Math.floor(Date.now() / 1000) + input.expiresInSec, contentType: input.contentType },
      this.config.JWT_SECRET,
    )
    return {
      url: `${this.config.PUBLIC_BASE_URL}/api/v1/storage/local?token=${token}`,
      method: 'PUT',
      headers: { 'content-type': input.contentType },
    }
  }

  async signedDownload(input: { key: string; expiresInSec: number }): Promise<SignedObject> {
    const token = signToken(
      { key: input.key, op: 'get', exp: Math.floor(Date.now() / 1000) + input.expiresInSec },
      this.config.JWT_SECRET,
    )
    return {
      url: `${this.config.PUBLIC_BASE_URL}/api/v1/storage/local?token=${token}`,
      method: 'GET',
      headers: {},
    }
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    const file = resolveKey(this.config.LOCAL_STORAGE_DIR, key)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, body)
    await writeFile(`${file}.content-type`, contentType)
  }

  async getObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
    const file = resolveKey(this.config.LOCAL_STORAGE_DIR, key)
    try {
      const [body, contentType] = await Promise.all([
        readFile(file),
        readFile(`${file}.content-type`, 'utf8'),
      ])
      return { body, contentType }
    } catch {
      return null
    }
  }
}

class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client
  private readonly bucket: string

  constructor(private readonly config: AppConfig) {
    this.bucket = config.S3_BUCKET
    this.client = new S3Client({
      region: config.S3_REGION,
      endpoint: config.S3_ENDPOINT || undefined,
      forcePathStyle: config.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      },
    })
  }

  async signedUpload(input: { key: string; contentType: string; expiresInSec: number }): Promise<SignedObject> {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: input.key, ContentType: input.contentType }),
      { expiresIn: input.expiresInSec },
    )
    return { url, method: 'PUT', headers: { 'content-type': input.contentType } }
  }

  async signedDownload(input: { key: string; expiresInSec: number }): Promise<SignedObject> {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: input.key }),
      { expiresIn: input.expiresInSec },
    )
    return { url, method: 'GET', headers: {} }
  }

  async putObject(): Promise<void> {
    throw new Error('Direct uploads are handled by S3')
  }

  async getObject(): Promise<null> {
    return null
  }
}

type StorageToken = { key: string; op: 'put' | 'get'; exp: number; contentType?: string }

export function verifyStorageToken(token: string, secret: string): StorageToken | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StorageToken
    if ((payload.op !== 'put' && payload.op !== 'get') || typeof payload.key !== 'string') return null
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
    if (payload.key.includes('..') || payload.key.startsWith('/')) return null
    return payload
  } catch {
    return null
  }
}

function signToken(payload: StorageToken, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

function resolveKey(root: string, key: string): string {
  const full = path.resolve(root, key)
  const base = path.resolve(root)
  if (!full.startsWith(`${base}${path.sep}`)) throw new Error('Invalid storage key')
  return full
}
