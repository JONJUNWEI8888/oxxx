'use client'

import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { MarketSnapshot } from '@/hooks/use-okx-market'
import { useI18n } from '@/lib/i18n'
import { MARKET_LIST, type Market, type TradeMode, formatCompact, formatNumber, formatSigned, tradeHref } from '@/lib/markets'
import { cn } from '@/lib/utils'

export function CoinBadge({ base, className = 'size-7' }: { base: string; className?: string }) {
  if (base === 'BTC') {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 64" className={cn('shrink-0', className)}>
        <circle cx="32" cy="32" r="32" className="fill-btc" />
        <path
          className="fill-white"
          d="M46.103 27.444c.637-4.258-2.605-6.547-7.038-8.074l1.438-5.768-3.511-.875-1.4 5.616c-.923-.23-1.871-.447-2.813-.662l1.41-5.653-3.509-.875-1.439 5.766c-.764-.174-1.514-.346-2.242-.527l.004-.018-4.842-1.209-.934 3.75s2.605.597 2.55.634c1.422.355 1.679 1.296 1.636 2.042l-1.638 6.571c.098.025.225.061.365.117l-.371-.092-2.296 9.205c-.174.432-.615 1.08-1.609.834.035.051-2.552-.637-2.552-.637l-1.743 4.019 4.569 1.139c.85.213 1.683.436 2.503.646l-1.453 5.834 3.507.875 1.439-5.772c.958.26 1.888.5 2.798.726l-1.434 5.745 3.511.875 1.453-5.823c5.987 1.133 10.489.676 12.384-4.739 1.527-4.36-.076-6.875-3.226-8.515 2.294-.529 4.022-2.038 4.483-5.155zM38.08 38.693c-1.085 4.36-8.426 2.003-10.806 1.412l1.928-7.729c2.38.594 10.012 1.77 8.878 6.317zm1.086-11.312c-.99 3.966-7.1 1.951-9.082 1.457l1.748-7.01c1.982.494 8.365 1.416 7.334 5.553z"
        />
      </svg>
    )
  }
  if (base === 'ETH') {
    return (
      <svg aria-hidden="true" viewBox="0 0 64 64" className={cn('shrink-0', className)}>
        <circle cx="32" cy="32" r="32" className="fill-eth" />
        <g className="fill-white">
          <path fillOpacity="0.6" d="M32.996 8v17.74l14.995 6.7z" />
          <path d="M32.996 8 18 32.44l14.996-6.7z" />
          <path fillOpacity="0.6" d="M32.996 43.937v12.054L48 35.234z" />
          <path d="M32.996 55.991V43.935L18 35.234z" />
          <path fillOpacity="0.2" d="m32.996 41.147 14.995-8.707-14.995-6.696z" />
          <path fillOpacity="0.6" d="m18 32.44 14.996 8.707V25.744z" />
        </g>
      </svg>
    )
  }
  return (
    <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center rounded-full bg-gold/15 font-sans text-xs font-bold text-gold ring-1 ring-gold/40', className)}>
      {base.charAt(0)}
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

function PairSwitcher({ market, mode, snapshot, leverage }: { market: Market; mode: TradeMode; snapshot: MarketSnapshot; leverage: number | null }) {
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
        {mode === 'swap' && <span className="rounded bg-gold/15 px-1.5 py-0.5 text-xs font-bold text-gold-light">{t('永续', 'Perp')}</span>}
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
                  href={tradeHref(mode, m.symbol)}
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

export function MarketHeader({
  market,
  mode,
  snapshot,
  leverage,
}: {
  market: Market
  mode: TradeMode
  snapshot: MarketSnapshot
  leverage: number | null
}) {
  const { t } = useI18n()
  const ticker = snapshot.tickers[market.symbol]
  const price = snapshot.lastPrice ?? ticker?.last ?? null
  const changeTone = (ticker?.change ?? 0) >= 0 ? 'text-up' : 'text-down'
  const priceTone = snapshot.direction === 'down' ? 'text-down' : 'text-up'
  const mark = snapshot.mark

  return (
    <section aria-label={t('行情概览', 'Market overview')} className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg bg-panel px-4 py-3">
      <PairSwitcher market={market} mode={mode} snapshot={snapshot} leverage={leverage} />

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
        {mode === 'swap' && (
          <>
            <Stat label={t('标记价格', 'Mark Price')} value={formatNumber(mark?.markPrice, market.priceDp)} />
            <Stat label={t('指数价格', 'Index Price')} value={formatNumber(mark?.indexPrice, market.priceDp)} />
            <Stat
              label={`${t('资金费率', 'Funding')} / ${t('倒计时', 'Countdown')}`}
              value={
                mark && Number.isFinite(mark.fundingRate)
                  ? `${formatSigned(mark.fundingRate * 100, 4, '%')} / ${formatCountdown(mark.nextFundingTime - Date.now())}`
                  : '--'
              }
              tone={mark && mark.fundingRate < 0 ? 'text-down' : 'text-gold-light'}
            />
          </>
        )}
      </div>
    </section>
  )
}
