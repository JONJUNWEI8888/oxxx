import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { auth, buildTestApp, createAdmin, login, migrate, prisma, resetDb } from './helpers'

const personal = {
  legalName: 'Grace Hopper',
  dateOfBirth: '1906-12-09',
  country: 'US',
  documentType: 'id_card',
  documentNumber: 'ID-9988',
  address: '1 Navy Way',
}

describe('kyc review', () => {
  const appPromise = buildTestApp()

  beforeAll(migrate)
  beforeEach(resetDb)
  afterAll(async () => {
    await (await appPromise).close()
    await prisma.$disconnect()
  })

  it('approves once, rejects with a reason, and keeps documents off the public internet', async () => {
    const app = await appPromise
    await createAdmin('super_admin', 'root@example.com')
    await createAdmin('kyc_reviewer', 'review@example.com')
    await createAdmin('support', 'support@example.com')
    const superToken = await login(app, 'root@example.com')
    const reviewerToken = await login(app, 'review@example.com')
    const supportToken = await login(app, 'support@example.com')
    const reviewer = await prisma.adminUser.findUniqueOrThrow({ where: { email: 'review@example.com' } })

    const user = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: auth(superToken),
      payload: { email: 'grace@example.com' },
    })
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/kyc',
      headers: auth(superToken),
      payload: { userId: user.json().id, level: 'advanced', personal },
    })
    const id = created.json().id as string

    const approved = await app.inject({
      method: 'POST',
      url: `/api/v1/kyc/${id}/approve`,
      headers: auth(reviewerToken),
    })
    expect(approved.statusCode).toBe(200)
    expect(approved.json()).toMatchObject({ status: 'approved', rejectReason: null })
    const row = await prisma.kycApplication.findUniqueOrThrow({ where: { id } })
    expect(row.reviewerId).toBe(reviewer.id)
    expect(row.reviewedAt).toBeTruthy()
    const audit = await prisma.auditLog.findFirst({ where: { action: 'kyc.approve', targetId: id } })
    expect(audit?.actorId).toBe(reviewer.id)

    const again = await app.inject({
      method: 'POST',
      url: `/api/v1/kyc/${id}/approve`,
      headers: auth(reviewerToken),
    })
    expect(again.statusCode).toBe(409)

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/kyc',
      headers: auth(superToken),
      payload: { userId: user.json().id, level: 'basic', personal },
    })
    const missingReason = await app.inject({
      method: 'POST',
      url: `/api/v1/kyc/${second.json().id}/reject`,
      headers: auth(reviewerToken),
      payload: {},
    })
    expect(missingReason.statusCode).toBe(400)
    const rejected = await app.inject({
      method: 'POST',
      url: `/api/v1/kyc/${second.json().id}/reject`,
      headers: auth(reviewerToken),
      payload: { reason: 'document is cropped' },
    })
    expect(rejected.json()).toMatchObject({ status: 'rejected', rejectReason: 'document is cropped' })
    const rejectAudit = await prisma.auditLog.findFirst({ where: { action: 'kyc.reject', targetId: second.json().id } })
    expect(rejectAudit?.metadata).toMatchObject({ reason: 'document is cropped' })

    const supportReject = await app.inject({
      method: 'POST',
      url: `/api/v1/kyc/${second.json().id}/approve`,
      headers: auth(supportToken),
    })
    expect(supportReject.statusCode).toBe(403)

    const upload = await app.inject({
      method: 'POST',
      url: `/api/v1/kyc/${id}/documents`,
      headers: auth(superToken),
      payload: { fileName: 'passport.png', contentType: 'image/png' },
    })
    expect(upload.statusCode).toBe(200)
    const uploadUrl = new URL(upload.json().upload.url as string)
    expect(uploadUrl.pathname).toBe('/api/v1/storage/local')
    expect(upload.json().upload.url).not.toContain('amazonaws')
    const put = await app.inject({
      method: 'PUT',
      url: `${uploadUrl.pathname}${uploadUrl.search}`,
      headers: { 'content-type': 'image/png' },
      payload: Buffer.from('png-bytes'),
    })
    expect(put.statusCode).toBe(204)

    const link = await app.inject({
      method: 'GET',
      url: `/api/v1/kyc/${id}/documents/${upload.json().documentId}/url`,
      headers: auth(reviewerToken),
    })
    const downloadUrl = new URL(link.json().download.url as string)
    const open = await app.inject({ method: 'GET', url: '/api/v1/storage/local' })
    expect(open.statusCode).toBe(401)
    const file = await app.inject({ method: 'GET', url: `${downloadUrl.pathname}${downloadUrl.search}` })
    expect(file.statusCode).toBe(200)
    expect(file.body).toBe('png-bytes')
    const wrongType = await app.inject({
      method: 'PUT',
      url: `${uploadUrl.pathname}${uploadUrl.search}`,
      headers: { 'content-type': 'application/pdf' },
      payload: Buffer.from('not-a-pdf'),
    })
    expect(wrongType.statusCode).toBe(415)
    expect(file.headers['cache-control']).toContain('private')
  })
})
