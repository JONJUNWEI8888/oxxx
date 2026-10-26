import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { TradeTerminal } from '@/components/trade/trade-terminal'
import { CRYPTO_MARKETS, MARKETS, isCryptoSymbol } from '@/lib/markets'

export function generateStaticParams() {
  return CRYPTO_MARKETS.map((m) => ({ symbol: m.symbol }))
}

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const { symbol } = await params
  const upper = symbol.toUpperCase()
  if (!isCryptoSymbol(upper)) return {}
  const { base, quote } = MARKETS[upper]
  return {
    title: `${base}/${quote} 永续合约 | OXXX`,
    description: `OXXX ${base}/${quote} 永续合约实时行情、标记价格、资金费率、订单簿与 K 线。`,
  }
}

export default async function FuturesPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const upper = symbol.toUpperCase()
  if (!isCryptoSymbol(upper)) notFound()
  return <TradeTerminal symbol={upper} mode="swap" />
}
