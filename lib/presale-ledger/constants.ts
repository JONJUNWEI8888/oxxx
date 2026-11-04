/** keccak256("Transfer(address,address,uint256)") */
export const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

export const BALANCE_OF_SELECTOR = '0x70a08231'

export const BSC_CHAIN_ID = 56

export const USDT_DECIMALS = 18

/** Credit a transfer only after this many blocks have been built on top of it. */
export const CONFIRMATION_DEPTH = 15

export const DEFAULT_RPC_URLS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed1.ninicoin.io',
] as const

export const INDEXER_STATE_ID = 'bsc-usdt-presale'

export const PRESALE_CACHE_TTL_MS = 10_000

export const PRESALE_CACHE_STALE_MS = 30_000

export const PRESALE_RATE_LIMIT = 30

export const PRESALE_RATE_WINDOW_MS = 60_000

export const ADDRESS_RATE_LIMIT = 20
