import assert from 'node:assert/strict'
import test from 'node:test'
import { formatUsdt } from './labels.ts'

test('formats a huge exact decimal without converting to a number', () => {
  const amount = '123456789012345678901234567890.123456789012345678'
  assert.equal(
    formatUsdt(amount),
    '123,456,789,012,345,678,901,234,567,890.123456789012345678 USDT',
  )
})

test('pads short fractions to two digits and keeps a leading minus', () => {
  assert.equal(formatUsdt('1000'), '1,000.00 USDT')
  assert.equal(formatUsdt('250.5'), '250.50 USDT')
  assert.equal(formatUsdt('-0.5'), '-0.50 USDT')
})
