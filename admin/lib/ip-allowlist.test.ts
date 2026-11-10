import assert from 'node:assert/strict'
import test from 'node:test'
import { clientIpFromHeaders, ipAllowed, parseAllowlist } from './ip-allowlist.ts'

test('empty allowlist allows everyone', () => {
  assert.equal(parseAllowlist(undefined), null)
  assert.equal(parseAllowlist('  '), null)
  assert.equal(ipAllowed('203.0.113.5', null), true)
  assert.equal(ipAllowed(null, null), true)
})

test('exact IPv4, mapped IPv6, and CIDR', () => {
  const rules = parseAllowlist('203.0.113.8, 10.0.0.0/8, ::1')
  assert.equal(ipAllowed('203.0.113.8', rules), true)
  assert.equal(ipAllowed('::ffff:203.0.113.8', rules), true)
  assert.equal(ipAllowed('10.1.2.3', rules), true)
  assert.equal(ipAllowed('11.0.0.1', rules), false)
  assert.equal(ipAllowed('::1', rules), true)
  assert.equal(ipAllowed(null, rules), false)
})

test('rejects a bad entry', () => {
  assert.throws(() => parseAllowlist('not-an-ip'))
})

test('prefers the Vercel forwarded header', () => {
  const headers = new Headers({
    'x-vercel-forwarded-for': '198.51.100.20, 10.0.0.1',
    'x-forwarded-for': '1.2.3.4',
  })
  assert.equal(clientIpFromHeaders(headers), '198.51.100.20')
})
