const OKX_REST = 'https://www.okx.com/api/v5'

export const OPTION_UNDERLYINGS = {
  'BTC-USDT': { slug: 'BTC-USDT', base: 'BTC', family: 'BTC-USD', ctVal: 0.01, strikeDp: 0, indexDp: 1 },
  'ETH-USDT': { slug: 'ETH-USDT', base: 'ETH', family: 'ETH-USD', ctVal: 0.1, strikeDp: 0, indexDp: 2 },
} as const

export type UnderlyingSlug = keyof typeof OPTION_UNDERLYINGS
export type Underlying = (typeof OPTION_UNDERLYINGS)[UnderlyingSlug]
export const UNDERLYING_LIST: Underlying[] = Object.values(OPTION_UNDERLYINGS)

export function isUnderlyingSlug(value: string): value is UnderlyingSlug {
  return Object.hasOwn(OPTION_UNDERLYINGS, value)
}

export type OptionSide = 'C' | 'P'

export type OptionQuote = {
  instId: string
  expiry: string
  strike: number
  side: OptionSide
  bid: number
  ask: number
  bidSz: number
  askSz: number
  last: number
  mark: number
  markIv: number
  bidIv: number
  askIv: number
  delta: number
  gamma: number
  theta: number
  vega: number
  oi: number
  volume: number
}

export type StrikeRow = { strike: number; call?: OptionQuote; put?: OptionQuote }

export type Expiry = { code: string; expiresAt: number; rows: StrikeRow[]; forward: number }

export type IndexInfo = { price: number; open24h: number; high24h: number; low24h: number }

export type OptionsBoard = { index: IndexInfo; expiries: Expiry[]; updatedAt: number }

type Row = Record<string, string>

async function okx(path: string): Promise<Row[]> {
  const res = await fetch(`${OKX_REST}${path}`)
  if (!res.ok) throw new Error(`OKX ${res.status}`)
  const json = (await res.json()) as { code: string; msg: string; data: Row[] }
  if (json.code !== '0') throw new Error(json.msg || 'OKX error')
  return json.data
}

const num = (v: string | undefined) => (v === undefined || v === '' ? Number.NaN : Number(v))

// OKX option expiries settle at 08:00 UTC on the expiry date.
function expiryTimestamp(code: string) {
  const y = 2000 + Number(code.slice(0, 2))
  const m = Number(code.slice(2, 4)) - 1
  const d = Number(code.slice(4, 6))
  return Date.UTC(y, m, d, 8)
}

export async function fetchOptionsBoard(underlying: Underlying): Promise<OptionsBoard> {
  const f = underlying.family
  const [tickers, summary, marks, interest, index] = await Promise.all([
    okx(`/market/tickers?instType=OPTION&instFamily=${f}`),
    okx(`/public/opt-summary?instFamily=${f}`),
    okx(`/public/mark-price?instType=OPTION&instFamily=${f}`),
    okx(`/public/open-interest?instType=OPTION&instFamily=${f}`),
    okx(`/market/index-tickers?instId=${f}`),
  ])

  const byId = (rows: Row[]) => new Map(rows.map((r) => [r.instId, r]))
  const summaryMap = byId(summary)
  const markMap = byId(marks)
  const oiMap = byId(interest)

  const expiryMap = new Map<string, { strikes: Map<number, StrikeRow>; forward: number }>()

  for (const t of tickers) {
    const [, , expiry, strikeStr, side] = t.instId.split('-')
    const s = summaryMap.get(t.instId)
    const strike = Number(strikeStr)
    const quote: OptionQuote = {
      instId: t.instId,
      expiry,
      strike,
      side: side as OptionSide,
      bid: num(t.bidPx),
      ask: num(t.askPx),
      bidSz: num(t.bidSz),
      askSz: num(t.askSz),
      last: num(t.last),
      mark: num(markMap.get(t.instId)?.markPx),
      markIv: num(s?.markVol),
      bidIv: num(s?.bidVol),
      askIv: num(s?.askVol),
      delta: num(s?.deltaBS),
      gamma: num(s?.gammaBS),
      theta: num(s?.thetaBS),
      vega: num(s?.vegaBS),
      oi: num(oiMap.get(t.instId)?.oi),
      volume: num(t.vol24h),
    }

    let bucket = expiryMap.get(expiry)
    if (!bucket) {
      bucket = { strikes: new Map(), forward: num(s?.fwdPx) }
      expiryMap.set(expiry, bucket)
    }
    const row = bucket.strikes.get(strike) ?? { strike }
    if (quote.side === 'C') row.call = quote
    else row.put = quote
    bucket.strikes.set(strike, row)
  }

  const now = Date.now()
  const expiries = Array.from(expiryMap, ([code, b]) => ({
    code,
    expiresAt: expiryTimestamp(code),
    forward: b.forward,
    rows: Array.from(b.strikes.values()).sort((a, b) => a.strike - b.strike),
  }))
    .filter((e) => e.expiresAt > now)
    .sort((a, b) => a.expiresAt - b.expiresAt)

  const idx = index[0]
  return {
    index: { price: num(idx?.idxPx), open24h: num(idx?.open24h), high24h: num(idx?.high24h), low24h: num(idx?.low24h) },
    expiries,
    updatedAt: now,
  }
}

export function formatExpiry(code: string, lang: 'zh-CN' | 'en') {
  const m = Number(code.slice(2, 4))
  const d = Number(code.slice(4, 6))
  if (lang === 'zh-CN') return `${m}月${d}日`
  return new Date(Date.UTC(2000, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function formatCountdown(ms: number, lang: 'zh-CN' | 'en') {
  if (ms <= 0) return lang === 'zh-CN' ? '已到期' : 'Expired'
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  if (lang === 'zh-CN') return days > 0 ? `${days}天${hours}小时` : `${hours}小时${minutes}分`
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`
}
