import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TradeTerminal } from '@/components/trade/trade-terminal'
import { MARKETS, MARKET_LIST, isMarketSymbol } from '@/lib/markets'

export function generateStaticParams() {
  return MARKET_LIST.map((m) => ({ symbol: m.symbol }))
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params
  if (!isMarketSymbol(symbol)) return {}
  const { base, quote } = MARKETS[symbol]
  return {
    title: `${base}/${quote} 现货&杠杆交易 | OXXX`,
    description: `OXXX ${base}/${quote} 实时行情、K线、订单簿与交易面板。`,
  }
}

export default async function TradePage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const upper = symbol.toUpperCase()
  if (!isMarketSymbol(upper)) notFound()
  return <TradeTerminal symbol={upper} />
}
