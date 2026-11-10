import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, parseRetryAfter, userMessage } from './errors.ts'

test('429 and 503 ask the operator to retry later', () => {
  assert.equal(userMessage(new ApiError(429, 'rate_limited', 'Too many requests', 12)), '请稍后重试（约 12 秒）')
  assert.equal(userMessage(new ApiError(503, 'rate_limiter_unavailable', 'down', null)), '请稍后重试')
  assert.equal(userMessage(new ApiError(503, 'backend_unavailable', 'down', 5)), '请稍后重试（约 5 秒）')
})

test('401 and 403 stay specific', () => {
  assert.equal(userMessage(new ApiError(401, 'invalid_credentials', 'no', null)), '邮箱或密码不正确')
  assert.equal(userMessage(new ApiError(401, 'unauthorized', 'no', null)), '登录已失效，请重新登录')
  assert.equal(userMessage(new ApiError(403, 'forbidden', 'no', null)), '没有权限执行此操作')
  assert.equal(
    userMessage(new ApiError(403, 'enrollment_required', 'no', null)),
    '此账号需要通过邀请链接完成验证器绑定后才能登录',
  )
})

test('parses Retry-After seconds and HTTP dates', () => {
  assert.equal(parseRetryAfter('8'), 8)
  const later = new Date(Date.now() + 20_000).toUTCString()
  const parsed = parseRetryAfter(later)
  assert.ok(parsed != null && parsed >= 15 && parsed <= 25)
  assert.equal(parseRetryAfter(null), null)
})
