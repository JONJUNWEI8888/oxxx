'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Users } from 'lucide-react'
import { Footer } from '@/components/synapse/footer'
import { Navbar } from '@/components/synapse/navbar'
import { I18nProvider, useI18n } from '@/lib/i18n'
import {
  BOT_FILTERS,
  BOT_TOOLS,
  CURATED_THEMES,
  RISK_LABELS,
  SPOT_LEADERS,
  SWAP_LEADERS,
  type BotFilter,
  type CuratedBot,
  type CuratedTheme,
  type LeadTrader,
} from '@/lib/trading-bots'
import { cn } from '@/lib/utils'

type Section = 'curated' | 'spot-copy' | 'swap-copy'

const SECTIONS: { id: Section; label: { zh: string; en: string } }[] = [
  { id: 'curated', label: { zh: '精选策略', en: 'Curated' } },
  { id: 'spot-copy', label: { zh: '现货跟单', en: 'Spot copy' } },
  { id: 'swap-copy', label: { zh: '合约跟单', en: 'Futures copy' } },
]

const intFmt = new Intl.NumberFormat('en-US')
const moneyFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (v: number) => `${v >= 0 ? '+' : ''}${moneyFmt.format(v)}%`

function ToolGrid() {
  const { t } = useI18n()
  const [filter, setFilter] = useState<BotFilter>('all')
  const tools = filter === 'all' ? BOT_TOOLS : BOT_TOOLS.filter((tool) => tool.tags.includes(filter))

  return (
    <section aria-labelledby="tools-heading" className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-16 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h2 id="tools-heading" className="text-lg text-foreground">
          {t('策略工具', 'Strategy tools')}
        </h2>
        <div role="group" aria-label={t('按行情筛选', 'Filter by market view')} className="flex flex-wrap gap-2">
          {BOT_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60',
                filter === f.id ? 'border-gold bg-gold text-gold-deep' : 'border-line text-foreground/60 hover:border-foreground/30 hover:text-foreground',
              )}
            >
              {t(f.label)}
            </button>
          ))}
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <li key={tool.id}>
              <Link
                href="/trade/BTCUSDT"
                className="group flex h-full flex-col gap-4 rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-gold/50 focus-visible:border-gold focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-raised text-gold-light ring-1 ring-foreground/10 transition-colors group-hover:bg-gold group-hover:text-gold-deep">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="flex items-center gap-1.5 text-xs tabular-nums text-foreground/45">
                    <Users className="size-3.5" aria-hidden="true" />
                    {intFmt.format(tool.users)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-base text-foreground">
                    {t(tool.name)}
                    {tool.badge && (
                      <span className="rounded-md border border-gold/40 px-1.5 py-0.5 text-[11px] leading-none text-gold">{tool.badge}</span>
                    )}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground/50">{t(tool.tagline)}</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function CuratedCard({ bot }: { bot: CuratedBot }) {
  const { t } = useI18n()
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-base text-foreground">
          {bot.pair}
          {bot.side && <span className="pl-1.5 text-sm text-foreground/50">{t(bot.side)}</span>}
        </span>
        {bot.href ? (
          <span className="shrink-0 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold transition-colors group-hover:bg-gold group-hover:text-gold-deep">
            {t('创建', 'Create')}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-foreground/35">{t('即将上线', 'Coming soon')}</span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-foreground/45">{t('年化收益率', 'APR')}</span>
        <span className={cn('font-mono text-3xl tabular-nums', bot.apr >= 0 ? 'text-up' : 'text-down')}>{pct(bot.apr)}</span>
      </div>
      <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-foreground/45">{t('带单规模 (USDT)', 'AUM (USDT)')}</dt>
          <dd className="tabular-nums text-foreground/80">{moneyFmt.format(bot.aum)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-foreground/45">{t('使用人数', 'Users')}</dt>
          <dd className="tabular-nums text-foreground/80">{intFmt.format(bot.users)}</dd>
        </div>
      </dl>
    </>
  )

  const className = 'group flex h-full flex-col gap-4 rounded-2xl border border-line bg-panel p-5 transition-colors'
  return bot.href ? (
    <Link href={bot.href} className={cn(className, 'hover:border-gold/50 focus-visible:border-gold focus-visible:outline-none')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

function ThemeBlock({ theme }: { theme: CuratedTheme }) {
  const { t } = useI18n()
  return (
    <section aria-labelledby={`${theme.id}-heading`} className="flex flex-col gap-4 border-t border-line pt-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h3 id={`${theme.id}-heading`} className="text-xl text-foreground">
              {t(theme.title)}
            </h3>
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-xs',
                theme.risk === 'aggressive' ? 'bg-down/15 text-down' : theme.risk === 'steady' ? 'bg-up/15 text-up' : 'bg-gold/15 text-gold',
              )}
            >
              {t(RISK_LABELS[theme.risk])}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/50 text-pretty">{t(theme.subtitle)}</p>
        </div>
        <span className="flex items-center gap-1.5 text-sm tabular-nums text-foreground/45">
          <Users className="size-4" aria-hidden="true" />
          {intFmt.format(theme.users)} {t('使用人数', 'users')}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {theme.bots.map((bot, i) => (
          <li key={`${bot.pair}-${i}`}>
            <CuratedCard bot={bot} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const d = points.map((p, i) => `${(i / (points.length - 1)) * 100},${36 - ((p - min) / span) * 32}`).join(' ')
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-12 w-full" aria-hidden="true">
      <polyline points={d} fill="none" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="stroke-up" />
    </svg>
  )
}

function TraderCard({ trader }: { trader: LeadTrader }) {
  const { t } = useI18n()
  const full = trader.followers >= trader.maxFollowers
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <header className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-raised text-sm text-gold-light ring-1 ring-gold/30">
          {trader.initials}
        </span>
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-base text-foreground">{trader.name}</h3>
          <span className="flex items-center gap-1 text-xs tabular-nums text-foreground/45">
            <Users className="size-3" aria-hidden="true" />
            {trader.followers}/{trader.maxFollowers}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-foreground/45">{t('近 90 日收益率', '90D ROI')}</span>
        <span className="font-mono text-3xl tabular-nums text-up">{pct(trader.roi)}</span>
      </div>

      <Sparkline points={trader.curve} />

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-foreground/45">{t('收益额 (USDT)', 'PnL (USDT)')}</dt>
          <dd className="tabular-nums text-foreground/80">+{moneyFmt.format(trader.pnl)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-foreground/45">{t('胜率', 'Win rate')}</dt>
          <dd className="tabular-nums text-foreground/80">{trader.winRate}%</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-foreground/45">{t('带单规模 (USDT)', 'AUM (USDT)')}</dt>
          <dd className="tabular-nums text-foreground/80">{intFmt.format(trader.aum)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-foreground/45">{t('带单天数', 'Days leading')}</dt>
          <dd className="tabular-nums text-foreground/80">{trader.days}</dd>
        </div>
      </dl>

      {full ? (
        <span className="mt-auto rounded-full border border-line py-2 text-center text-sm text-foreground/40">{t('已满员', 'Full')}</span>
      ) : (
        <Link
          href="/login"
          className="mt-auto rounded-full bg-gold py-2 text-center text-sm text-gold-deep transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
        >
          {t('跟单', 'Copy')}
        </Link>
      )}
    </article>
  )
}

function TraderGrid({ traders }: { traders: LeadTrader[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {traders.map((trader) => (
        <li key={trader.name}>
          <TraderCard trader={trader} />
        </li>
      ))}
    </ul>
  )
}

function TradingBotContent() {
  const { t } = useI18n()
  const [section, setSection] = useState<Section>('curated')

  return (
    <main className="min-h-screen bg-background pt-28 text-foreground">
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-14 md:px-6">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">{t('策略交易', 'Trading bots')}</p>
        <h1 className="font-display text-5xl leading-tight tracking-wide text-balance md:text-7xl">
          {t('让策略替你盯盘', 'Let a bot watch the market')}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-foreground/60 text-pretty">
          {t(
            '自动化交易策略或跟随顶级交易员。网格、马丁格尔、定投与套利一键创建，7×24 小时不间断执行。',
            'Automate strategies or follow top traders. Launch grid, martingale, recurring-buy and arbitrage bots in one click — running 24/7.',
          )}
        </p>
      </section>

      <ToolGrid />

      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-24 md:px-6">
        <div role="tablist" aria-label={t('策略分类', 'Strategy sections')} className="flex gap-6 border-b border-line">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              id={`tab-${s.id}`}
              type="button"
              role="tab"
              aria-selected={section === s.id}
              aria-controls={`panel-${s.id}`}
              onClick={() => setSection(s.id)}
              className={cn(
                '-mb-px border-b-2 pb-3 text-base transition-colors focus-visible:outline-none focus-visible:text-foreground',
                section === s.id ? 'border-gold text-foreground' : 'border-transparent text-foreground/45 hover:text-foreground/80',
              )}
            >
              {t(s.label)}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${section}`} aria-labelledby={`tab-${section}`} className="flex flex-col gap-10">
          {section === 'curated' && CURATED_THEMES.map((theme) => <ThemeBlock key={theme.id} theme={theme} />)}
          {section === 'spot-copy' && <TraderGrid traders={SPOT_LEADERS} />}
          {section === 'swap-copy' && <TraderGrid traders={SWAP_LEADERS} />}
        </div>

        <p className="text-xs leading-relaxed text-foreground/35">
          {t(
            '*历史收益不代表未来表现。策略与跟单存在亏损风险，请根据自身风险承受能力谨慎参与。',
            '*Past performance does not guarantee future results. Bots and copy trading can lose money.',
          )}
        </p>
      </section>
    </main>
  )
}

export function TradingBotView() {
  return (
    <I18nProvider title={{ zh: '策略交易 · 精选策略与跟单 | OXXX', en: 'Trading Bots & Copy Trading | OXXX' }}>
      <Navbar visible />
      <TradingBotContent />
      <Footer />
    </I18nProvider>
  )
}
