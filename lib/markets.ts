import type { Bi } from '@/lib/i18n'

export type MarketCategory = {
  id: string
  label: string
  labelEn: string
  symbols: string[]
}

export const MARKET_CATEGORIES: MarketCategory[] = [
  {
    id: 'btc',
    label: 'BTC 生态',
    labelEn: 'BTC Ecosystem',
    symbols: ['BTC', 'WBTC', 'ORDI', 'STX', '1000SATS', 'BCH', 'LTC', 'RUNE', 'PAXG'],
  },
  {
    id: 'ai',
    label: 'AI 科技',
    labelEn: 'AI & Tech',
    symbols: ['FET', 'RENDER', 'TAO', 'WLD', 'ARKM', 'NEAR', 'VIRTUAL', 'ICP', 'GRT'],
  },
  {
    id: 'bluechip',
    label: '加密蓝筹',
    labelEn: 'Crypto Blue Chips',
    symbols: ['BTC', 'ETH', 'BNB', 'XRP', 'SOL', 'DOGE', 'ADA', 'TRX', 'LINK'],
  },
  {
    id: 'mining',
    label: '挖矿与算力',
    labelEn: 'Mining & Hashpower',
    symbols: ['BTC', 'LTC', 'BCH', 'ETC', 'DASH', 'ZEC', 'FIL', 'AR', 'RVN'],
  },
  {
    id: 'l1',
    label: '公链生态',
    labelEn: 'Layer 1 Ecosystem',
    symbols: ['ETH', 'SOL', 'AVAX', 'DOT', 'SUI', 'APT', 'TON', 'SEI', 'TIA'],
  },
]

export const QUOTE = 'USDT'

export const ALL_SYMBOLS = Array.from(new Set(MARKET_CATEGORIES.flatMap((c) => c.symbols))).map((base) => `${base}${QUOTE}`)

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

export const MARKETS = {
  BTCUSDT: {
    symbol: 'BTCUSDT',
    base: 'BTC',
    quote: 'USDT',
    name: { zh: '比特币', en: 'Bitcoin' } as Bi,
    priceDp: 2,
    qtyDp: 3,
    ctVal: 0.01,
  },
  ETHUSDT: {
    symbol: 'ETHUSDT',
    base: 'ETH',
    quote: 'USDT',
    name: { zh: '以太坊', en: 'Ethereum' } as Bi,
    priceDp: 2,
    qtyDp: 3,
    ctVal: 0.1,
  },
} as const

export type MarketSymbol = keyof typeof MARKETS
export type Market = (typeof MARKETS)[MarketSymbol]
export const MARKET_LIST: Market[] = Object.values(MARKETS)

export function isMarketSymbol(value: string): value is MarketSymbol {
  return Object.hasOwn(MARKETS, value)
}

export const INTERVALS = [
  { value: '1m', label: { zh: '1分', en: '1m' } },
  { value: '5m', label: { zh: '5分', en: '5m' } },
  { value: '15m', label: { zh: '15分', en: '15m' } },
  { value: '1h', label: { zh: '1时', en: '1H' } },
  { value: '4h', label: { zh: '4时', en: '4H' } },
  { value: '1d', label: { zh: '1天', en: '1D' } },
  { value: '1w', label: { zh: '1周', en: '1W' } },
] as const satisfies readonly { value: string; label: Bi }[]

export type Interval = (typeof INTERVALS)[number]['value']

export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export const CHART_COLORS = {
  up: '#2ebd85',
  down: '#f6465d',
  upVolume: 'rgba(46, 189, 133, 0.45)',
  downVolume: 'rgba(246, 70, 93, 0.45)',
  grid: 'rgba(255, 255, 255, 0.04)',
  border: '#231d21',
  text: 'rgba(255, 255, 255, 0.5)',
  crosshair: 'rgba(238, 154, 196, 0.5)',
  ma7: '#ffd9ec',
  ma25: '#ee9ac4',
  ma99: '#7d8bd6',
} as const

export type TradeMode = 'spot' | 'swap'

export function okxInstId(market: Pick<Market, 'base' | 'quote'>, mode: TradeMode) {
  return mode === 'swap' ? `${market.base}-${market.quote}-SWAP` : `${market.base}-${market.quote}`
}

export function tradeHref(mode: TradeMode, symbol: string) {
  return mode === 'swap' ? `/futures/${symbol}` : `/trade/${symbol}`
}

export const OKX_BARS: Record<Interval, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1H',
  '4h': '4H',
  '1d': '1Dutc',
  '1w': '1Wutc',
}

export async function fetchKlines(symbol: MarketSymbol, interval: Interval, mode: TradeMode): Promise<Candle[]> {
  const instId = okxInstId(MARKETS[symbol], mode)
  const res = await fetch(`https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${OKX_BARS[interval]}&limit=300`)
  if (!res.ok) throw new Error('Kline history unavailable')
  const body = (await res.json()) as { code: string; data: string[][] }
  if (body.code !== '0') throw new Error('Kline history unavailable')
  // OKX returns newest first; spot volume is in base units, swap volume in contracts (base volume at index 6).
  const volumeIndex = mode === 'swap' ? 6 : 5
  return body.data
    .map((row) => ({
      time: Number(row[0]),
      open: Number(row[1]),
      high: Number(row[2]),
      low: Number(row[3]),
      close: Number(row[4]),
      volume: Number(row[volumeIndex]),
    }))
    .reverse()
}

export function formatNumber(value: number | null | undefined, dp: number) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  return value.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
}

const compactFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 })

export function formatCompact(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  return compactFormatter.format(value)
}

export function formatSigned(value: number | null | undefined, dp: number, suffix = '') {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  return `${value >= 0 ? '+' : ''}${formatNumber(value, dp)}${suffix}`
}
