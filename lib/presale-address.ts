import { PRESALE } from './presale'

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const TRON_ADDRESS = /^T[1-9A-HJ-NP-Za-km-z]{33}$/

export type PresaleChain = 'evm' | 'tron'

/** The presale receiver in `lib/presale.ts` decides which wallet format is accepted. */
export function presaleChain(): PresaleChain {
  return TRON_ADDRESS.test(PRESALE.address) ? 'tron' : 'evm'
}

export type AddressCheck = 'ok' | 'empty' | 'invalid' | 'wrong-chain'

export function checkPresaleAddress(value: string): AddressCheck {
  const trimmed = value.trim()
  if (!trimmed) return 'empty'
  const chain = presaleChain()
  const evm = EVM_ADDRESS.test(trimmed)
  const tron = TRON_ADDRESS.test(trimmed)
  if (chain === 'evm' && evm) return 'ok'
  if (chain === 'tron' && tron) return 'ok'
  if ((chain === 'evm' && tron) || (chain === 'tron' && evm)) return 'wrong-chain'
  return 'invalid'
}
