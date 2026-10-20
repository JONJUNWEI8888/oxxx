import { ALL_SYMBOLS, type Ticker } from '@/lib/markets'

const WANTED = new Set(ALL_SYMBOLS)

type BinanceTicker = {
  symbol: string
  lastPrice: string
  priceChangePercent: string
}

export async function GET() {
  try {
    const res = await fetch('https://data-api.binance.vision/api/v3/ticker/24hr', {
      next: { revalidate: 5 },
    })
    if (!res.ok) throw new Error(`Upstream ${res.status}`)
    const all = (await res.json()) as BinanceTicker[]
    const tickers: Ticker[] = all
      .filter((t) => WANTED.has(t.symbol))
      .map((t) => ({
        symbol: t.symbol,
        price: Number(t.lastPrice),
        changePercent: Number(t.priceChangePercent),
      }))
    return Response.json({ tickers })
  } catch (error) {
    return Response.json(
      { tickers: [], error: error instanceof Error ? error.message : 'Failed to load tickers' },
      { status: 502 },
    )
  }
}
