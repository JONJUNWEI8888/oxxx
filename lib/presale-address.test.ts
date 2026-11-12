import { describe, expect, it } from 'vitest'
import { checkPresaleAddress, presaleChain } from './presale-address'

describe('presale wallet check', () => {
  it('follows the chain implied by the presale receiver', () => {
    expect(presaleChain()).toBe('evm')
    expect(checkPresaleAddress('0x1111111111111111111111111111111111111111')).toBe('ok')
    expect(checkPresaleAddress('  0xAbCdEf0123456789aBcDef0123456789abCDef01  ')).toBe('ok')
    expect(checkPresaleAddress('T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb')).toBe('wrong-chain')
    expect(checkPresaleAddress('0x1234')).toBe('invalid')
    expect(checkPresaleAddress('   ')).toBe('empty')
  })
})
