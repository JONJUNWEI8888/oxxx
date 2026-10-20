'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLiveTickers } from '@/hooks/use-live-tickers'
import { MARKET_CATEGORIES, QUOTE, formatPrice, type Ticker } from '@/lib/markets'
import { cn } from '@/lib/utils'

function CoinIcon({ base }: { base: string }) {
  const [failed, setFailed] = useState(false)
  const slug = base.replace(/^1000/, '').toLowerCase()
  return (
    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/40 bg-gold-deep shadow-[0_0_18px_-4px] shadow-gold/50">
      {failed ? (
        <span className="text-[13px] font-bold text-gold-light">{slug.slice(0, 3).toUpperCase()}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${slug}.svg`}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-7"
        />
      )}
    </span>
  )
}

function PriceCard({ base, ticker }: { base: string; ticker?: Ticker }) {
  const prevPrice = useRef<number | undefined>(undefined)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    const price = ticker?.price
    if (price === undefined) return
    const prev = prevPrice.current
    prevPrice.current = price
    if (prev === undefined || prev === price) return
    setFlash(price > prev ? 'up' : 'down')
    const t = setTimeout(() => setFlash(null), 700)
    return () => clearTimeout(t)
  }, [ticker?.price])

  const change = ticker?.changePercent ?? 0
  const up = change >= 0

  return (
    <article className="group flex w-[300px] shrink-0 flex-col gap-5 rounded-2xl border border-gold/20 bg-gradient-to-b from-gold-deep to-black p-5 transition-colors hover:border-gold/60">
      <div className="flex items-center gap-3">
        <CoinIcon base={base} />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[16px] font-bold text-foreground">{base}</h3>
            <span className="rounded border border-gold/30 bg-gold/10 px-1.5 text-[11px] text-gold-light">币</span>
          </div>
          <p className="text-[12px] text-foreground/40">
            {base}/{QUOTE}
          </p>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p
          className={cn(
            'flex items-baseline gap-1.5 text-[24px] font-bold tabular-nums transition-colors duration-500',
            flash === 'up' && 'text-emerald-400',
            flash === 'down' && 'text-red-400',
            !flash && 'text-foreground',
          )}
        >
          {ticker ? formatPrice(ticker.price) : '--'}
          <span className="text-[11px] font-normal text-foreground/40">{QUOTE}</span>
        </p>
        <span
          className={cn(
            'rounded-md px-2.5 py-1 text-[14px] font-bold tabular-nums',
            up ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
          )}
        >
          {ticker ? `${up ? '+' : ''}${change.toFixed(2)}%` : '--'}
        </span>
      </div>
    </article>
  )
}

function MarqueeRow({
  symbols,
  tickers,
  reverse,
}: {
  symbols: string[]
  tickers: Record<string, Ticker>
  reverse?: boolean
}) {
  const loop = [...symbols, ...symbols]
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div
        className={cn(
          'flex w-max animate-marquee gap-5 hover:[animation-play-state:paused]',
          reverse && '[animation-direction:reverse]',
        )}
        style={{ animationDuration: '60s' }}
      >
        {loop.map((base, i) => (
          <PriceCard key={`${base}-${i}`} base={base} ticker={tickers[`${base}${QUOTE}`]} />
        ))}
      </div>
    </div>
  )
}

export function LiveMarkets() {
  const tickers = useLiveTickers()
  const [activeId, setActiveId] = useState(MARKET_CATEGORIES[0].id)
  const active = MARKET_CATEGORIES.find((c) => c.id === activeId) ?? MARKET_CATEGORIES[0]
  const rowTwo = [...active.symbols.slice(4), ...active.symbols.slice(0, 4)]
  const hasData = Object.keys(tickers).length > 0

  return (
    <section id="markets" className="relative overflow-hidden border-t border-gold/20 bg-black py-24 sm:py-32">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 text-center">
        <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.3em] text-gold">
          <span className={cn('size-2 rounded-full', hasData ? 'animate-pulse bg-emerald-400' : 'bg-gold/40')} />
          {hasData ? 'Live Market' : 'Connecting'}
        </div>
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7 }}
          className="text-balance font-display text-[32px] leading-tight text-gold-gradient sm:text-[48px]"
        >
          洞察全市场资产联动信号，捕捉完整跨市场交易机会
        </motion.h2>
        <div role="tablist" aria-label="市场分类" className="flex flex-wrap justify-center gap-3">
          {MARKET_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === activeId}
              onClick={() => setActiveId(c.id)}
              className={cn(
                'rounded-xl border px-5 py-2.5 text-[15px] transition-colors',
                c.id === activeId
                  ? 'border-gold bg-gold/15 text-gold-light'
                  : 'border-gold/15 bg-gold-deep/60 text-foreground/60 hover:border-gold/40 hover:text-foreground',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        key={active.id}
        role="tabpanel"
        aria-label={active.label}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="mt-14 flex flex-col gap-5"
      >
        <MarqueeRow symbols={active.symbols} tickers={tickers} />
        <MarqueeRow symbols={rowTwo} tickers={tickers} reverse />
      </motion.div>

      <div className="mt-14 flex justify-center px-6">
        <a
          href="#presale"
          className="flex items-center gap-3 rounded-xl bg-gold px-8 py-3.5 text-[15px] font-bold text-black transition-colors hover:bg-gold-light"
        >
          了解更多
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
