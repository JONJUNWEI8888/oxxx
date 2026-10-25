'use client'

import { Bitcoin, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { MarketSnapshot } from '@/hooks/use-binance-market'
import { useI18n } from '@/lib/i18n'
import { MARKET_LIST, type Market, formatCompact, formatNumber, formatSigned } from '@/lib/markets'
import { cn } from '@/lib/utils'

function CoinBadge({ base }: { base: string }) {
  return (
    <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-gold/15 font-sans text-xs font-bold text-gold ring-1 ring-gold/40">
      {base === 'BTC' ? <Bitcoin className="size-4" strokeWidth={2.2} /> : 'E'}
    </span>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex shrink-0 flex-col gap-0.5">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className={cn('text-[13px] tabular-nums text-white/90', tone)}>{value}</span>
    </div>
  )
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function PairSwitcher({ market, snapshot, leverage }: { market: Market; snapshot: MarketSnapshot; leverage: number | null }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg py-1 pr-1 transition-colors hover:text-gold-light"
      >
        <CoinBadge base={market.base} />
        <span className="text-xl font-bold text-white">
          {market.base}/{market.quote}
        </span>
        {leverage && <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/70">{leverage}x</span>}
        <ChevronDown className={cn('size-4 text-white/60 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <ul role="listbox" aria-label={t('选择交易对', 'Select market')} className="absolute left-0 top-full z-40 mt-2 w-72 rounded-xl border border-white/10 bg-panel p-2 shadow-2xl">
          {MARKET_LIST.map((m) => {
            const tk = snapshot.tickers[m.symbol]
            return (
              <li key={m.symbol} role="option" aria-selected={m.symbol === market.symbol}>
                <Link
                  href={`/trade/${m.symbol}`}
                  onClick={() => setOpen(false)}
                  className={cn('flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-white/[0.06]', m.symbol === market.symbol && 'bg-white/[0.04]')}
                >
                  <CoinBadge base={m.base} />
                  <span className="flex flex-col">
                    <span className="text-sm font-bold text-white">
                      {m.base}/{m.quote}
                    </span>
                    <span className="text-[11px] text-white/40">{t(m.name)}</span>
                  </span>
                  <span className="ml-auto flex flex-col items-end text-[12px] tabular-nums">
                    <span className="text-white/90">{formatNumber(tk?.last, m.priceDp)}</span>
                    <span className={(tk?.changePct ?? 0) >= 0 ? 'text-up' : 'text-down'}>{formatSigned(tk?.changePct, 2, '%')}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function MarketHeader({ market, snapshot, leverage }: { market: Market; snapshot: MarketSnapshot; leverage: number | null }) {
  const { t } = useI18n()
  const ticker = snapshot.tickers[market.symbol]
  const price = snapshot.lastPrice ?? ticker?.last ?? null
  const changeTone = (ticker?.change ?? 0) >= 0 ? 'text-up' : 'text-down'
  const priceTone = snapshot.direction === 'down' ? 'text-down' : 'text-up'
  const mark = snapshot.mark

  return (
    <section aria-label={t('行情概览', 'Market overview')} className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg bg-panel px-4 py-3">
      <PairSwitcher market={market} snapshot={snapshot} leverage={leverage} />

      <div className="flex flex-col">
        <span aria-live="off" className={cn('text-2xl font-bold tabular-nums transition-colors duration-200', priceTone)}>
          {formatNumber(price, market.priceDp)}
        </span>
        <span className={cn('text-xs tabular-nums', changeTone)}>
          {formatSigned(ticker?.change, market.priceDp)} {formatSigned(ticker?.changePct, 2, '%')}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 gap-6 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Stat label={t('24h最高价', '24h High')} value={formatNumber(ticker?.high, market.priceDp)} />
        <Stat label={t('24h最低价', '24h Low')} value={formatNumber(ticker?.low, market.priceDp)} />
        <Stat label={`${t('24h成交量', '24h Volume')} (${market.base})`} value={formatCompact(ticker?.volume)} />
        <Stat label={`${t('24h成交额', '24h Turnover')} (${market.quote})`} value={formatCompact(ticker?.quoteVolume)} />
        <Stat label={t('标记价格', 'Mark Price')} value={formatNumber(mark?.markPrice, market.priceDp)} />
        <Stat
          label={`${t('资金费率', 'Funding')} / ${t('倒计时', 'Countdown')}`}
          value={mark ? `${formatSigned(mark.fundingRate * 100, 4, '%')} / ${formatCountdown(mark.nextFundingTime - Date.now())}` : '--'}
          tone={mark && mark.fundingRate < 0 ? 'text-down' : 'text-gold-light'}
        />
      </div>
    </section>
  )
}
