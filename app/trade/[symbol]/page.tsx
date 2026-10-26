import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TradeTerminal } from '@/components/trade/trade-terminal'
import { MARKETS, MARKET_LIST, isMarketSymbol } from '@/lib/markets'

export function generateStaticParams() {
  return MARKET_LIST.map((m) => ({ symbol: m.symbol }))
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params
  const upper = symbol.toUpperCase()
  if (!isMarketSymbol(upper)) return {}
  const { base, quote, kind, name } = MARKETS[upper]
  if (kind === 'stock') {
    return {
      title: `${base}/${quote} ${name.zh}代币化股票 | OXXX TradFi`,
      description: `用 USDT 交易 ${name.zh}（${MARKETS[upper].ticker}）代币化股票：实时行情、K线、订单簿与交易面板。`,
    }
  }
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
