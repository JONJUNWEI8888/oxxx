'use client'

import { Percent } from 'lucide-react'
import { useState } from 'react'
import type { MarketSnapshot } from '@/hooks/use-okx-market'
import { useI18n } from '@/lib/i18n'
import { type Market, formatNumber } from '@/lib/markets'
import { cn } from '@/lib/utils'

const LEVERAGES = [3, 5, 10, 20] as const

function Field({
  label,
  unit,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  unit: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <label className={cn('flex items-center gap-2 rounded-lg bg-white/[0.05] px-3 py-2.5 transition-colors focus-within:bg-white/[0.08] focus-within:ring-1 focus-within:ring-gold/60', disabled && 'opacity-60')}>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] text-white/40">{label}</span>
        <input
          inputMode="decimal"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value.replace(/[^\d.]/g, ''))}
          className="w-full bg-transparent text-[15px] tabular-nums text-white placeholder:text-white/30 focus:outline-none"
        />
      </span>
      <span className="text-sm text-white/80">{unit}</span>
    </label>
  )
}

export function OrderForm({
  market,
  snapshot,
  leverage,
  onLeverageChange,
  isPerpetual = false,
}: {
  market: Market
  snapshot: MarketSnapshot
  leverage: number | null
  onLeverageChange: (v: number | null) => void
  isPerpetual?: boolean
}) {
  const { t } = useI18n()
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [type, setType] = useState<'limit' | 'market'>('limit')
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')

  const last = snapshot.lastPrice ?? snapshot.tickers[market.symbol]?.last ?? null
  const effectivePrice = type === 'market' ? last : Number(price) || last
  const total = effectivePrice && Number(amount) ? effectivePrice * Number(amount) * (leverage ? 1 / leverage : 1) : null

  const quick = [
    { label: t('最新价', 'Last'), value: last },
    { label: t('卖一价', 'Ask'), value: snapshot.asks[0]?.price },
    { label: t('买一价', 'Bid'), value: snapshot.bids[0]?.price },
    { label: '-1%', value: last ? last * 0.99 : undefined },
    { label: '+1%', value: last ? last * 1.01 : undefined },
  ]

  return (
    <section aria-label={t('下单', 'Place order')} className="flex h-full flex-col gap-4 rounded-lg bg-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-white">{isPerpetual ? t('永续合约', 'Perpetual') : leverage ? t('杠杆', 'Margin') : t('现货', 'Spot')}</h2>
        <button
          type="button"
          role="switch"
          aria-checked={leverage !== null}
          onClick={() => onLeverageChange(leverage ? null : 10)}
          className="flex items-center gap-2 text-sm text-white/80"
        >
          {t('杠杆', 'Margin')}
          <span className={cn('relative h-5 w-9 rounded-full transition-colors', leverage ? 'bg-gold' : 'bg-white/20')}>
            <span className={cn('absolute top-0.5 size-4 rounded-full bg-foreground transition-transform', leverage ? 'translate-x-[18px]' : 'translate-x-0.5')} />
          </span>
        </button>
      </div>

      {leverage !== null && (
        <div className="flex gap-2" role="radiogroup" aria-label={t('杠杆倍数', 'Leverage')}>
          {LEVERAGES.map((lv) => (
            <button
              key={lv}
              type="button"
              role="radio"
              aria-checked={leverage === lv}
              onClick={() => onLeverageChange(lv)}
              className={cn(
                'flex-1 rounded-md border py-1 text-xs tabular-nums transition-colors',
                leverage === lv ? 'border-gold text-gold-light' : 'border-line text-white/50 hover:text-white',
              )}
            >
              {lv}x
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 rounded-lg bg-white/[0.05] p-1">
        {(['buy', 'sell'] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={side === s}
            onClick={() => setSide(s)}
            className={cn(
              'rounded-md py-2 text-sm font-bold transition-colors',
              side === s ? (s === 'buy' ? 'bg-up text-background' : 'bg-down text-foreground') : 'text-white/60 hover:text-white',
            )}
          >
            {s === 'buy' ? t('买入', 'Buy') : t('卖出', 'Sell')}
          </button>
        ))}
      </div>

      <div role="tablist" className="flex gap-5 border-b border-line">
        {(['limit', 'market'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={type === k}
            onClick={() => setType(k)}
            className={cn(
              'relative pb-2 text-sm transition-colors',
              type === k ? 'font-bold text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-gold' : 'text-white/50 hover:text-white/80',
            )}
          >
            {k === 'limit' ? t('限价', 'Limit') : t('市价', 'Market')}
          </button>
        ))}
      </div>

      {type === 'limit' ? (
        <div className="flex flex-col gap-2">
          <Field label={t('价格', 'Price')} unit={market.quote} value={price} onChange={setPrice} placeholder={last ? last.toFixed(market.priceDp) : ''} />
          <div className="grid grid-cols-5 gap-1">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={!q.value}
                onClick={() => q.value && setPrice(q.value.toFixed(market.priceDp))}
                className="rounded-md bg-white/[0.05] py-1.5 text-[11px] text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Field label={t('价格', 'Price')} unit={market.quote} value="" placeholder={t('市场最优价', 'Best market price')} disabled />
      )}

      <Field label={t('数量', 'Amount')} unit={market.base} value={amount} onChange={setAmount} placeholder="0.000" />

      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40">{leverage ? t('所需保证金', 'Required margin') : t('金额', 'Total')}</span>
        <span className="tabular-nums text-white/80">
          {formatNumber(total, 2)} {market.quote}
        </span>
      </div>

      <a
        href="#"
        className="flex h-12 items-center justify-center rounded-lg bg-gold text-[15px] font-bold text-gold-deep transition-[filter,box-shadow] hover:shadow-[0_0_24px_-6px_var(--color-gold)] hover:brightness-110"
      >
        {t('登录 / 注册', 'Log in / Sign up')}
      </a>

      <p className="flex items-center gap-2 text-xs text-white/50">
        <Percent className="size-3.5" aria-hidden="true" />
        {t('费率等级', 'Fee tier')} · Maker 0.02% / Taker 0.05%
      </p>
    </section>
  )
}
