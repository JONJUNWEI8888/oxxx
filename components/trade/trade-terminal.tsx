'use client'

import Link from 'next/link'
import { useState } from 'react'
import { LanguageSwitcher } from '@/components/synapse/language-switcher'
import { DesktopNavMenu } from '@/components/synapse/nav-menu'
import { type MarketSnapshot, useBinanceMarket } from '@/hooks/use-binance-market'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { INTERVALS, type Interval, MARKETS, MARKET_LIST, type Market, type MarketSymbol, formatNumber, formatSigned } from '@/lib/markets'
import { cn } from '@/lib/utils'
import { AccountPanel, PositionsPanel } from './account-panels'
import { InstrumentInfo } from './instrument-info'
import { MarketHeader } from './market-header'
import { OrderBook } from './order-book'
import { OrderForm } from './order-form'
import { PriceChart } from './price-chart'
import { TradingViewChart } from './tradingview-chart'

function TradeNav() {
  const { t } = useI18n()
  return (
    <header className="relative z-50 flex h-14 items-center justify-between gap-4 border-b border-line px-4">
      <div className="flex items-center gap-2">
        <Link href="/" aria-label={t('OXXX 首页', 'OXXX home')} className="logo-glow inline-flex">
          <span className="logo-wordmark font-display text-[26px] leading-none tracking-[0.04em]">OXXX</span>
        </Link>
        <div className="hidden md:block">
          <DesktopNavMenu />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a href="#" className="rounded-full bg-gold px-4 py-1.5 text-sm font-bold text-gold-deep transition-[filter] hover:brightness-110">
          {t('登录', 'Log in')}
        </a>
        <LanguageSwitcher />
      </div>
    </header>
  )
}

function ChartPanel({ market, snapshot, interval, onIntervalChange }: { market: Market; snapshot: MarketSnapshot; interval: Interval; onIntervalChange: (v: Interval) => void }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'chart' | 'info'>('chart')
  const [view, setView] = useState<'tradingview' | 'basic'>('tradingview')

  return (
    <section aria-label={t('K线图', 'Price chart')} className="flex h-[460px] min-w-0 flex-col rounded-lg bg-panel lg:h-full">
      <div className="flex flex-wrap items-center gap-x-6 border-b border-line px-3">
        <div role="tablist" className="flex gap-5">
          {(
            [
              ['chart', t('图表', 'Chart')],
              ['info', t('基础信息', 'Info')],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'relative py-3 text-sm transition-colors',
                tab === key ? 'font-bold text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-gold' : 'text-white/50 hover:text-white/80',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'chart' && view === 'basic' && (
          <div className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:none]" role="group" aria-label={t('K线周期', 'Interval')}>
            {INTERVALS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={interval === item.value}
                onClick={() => onIntervalChange(item.value)}
                className={cn(
                  'shrink-0 rounded-md px-2 py-1 text-xs transition-colors',
                  interval === item.value ? 'bg-gold/15 font-bold text-gold-light' : 'text-white/50 hover:text-white',
                )}
              >
                {t(item.label)}
              </button>
            ))}
          </div>
        )}
        {tab === 'chart' && (
          <div className="ml-auto flex items-center gap-1 py-2" role="group" aria-label={t('图表类型', 'Chart view')}>
            {(
              [
                ['basic', t('基本版', 'Basic')],
                ['tradingview', 'TradingView'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={cn(
                  'shrink-0 rounded-md px-2 py-1 text-xs transition-colors',
                  view === key ? 'bg-white/10 font-bold text-white' : 'text-white/50 hover:text-white',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={cn('min-h-0 flex-1', tab !== 'chart' && 'hidden')}>
        {view === 'tradingview' ? (
          <TradingViewChart market={market} interval={interval} />
        ) : (
          <PriceChart market={market} interval={interval} liveCandle={snapshot.candle} />
        )}
      </div>
      {tab === 'info' && <InstrumentInfo market={market} />}
    </section>
  )
}

function StatusBar({ snapshot }: { snapshot: MarketSnapshot }) {
  const { t } = useI18n()
  const online = snapshot.status === 'open'
  return (
    <footer className="flex h-9 items-center gap-6 overflow-x-auto border-t border-line px-4 text-xs [scrollbar-width:none]">
      <span className={cn('flex shrink-0 items-center gap-2', online ? 'text-up' : 'text-gold')}>
        <span className={cn('size-1.5 rounded-full', online ? 'bg-up' : 'animate-pulse bg-gold')} aria-hidden="true" />
        {online ? t('连接稳定', 'Connected') : snapshot.status === 'reconnecting' ? t('重新连接中', 'Reconnecting') : t('连接中', 'Connecting')}
      </span>
      {MARKET_LIST.map((m) => {
        const tk = snapshot.tickers[m.symbol]
        return (
          <Link key={m.symbol} href={`/trade/${m.symbol}`} className="flex shrink-0 gap-2 tabular-nums hover:text-white">
            <span className="text-white/80">
              {m.base}/{m.quote}
            </span>
            <span className="text-white/60">{formatNumber(tk?.last, m.priceDp)}</span>
            <span className={(tk?.changePct ?? 0) >= 0 ? 'text-up' : 'text-down'}>{formatSigned(tk?.changePct, 2, '%')}</span>
          </Link>
        )
      })}
      <a href="#" className="ml-auto shrink-0 text-white/50 hover:text-white">
        {t('风险声明', 'Risk Disclosure')}
      </a>
    </footer>
  )
}

function Terminal({ symbol }: { symbol: MarketSymbol }) {
  const market = MARKETS[symbol]
  const [interval, setChartInterval] = useState<Interval>('15m')
  const [leverage, setLeverage] = useState<number | null>(null)
  const snapshot = useBinanceMarket(symbol, interval)

  return (
    <div className="flex min-h-dvh flex-col bg-background font-sans text-foreground">
      <TradeNav />
      <main className="grid flex-1 grid-cols-1 gap-1 p-1 lg:grid-cols-[minmax(0,1fr)_260px_290px] lg:grid-rows-[auto_minmax(520px,1fr)_auto] xl:grid-cols-[minmax(0,1fr)_300px_330px]">
        <h1 className="sr-only">
          {market.base}/{market.quote}
        </h1>
        <div className="lg:col-span-2">
          <MarketHeader market={market} snapshot={snapshot} leverage={leverage} />
        </div>
        <ChartPanel market={market} snapshot={snapshot} interval={interval} onIntervalChange={setChartInterval} />
        <div className="h-[560px] lg:h-auto">
          <OrderBook market={market} snapshot={snapshot} />
        </div>
        <div className="lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <OrderForm market={market} snapshot={snapshot} leverage={leverage} onLeverageChange={setLeverage} />
        </div>
        <div className="lg:col-span-2">
          <PositionsPanel />
        </div>
        <AccountPanel />
      </main>
      <StatusBar snapshot={snapshot} />
    </div>
  )
}

export function TradeTerminal({ symbol }: { symbol: MarketSymbol }) {
  const { base, quote } = MARKETS[symbol]
  return (
    <I18nProvider title={{ zh: `${base}/${quote} 现货&杠杆交易 | OXXX`, en: `${base}/${quote} Spot & Margin | OXXX` }}>
      <Terminal symbol={symbol} />
    </I18nProvider>
  )
}
