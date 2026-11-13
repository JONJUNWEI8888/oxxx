import assert from 'node:assert/strict'
import test from 'node:test'
import { readCsrf, readLoginChallenge, readProfile } from './parse.ts'
import { subscriberTransfersPath, userActionPath, withQuery } from './paths.ts'

test('profile parsing drops session tokens', () => {
  const profile = readProfile({
    expiresIn: 900,
    csrfToken: 'not-from-here',
    accessToken: 'do-not-keep',
    refreshToken: 'do-not-keep',
    admin: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'root@example.com',
      role: 'super_admin',
      permissions: ['users.read'],
    },
  })
  assert.deepEqual(profile, {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'root@example.com',
    role: 'super_admin',
    permissions: ['users.read'],
  })
  assert.equal('accessToken' in profile, false)
  assert.equal('refreshToken' in profile, false)
})

test('login challenge keeps only the MFA field', () => {
  const challenge = readLoginChallenge({ status: 'mfa', mfaToken: 'a'.repeat(24), accessToken: 'nope' })
  assert.deepEqual(challenge, { mfaToken: 'a'.repeat(24) })
})

test('csrf helper reads only csrfToken', () => {
  assert.equal(readCsrf({ csrfToken: 'abc', accessToken: 'nope' }), 'abc')
  assert.equal(readCsrf({ csrfToken: null }), null)
})

test('paths stay canonical', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  assert.equal(userActionPath(id, 'freeze'), `/api/v1/users/${id}/freeze`)
  assert.equal(
    subscriberTransfersPath('0x1111111111111111111111111111111111111111'),
    '/api/v1/presale/subscribers/0x1111111111111111111111111111111111111111/transfers',
  )
  assert.throws(() => userActionPath('%2e%2e', 'ban'))
  const query = withQuery('/api/v1/presale/subscriptions', { address: '0xabc', includePending: false, page: 1 })
  assert.equal(query.includes('%'), false)
  assert.match(query, /^\/api\/v1\/presale\/subscriptions\?/)
})
