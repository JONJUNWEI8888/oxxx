'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { TradeNav } from '@/components/trade/trade-terminal'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { formatNumber, formatSigned } from '@/lib/markets'
import {
  OPTION_UNDERLYINGS,
  type OptionQuote,
  type OptionsBoard,
  UNDERLYING_LIST,
  type Underlying,
  type UnderlyingSlug,
  fetchOptionsBoard,
  formatCountdown,
  formatExpiry,
} from '@/lib/options'
import { cn } from '@/lib/utils'

type Selection = { instId: string; action: 'buy' | 'sell' }

const usd = (coinPx: number, index: number) => coinPx * index
const pct = (v: number) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '--')
const priceDp = (v: number) => (v >= 100 ? 1 : 2)
const fmtUsd = (coinPx: number, index: number) => {
  if (!Number.isFinite(coinPx) || coinPx <= 0) return '--'
  const v = usd(coinPx, index)
  return formatNumber(v, priceDp(v))
}

function UnderlyingHeader({ underlying, board }: { underlying: Underlying; board?: OptionsBoard }) {
  const { t } = useI18n()
  const idx = board?.index
  const change = idx ? idx.price - idx.open24h : Number.NaN
  const changePct = idx && idx.open24h ? (change / idx.open24h) * 100 : Number.NaN
  const up = !(changePct < 0)

  const stats = [
    { label: t('24h涨跌', '24h Change'), value: `${formatSigned(change, underlying.indexDp)} ${formatSigned(changePct, 2, '%')}`, tone: up ? 'text-up' : 'text-down' },
    { label: t('24h最高', '24h High'), value: formatNumber(idx?.high24h, underlying.indexDp) },
    { label: t('24h最低', '24h Low'), value: formatNumber(idx?.low24h, underlying.indexDp) },
    { label: t('合约面值', 'Contract Size'), value: `${underlying.ctVal} ${underlying.base}` },
    { label: t('结算方式', 'Settlement'), value: t('欧式 · 现金结算', 'European · Cash') },
  ]

  return (
    <section aria-label={t('标的行情', 'Underlying')} className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-lg bg-panel px-4 py-3">
      <div role="tablist" aria-label={t('标的', 'Underlying')} className="flex gap-1 rounded-full bg-white/5 p-1">
        {UNDERLYING_LIST.map((u) => {
          const active = u.slug === underlying.slug
          return (
            <Link
              key={u.slug}
              href={`/options/${u.slug}`}
              role="tab"
              aria-selected={active}
              className={cn('rounded-full px-4 py-1.5 text-sm font-bold transition-colors', active ? 'bg-gold text-gold-deep' : 'text-white/60 hover:text-white')}
            >
              {u.base} {t('期权', 'Options')}
            </Link>
          )
        })}
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-white/50">
          {underlying.base}/USDT {t('指数价格', 'Index')}
        </span>
        <span className={cn('text-xl font-bold tabular-nums', up ? 'text-up' : 'text-down')}>{formatNumber(idx?.price, underlying.indexDp)}</span>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col">
            <dt className="text-xs text-white/50">{s.label}</dt>
            <dd className={cn('text-sm tabular-nums text-white/90', s.tone)}>{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function ExpiryTabs({ board, active, onChange }: { board?: OptionsBoard; active: string | null; onChange: (code: string) => void }) {
  const { t, lang } = useI18n()
  return (
    <div role="tablist" aria-label={t('到期日', 'Expiry')} className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 [scrollbar-width:none]">
      {board?.expiries.map((e) => (
        <button
          key={e.code}
          type="button"
          role="tab"
          aria-selected={active === e.code}
          onClick={() => onChange(e.code)}
          className={cn(
            'shrink-0 rounded-md px-3 py-1.5 text-xs tabular-nums transition-colors',
            active === e.code ? 'bg-gold/15 font-bold text-gold-light' : 'text-white/60 hover:bg-white/5 hover:text-white',
          )}
        >
          {formatExpiry(e.code, lang)}
        </button>
      )) ?? <span className="px-3 py-1.5 text-xs text-white/40">{t('加载到期日…', 'Loading expiries…')}</span>}
    </div>
  )
}

function QuoteButton({
  quote,
  field,
  index,
  selected,
  onSelect,
}: {
  quote?: OptionQuote
  field: 'bid' | 'ask'
  index: number
  selected?: Selection | null
  onSelect: (s: Selection) => void
}) {
  const { t } = useI18n()
  const action = field === 'ask' ? 'buy' : 'sell'
  const px = quote?.[field] ?? Number.NaN
  const active = selected?.instId === quote?.instId && selected?.action === action
  if (!quote || !(px > 0)) return <span className="text-white/25">--</span>
  return (
    <button
      type="button"
      onClick={() => onSelect({ instId: quote.instId, action })}
      aria-label={`${action === 'buy' ? t('买入', 'Buy') : t('卖出', 'Sell')} ${quote.instId}`}
      className={cn(
        'rounded px-1.5 py-0.5 tabular-nums transition-colors',
        field === 'bid' ? 'text-up hover:bg-up/15' : 'text-down hover:bg-down/15',
        active && (field === 'bid' ? 'bg-up/20' : 'bg-down/20'),
      )}
    >
      {fmtUsd(px, index)}
    </button>
  )
}

function OptionChain({
  underlying,
  board,
  expiryCode,
  onExpiryChange,
  selected,
  onSelect,
}: {
  underlying: Underlying
  board?: OptionsBoard
  expiryCode: string | null
  onExpiryChange: (code: string) => void
  selected: Selection | null
  onSelect: (s: Selection) => void
}) {
  const { t, lang } = useI18n()
  const scrollRef = useRef<HTMLDivElement>(null)
  const expiry = board?.expiries.find((e) => e.code === expiryCode)
  const index = board?.index.price ?? Number.NaN
  const atmIndex = useMemo(() => expiry?.rows.findIndex((r) => r.strike >= index) ?? -1, [expiry, index])

  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>('[data-atm]')
    if (el && scrollRef.current) scrollRef.current.scrollTop = el.offsetTop - scrollRef.current.clientHeight / 2
    // Recentre only when switching expiry, not on every price poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiryCode, Boolean(expiry)])

  const head = 'px-2 py-2 font-normal text-white/45'

  return (
    <section aria-label={t('期权链', 'Option chain')} className="flex min-h-0 min-w-0 flex-col rounded-lg bg-panel">
      <ExpiryTabs board={board} active={expiryCode} onChange={onExpiryChange} />
      {expiry && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-white/50">
          <span>
            {t('距到期', 'Expires in')} <span className="tabular-nums text-white/85">{formatCountdown(expiry.expiresAt - Date.now(), lang)}</span>
            <span className="mx-2 text-white/20">|</span>
            {t('远期价格', 'Forward')} <span className="tabular-nums text-white/85">{formatNumber(expiry.forward, underlying.indexDp)}</span>
          </span>
          <span>{t('价格单位：USDT · 点击买价卖出 / 卖价买入', 'Prices in USDT · click bid to sell, ask to buy')}</span>
        </div>
      )}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-right [&_tr>*]:border-b [&_tr>*]:border-line/60 text-xs">
          <thead className="sticky top-0 z-10 [&_th]:bg-panel">
            <tr className="border-b border-line text-[13px]">
              <th colSpan={5} className="px-2 py-2 text-left font-bold text-up">
                {t('看涨 Calls', 'Calls')}
              </th>
              <th className="px-2 py-2 text-center font-bold text-white/80">{t('行权价', 'Strike')}</th>
              <th colSpan={5} className="px-2 py-2 font-bold text-down">
                {t('看跌 Puts', 'Puts')}
              </th>
            </tr>
            <tr className="border-b border-line">
              <th className={cn(head, 'hidden text-left xl:table-cell')}>{t('持仓量', 'OI')}</th>
              <th className={cn(head, 'hidden lg:table-cell')}>Delta</th>
              <th className={head}>{t('标记IV', 'Mark IV')}</th>
              <th className={head}>{t('买价', 'Bid')}</th>
              <th className={head}>{t('卖价', 'Ask')}</th>
              <th className={cn(head, 'text-center')}>USDT</th>
              <th className={head}>{t('买价', 'Bid')}</th>
              <th className={head}>{t('卖价', 'Ask')}</th>
              <th className={head}>{t('标记IV', 'Mark IV')}</th>
              <th className={cn(head, 'hidden lg:table-cell')}>Delta</th>
              <th className={cn(head, 'hidden xl:table-cell')}>{t('持仓量', 'OI')}</th>
            </tr>
          </thead>
          <tbody>
            {!expiry && (
              <tr>
                <td colSpan={11} className="py-16 text-center text-white/40">
                  {t('正在从 OKX 加载期权链…', 'Loading option chain from OKX…')}
                </td>
              </tr>
            )}
            {expiry?.rows.map((row, i) => {
              const callItm = row.strike < index
              const putItm = row.strike > index
              const isSel = (q?: OptionQuote) => q && selected?.instId === q.instId
              return (
                <FragmentRow key={row.strike} showIndex={i === atmIndex} index={index} dp={underlying.indexDp} label={t('指数价格', 'Index')}>
                  <tr className={cn('border-b border-line/50 tabular-nums transition-colors hover:bg-white/[0.03]', (isSel(row.call) || isSel(row.put)) && 'bg-gold/[0.06]')}>
                    <td className={cn('hidden px-2 py-1.5 text-left text-white/60 xl:table-cell', callItm && 'bg-gold/[0.04]')}>{formatNumber(row.call?.oi, 0)}</td>
                    <td className={cn('hidden px-2 py-1.5 text-white/60 lg:table-cell', callItm && 'bg-gold/[0.04]')}>{formatNumber(row.call?.delta, 2)}</td>
                    <td className={cn('px-2 py-1.5 text-white/80', callItm && 'bg-gold/[0.04]')}>{pct(row.call?.markIv ?? Number.NaN)}</td>
                    <td className={cn('px-1 py-1', callItm && 'bg-gold/[0.04]')}>
                      <QuoteButton quote={row.call} field="bid" index={index} selected={selected} onSelect={onSelect} />
                    </td>
                    <td className={cn('px-1 py-1', callItm && 'bg-gold/[0.04]')}>
                      <QuoteButton quote={row.call} field="ask" index={index} selected={selected} onSelect={onSelect} />
                    </td>
                    <td className="bg-white/[0.03] px-3 py-1.5 text-center text-sm font-bold text-white">{formatNumber(row.strike, underlying.strikeDp)}</td>
                    <td className={cn('px-1 py-1', putItm && 'bg-gold/[0.04]')}>
                      <QuoteButton quote={row.put} field="bid" index={index} selected={selected} onSelect={onSelect} />
                    </td>
                    <td className={cn('px-1 py-1', putItm && 'bg-gold/[0.04]')}>
                      <QuoteButton quote={row.put} field="ask" index={index} selected={selected} onSelect={onSelect} />
                    </td>
                    <td className={cn('px-2 py-1.5 text-white/80', putItm && 'bg-gold/[0.04]')}>{pct(row.put?.markIv ?? Number.NaN)}</td>
                    <td className={cn('hidden px-2 py-1.5 text-white/60 lg:table-cell', putItm && 'bg-gold/[0.04]')}>{formatNumber(row.put?.delta, 2)}</td>
                    <td className={cn('hidden px-2 py-1.5 text-white/60 xl:table-cell', putItm && 'bg-gold/[0.04]')}>{formatNumber(row.put?.oi, 0)}</td>
                  </tr>
                </FragmentRow>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function FragmentRow({ showIndex, index, dp, label, children }: { showIndex: boolean; index: number; dp: number; label: string; children: React.ReactNode }) {
  return (
    <>
      {showIndex && (
        <tr data-atm aria-hidden="true">
          <td colSpan={11} className="p-0">
            <div className="relative flex h-6 items-center justify-center">
              <span className="absolute inset-x-0 top-1/2 h-px bg-gold/50" />
              <span className="relative rounded-full bg-gold px-3 py-0.5 text-[11px] font-bold tabular-nums text-gold-deep">
                {label} {formatNumber(index, dp)}
              </span>
            </div>
          </td>
        </tr>
      )}
      {children}
    </>
  )
}

function OrderPanel({ underlying, board, selected, onAction }: { underlying: Underlying; board?: OptionsBoard; selected: Selection | null; onAction: (a: 'buy' | 'sell') => void }) {
  const { t, lang } = useI18n()
  const [qty, setQty] = useState('1')
  const index = board?.index.price ?? Number.NaN
  const quote = useMemo(() => {
    if (!selected?.instId || !board) return undefined
    for (const e of board.expiries) for (const r of e.rows) for (const q of [r.call, r.put]) if (q?.instId === selected.instId) return q
    return undefined
  }, [board, selected])

  const action = selected?.action ?? 'buy'
  const refPx = quote ? (action === 'buy' ? quote.ask : quote.bid) : Number.NaN
  const contracts = Math.max(0, Math.floor(Number(qty) || 0))
  const notionalCoin = refPx * contracts * underlying.ctVal
  const greeks = quote
    ? [
        ['Delta', formatNumber(quote.delta, 4)],
        ['Gamma', formatNumber(quote.gamma, 6)],
        ['Theta', formatNumber(quote.theta, 2)],
        ['Vega', formatNumber(quote.vega, 2)],
      ]
    : []

  return (
    <aside aria-label={t('下单', 'Order')} className="flex flex-col gap-4 rounded-lg bg-panel p-4">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-white/5 p-1">
        {(['buy', 'sell'] as const).map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={action === a}
            onClick={() => onAction(a)}
            className={cn(
              'rounded-md py-2 text-sm font-bold transition-colors',
              action === a ? (a === 'buy' ? 'bg-up text-background' : 'bg-down text-foreground') : 'text-white/60 hover:text-white',
            )}
          >
            {a === 'buy' ? t('买入', 'Buy') : t('卖出', 'Sell')}
          </button>
        ))}
      </div>

      {quote ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-white/50">{t('已选合约', 'Selected')}</span>
          <span className="text-base font-bold text-white">
            {underlying.base} {formatExpiry(quote.expiry, lang)} {formatNumber(quote.strike, 0)}{' '}
            <span className={quote.side === 'C' ? 'text-up' : 'text-down'}>{quote.side === 'C' ? t('看涨', 'Call') : t('看跌', 'Put')}</span>
          </span>
          <span className="font-mono text-[11px] text-white/40">{quote.instId}</span>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-sm leading-relaxed text-white/50">
          {t('在左侧期权链中点击买价或卖价以选择合约', 'Click a bid or ask in the chain to select a contract')}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">{t('价格 (USDT)', 'Price (USDT)')}</span>
          <div className="flex h-10 items-center rounded-md border border-line bg-white/[0.03] px-3 text-sm tabular-nums text-white">
            {quote ? fmtUsd(refPx, index) : '--'}
            {quote && Number.isFinite(refPx) && <span className="ml-auto text-xs text-white/40">{formatNumber(refPx, 4)} {underlying.base}</span>}
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-white/50">{t('数量（张）', 'Quantity (contracts)')}</span>
          <input
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ''))}
            className="h-10 rounded-md border border-line bg-white/[0.03] px-3 text-sm tabular-nums text-white outline-none focus:border-gold/60"
          />
          <span className="text-[11px] text-white/40">
            1 {t('张', 'contract')} = {underlying.ctVal} {underlying.base}
          </span>
        </label>
      </div>

      <dl className="flex flex-col gap-2 border-t border-line pt-3 text-xs">
        <div className="flex justify-between">
          <dt className="text-white/50">{action === 'buy' ? t('预估权利金支出', 'Est. premium paid') : t('预估权利金收入', 'Est. premium received')}</dt>
          <dd className="tabular-nums text-white">{quote && contracts ? `${fmtUsd(notionalCoin, index)} USDT` : '--'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-white/50">{t('标记价格', 'Mark price')}</dt>
          <dd className="tabular-nums text-white/80">{quote ? fmtUsd(quote.mark, index) : '--'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-white/50">{t('买/卖 IV', 'Bid/Ask IV')}</dt>
          <dd className="tabular-nums text-white/80">{quote ? `${pct(quote.bidIv)} / ${pct(quote.askIv)}` : '--'}</dd>
        </div>
      </dl>

      {greeks.length > 0 && (
        <dl className="grid grid-cols-2 gap-2">
          {greeks.map(([k, v]) => (
            <div key={k} className="flex flex-col rounded-md bg-white/[0.03] px-3 py-2">
              <dt className="text-[11px] text-white/45">{k}</dt>
              <dd className="text-sm tabular-nums text-white/90">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <a href="#" className="mt-auto rounded-full bg-gold py-2.5 text-center text-sm font-bold text-gold-deep transition-[filter] hover:brightness-110">
        {t('登录后交易', 'Log in to trade')}
      </a>
    </aside>
  )
}

function StatusBar({ error, updatedAt }: { error: boolean; updatedAt?: number }) {
  const { t } = useI18n()
  return (
    <footer className="flex h-9 items-center gap-6 border-t border-line px-4 text-xs">
      <span className={cn('flex items-center gap-2', error ? 'text-down' : 'text-up')}>
        <span className={cn('size-1.5 rounded-full', error ? 'animate-pulse bg-down' : 'bg-up')} aria-hidden="true" />
        {error ? t('行情连接异常，重试中', 'Feed error, retrying') : t('连接稳定', 'Connected')}
      </span>
      <span className="text-white/40">{t('行情来源：OKX · 每 5 秒刷新', 'Data: OKX · refreshes every 5s')}</span>
      {updatedAt && (
        <span className="tabular-nums text-white/40">
          {t('更新于', 'Updated')} {new Date(updatedAt).toLocaleTimeString('en-GB')}
        </span>
      )}
      <a href="#" className="ml-auto text-white/50 hover:text-white">
        {t('风险声明', 'Risk Disclosure')}
      </a>
    </footer>
  )
}

function Terminal({ underlying }: { underlying: Underlying }) {
  const { data, error } = useSWR(['okx-options', underlying.family], () => fetchOptionsBoard(underlying), {
    refreshInterval: 5000,
    keepPreviousData: false,
    revalidateOnFocus: false,
  })
  const [expiryCode, setExpiryCode] = useState<string | null>(null)
  const [selected, setSelected] = useState<Selection | null>(null)

  const activeExpiry = data?.expiries.some((e) => e.code === expiryCode) ? expiryCode : (data?.expiries[0]?.code ?? null)

  return (
    <div className="flex min-h-dvh flex-col bg-background font-sans text-foreground lg:h-dvh">
      <TradeNav />
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-1 p-1 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_minmax(0,1fr)]">
        <h1 className="sr-only">
          {underlying.base} {underlying.slug} Options
        </h1>
        <div className="lg:col-span-2">
          <UnderlyingHeader underlying={underlying} board={data} />
        </div>
        <div className="flex h-[640px] min-h-0 flex-col lg:h-auto">
          <OptionChain
            underlying={underlying}
            board={data}
            expiryCode={activeExpiry}
            onExpiryChange={(c) => {
              setExpiryCode(c)
              setSelected(null)
            }}
            selected={selected}
            onSelect={setSelected}
          />
        </div>
        <OrderPanel underlying={underlying} board={data} selected={selected} onAction={(a) => setSelected((s) => (s ? { ...s, action: a } : { instId: '', action: a }))} />
      </main>
      <StatusBar error={Boolean(error)} updatedAt={data?.updatedAt} />
    </div>
  )
}

export function OptionsTerminal({ slug }: { slug: UnderlyingSlug }) {
  const underlying = OPTION_UNDERLYINGS[slug]
  return (
    <I18nProvider title={{ zh: `${underlying.base} 期权交易 | OXXX`, en: `${underlying.base} Options | OXXX` }}>
      <Terminal underlying={underlying} />
    </I18nProvider>
  )
}
