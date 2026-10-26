'use client'

import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import { Footer } from '@/components/synapse/footer'
import { Navbar } from '@/components/synapse/navbar'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { STOCK_LOGOS, STOCK_MARKETS, formatCompact, formatNumber, formatSigned, okxInstId } from '@/lib/markets'
import { cn } from '@/lib/utils'

type StockTicker = { last: number; open24h: number; high24h: number; low24h: number; volCcy24h: number }

async function fetchStockTickers(): Promise<Record<string, StockTicker>> {
  const res = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SPOT')
  if (!res.ok) throw new Error('Tickers unavailable')
  const body = (await res.json()) as { code: string; data: Record<string, string>[] }
  if (body.code !== '0') throw new Error('Tickers unavailable')
  const wanted = new Map(STOCK_MARKETS.map((m) => [okxInstId(m, 'spot'), m.symbol]))
  const out: Record<string, StockTicker> = {}
  for (const row of body.data) {
    const symbol = wanted.get(row.instId)
    if (!symbol) continue
    out[symbol] = {
      last: Number(row.last),
      open24h: Number(row.sodUtc8) || Number(row.open24h),
      high24h: Number(row.high24h),
      low24h: Number(row.low24h),
      volCcy24h: Number(row.volCcy24h),
    }
  }
  return out
}

const FEATURES = [
  { title: { zh: '7×24 小时', en: '24/7 trading' }, body: { zh: '不受美股开收盘限制，周末与夜间同样可交易。', en: 'Trade nights and weekends, outside US market hours.' } },
  { title: { zh: 'USDT 结算', en: 'Settled in USDT' }, body: { zh: '无需换汇或开设券商账户，用加密货币直接下单。', en: 'No FX or brokerage account — trade straight from crypto.' } },
  { title: { zh: '1:1 锚定', en: '1:1 tracking' }, body: { zh: '每个代币追踪对应美股的价格，支持 0.01 股起碎股交易。', en: 'Each token tracks its share price, with fractional orders from 0.01.' } },
]

function StockRow({ symbol, ticker }: { symbol: string; ticker?: StockTicker }) {
  const { t } = useI18n()
  const market = STOCK_MARKETS.find((m) => m.symbol === symbol)!
  const change = ticker && ticker.open24h ? ((ticker.last - ticker.open24h) / ticker.open24h) * 100 : null
  const up = (change ?? 0) >= 0

  return (
    <li>
      <Link
        href={`/trade/${market.symbol}`}
        className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line px-4 py-5 transition-colors hover:bg-panel focus-visible:bg-panel focus-visible:outline-none md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:px-6"
      >
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-raised ring-1 ring-foreground/15">
            <Image src={STOCK_LOGOS[market.base]} alt="" width={22} height={22} className="size-5.5 invert" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-base text-foreground">
              {market.base}
              <span className="text-foreground/40">/{market.quote}</span>
            </span>
            <span className="truncate text-sm text-foreground/50">
              {t(market.name)} · {market.ticker}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end md:items-start">
          <span className="font-mono text-base tabular-nums text-foreground">{formatNumber(ticker?.last, market.priceDp)}</span>
          <span className={cn('text-sm tabular-nums md:hidden', up ? 'text-up' : 'text-down')}>{formatSigned(change, 2, '%')}</span>
        </div>

        <span className={cn('hidden text-base tabular-nums md:block', up ? 'text-up' : 'text-down')}>{formatSigned(change, 2, '%')}</span>

        <span className="hidden text-base tabular-nums text-foreground/70 md:block">{formatCompact(ticker?.volCcy24h)}</span>

        <span className="hidden rounded-full border border-gold/40 px-5 py-2 text-sm text-gold transition-colors group-hover:bg-gold group-hover:text-gold-deep md:block">
          {t('交易', 'Trade')}
        </span>
      </Link>
    </li>
  )
}

function TradfiContent() {
  const { t } = useI18n()
  const { data, error } = useSWR('okx-stock-tickers', fetchStockTickers, { refreshInterval: 5000 })

  return (
    <main className="min-h-screen bg-background pt-28 text-foreground">
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-14 md:px-6">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">TradFi</p>
        <h1 className="font-display text-5xl leading-tight tracking-wide text-balance md:text-7xl">
          {t('用加密货币交易美股', 'Trade US stocks with crypto')}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-foreground/60 text-pretty">
          {t(
            '使用加密货币交易股票、ETF 和大宗商品。首批开放苹果、英伟达、谷歌、特斯拉与麦当劳的代币化股票，价格实时同步。',
            'Trade stocks, ETFs and commodities with crypto. Tokenized Apple, NVIDIA, Alphabet, Tesla and McDonald’s are live first, priced in real time.',
          )}
        </p>
      </section>

      <section aria-labelledby="stocks-heading" className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="flex items-end justify-between gap-4 pb-4">
          <h2 id="stocks-heading" className="text-lg text-foreground">
            {t('代币化股票', 'Tokenized stocks')}
          </h2>
          <span className="flex items-center gap-2 text-sm text-foreground/50">
            <span className={cn('size-1.5 rounded-full', error ? 'bg-down' : 'bg-up')} aria-hidden="true" />
            {error ? t('行情暂不可用', 'Feed unavailable') : t('实时行情', 'Live prices')}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-line bg-panel px-6 py-3 text-sm text-foreground/40 md:grid">
            <span>{t('名称', 'Name')}</span>
            <span>{t('最新价 (USDT)', 'Last (USDT)')}</span>
            <span>{t('24h 涨跌', '24h change')}</span>
            <span>{t('24h 成交额', '24h volume')}</span>
            <span className="w-18" />
          </div>
          <ul>
            {STOCK_MARKETS.map((m) => (
              <StockRow key={m.symbol} symbol={m.symbol} ticker={data?.[m.symbol]} />
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-px overflow-hidden px-4 pb-24 md:grid-cols-3 md:px-6">
        {FEATURES.map((f) => (
          <div key={f.title.en} className="flex flex-col gap-2 border-t border-line py-6 md:pr-8">
            <h3 className="text-base text-gold-light">{t(f.title)}</h3>
            <p className="text-sm leading-relaxed text-foreground/55">{t(f.body)}</p>
          </div>
        ))}
        <p className="pt-4 text-xs leading-relaxed text-foreground/35 md:col-span-3">
          {t(
            '*代币化股票不代表对标的公司的股权，不附带投票权或分红权。投资有风险，请谨慎决策。',
            '*Tokenized stocks do not represent equity and carry no voting or dividend rights. Trading involves risk.',
          )}
        </p>
      </section>
    </main>
  )
}

export function TradfiView() {
  return (
    <I18nProvider title={{ zh: 'TradFi 代币化股票 | OXXX', en: 'TradFi Tokenized Stocks | OXXX' }}>
      <Navbar visible />
      <TradfiContent />
      <Footer />
    </I18nProvider>
  )
}
