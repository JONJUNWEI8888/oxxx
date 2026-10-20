export type MarketCategory = {
  id: string
  label: string
  symbols: string[]
}

export const MARKET_CATEGORIES: MarketCategory[] = [
  {
    id: 'btc',
    label: 'BTC 生态',
    symbols: ['BTC', 'WBTC', 'ORDI', 'STX', '1000SATS', 'BCH', 'LTC', 'RUNE', 'PAXG'],
  },
  {
    id: 'ai',
    label: 'AI 科技',
    symbols: ['FET', 'RENDER', 'TAO', 'WLD', 'ARKM', 'NEAR', 'VIRTUAL', 'ICP', 'GRT'],
  },
  {
    id: 'bluechip',
    label: '加密蓝筹',
    symbols: ['BTC', 'ETH', 'BNB', 'XRP', 'SOL', 'DOGE', 'ADA', 'TRX', 'LINK'],
  },
  {
    id: 'mining',
    label: '挖矿与算力',
    symbols: ['BTC', 'LTC', 'BCH', 'ETC', 'DASH', 'ZEC', 'FIL', 'AR', 'RVN'],
  },
  {
    id: 'l1',
    label: '公链生态',
    symbols: ['ETH', 'SOL', 'AVAX', 'DOT', 'SUI', 'APT', 'TON', 'SEI', 'TIA'],
  },
]

export const QUOTE = 'USDT'

export const ALL_SYMBOLS = Array.from(
  new Set(MARKET_CATEGORIES.flatMap((c) => c.symbols)),
).map((base) => `${base}${QUOTE}`)

export type Ticker = {
  symbol: string
  price: number
  changePercent: number
}

export function formatPrice(price: number) {
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  if (price >= 0.01) return price.toFixed(4)
  return price.toPrecision(4)
}
