'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowUpRight, Hammer, UserRound } from 'lucide-react'
import { Footer } from '@/components/synapse/footer'
import { Navbar } from '@/components/synapse/navbar'
import { I18nProvider, useI18n } from '@/lib/i18n'
import {
  ASSET_BRANDS,
  BOT_FILTERS,
  BOT_TOOLS,
  CURATED_THEMES,
  IN_DEV,
  RISK_LABELS,
  SPOT_COPY_STYLES,
  SWAP_COPY_STYLES,
  type BotFilter,
  type CopyStyle,
  type CuratedBot,
  type CuratedTheme,
} from '@/lib/trading-bots'
import { cn } from '@/lib/utils'

type Section = 'curated' | 'spot-copy' | 'swap-copy'

const SECTIONS: { id: Section; label: { zh: string; en: string } }[] = [
  { id: 'curated', label: { zh: '精选策略', en: 'Curated' } },
  { id: 'spot-copy', label: { zh: '现货跟单', en: 'Spot copy' } },
  { id: 'swap-copy', label: { zh: '合约跟单', en: 'Futures copy' } },
]

function DevTag({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] leading-none text-gold',
        className,
      )}
    >
      <span className="size-1.5 animate-pulse rounded-full bg-gold" aria-hidden="true" />
      {t(IN_DEV)}
    </span>
  )
}

function DevValue({ label }: { label: string }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-foreground/45">{label}</dt>
      <dd className="text-sm text-foreground/35">{t(IN_DEV)}</dd>
    </div>
  )
}

function BrandLogo({ asset, size = 'md' }: { asset: string; size?: 'md' | 'lg' }) {
  const brand = ASSET_BRANDS[asset]
  const box = size === 'lg' ? 'size-12' : 'size-10'
  return (
    <span
      aria-hidden="true"
      className={cn('flex shrink-0 items-center justify-center rounded-full bg-raised ring-1 ring-foreground/15', box)}
    >
      {brand?.logo ? (
        <Image src={brand.logo} alt="" width={22} height={22} className={cn('invert', size === 'lg' ? 'size-6' : 'size-5')} />
      ) : (
        <span className="font-mono text-sm text-gold-light">{brand?.mark ?? asset.slice(0, 2)}</span>
      )}
    </span>
  )
}

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
              <article className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-raised text-gold-light ring-1 ring-foreground/10">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <DevTag />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="flex items-center gap-2 text-base text-foreground">
                    {t(tool.name)}
                    {tool.badge && (
                      <span className="rounded-md border border-foreground/20 px-1.5 py-0.5 text-[11px] leading-none text-foreground/60">{tool.badge}</span>
                    )}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/50">{t(tool.tagline)}</p>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function CuratedCard({ bot }: { bot: CuratedBot }) {
  const { t } = useI18n()
  const brand = ASSET_BRANDS[bot.asset]
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <header className="flex items-center gap-3">
        <BrandLogo asset={bot.asset} />
        <div className="flex min-w-0 flex-col">
          <h4 className="truncate text-base text-foreground">
            {bot.pair}
            {bot.side && <span className="pl-1.5 text-sm text-foreground/50">{t(bot.side)}</span>}
          </h4>
          <span className="truncate text-xs text-foreground/45">{brand?.name}</span>
        </div>
      </header>

      <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-foreground/15 px-4 py-3">
        <span className="text-xs text-foreground/45">{t('年化收益率', 'APR')}</span>
        <span className="flex items-center gap-2 text-lg text-foreground/40">
          <Hammer className="size-4" aria-hidden="true" />
          {t(IN_DEV)}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <DevValue label={t('策略规模 (USDT)', 'AUM (USDT)')} />
        <DevValue label={t('使用人数', 'Users')} />
      </dl>

      {bot.href ? (
        <Link
          href={bot.href}
          className="mt-auto flex items-center justify-center gap-1 rounded-full border border-line py-2 text-sm text-foreground/70 transition-colors hover:border-gold/50 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
        >
          {t('查看行情', 'View market')}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : (
        <span className="mt-auto rounded-full border border-line py-2 text-center text-sm text-foreground/35">{t('即将上线', 'Coming soon')}</span>
      )}
    </article>
  )
}

function ThemeBlock({ theme }: { theme: CuratedTheme }) {
  const { t } = useI18n()
  const assets = Array.from(new Set(theme.bots.map((b) => b.asset)))
  return (
    <section aria-labelledby={`${theme.id}-heading`} className="flex flex-col gap-4 border-t border-line pt-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
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
            <DevTag />
          </div>
          <p className="text-sm leading-relaxed text-foreground/50 text-pretty">{t(theme.subtitle)}</p>
        </div>
        <div className="flex -space-x-2" aria-hidden="true">
          {assets.map((a) => (
            <span key={a} className="rounded-full ring-2 ring-background">
              <BrandLogo asset={a} />
            </span>
          ))}
        </div>
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

function LeaderCard({ style }: { style: CopyStyle }) {
  const { t } = useI18n()
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <header className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-raised text-foreground/40 ring-1 ring-gold/30">
          <UserRound className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate text-base text-foreground">{t(style.title)}</h3>
          <DevTag className="self-start" />
        </div>
      </header>

      <p className="text-sm leading-relaxed text-foreground/50">{t(style.desc)}</p>

      <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-foreground/15 text-xs text-foreground/35">
        {t('收益曲线 · 正在开发', 'Performance chart · In development')}
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
        <DevValue label={t('近 90 日收益率', '90D ROI')} />
        <DevValue label={t('胜率', 'Win rate')} />
        <DevValue label={t('带单规模 (USDT)', 'AUM (USDT)')} />
        <DevValue label={t('跟单人数', 'Followers')} />
      </dl>

      <button
        type="button"
        disabled
        className="mt-auto cursor-not-allowed rounded-full border border-line py-2 text-center text-sm text-foreground/35"
      >
        {t('跟单 · 正在开发', 'Copy · In development')}
      </button>
    </article>
  )
}

function LeaderGrid({ styles }: { styles: CopyStyle[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {styles.map((style) => (
        <li key={style.id}>
          <LeaderCard style={style} />
        </li>
      ))}
    </ul>
  )
}

function DevNotice() {
  const { t } = useI18n()
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-gold/25 bg-gold/5 p-4">
      <Hammer className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
      <p className="text-sm leading-relaxed text-foreground/70 text-pretty">
        {t(
          '策略交易与跟单功能正在开发中，收益、规模、使用人数及带单员数据将在上线后实时展示。',
          'Trading bots and copy trading are in development. Returns, AUM, user counts and lead-trader data will appear live at launch.',
        )}
      </p>
    </div>
  )
}

function TradingBotContent() {
  const { t } = useI18n()
  const [section, setSection] = useState<Section>('curated')

  return (
    <main className="min-h-screen bg-background pt-28 text-foreground">
      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-14 md:px-6">
        <div className="flex items-center gap-3">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">{t('策略交易', 'Trading bots')}</p>
          <DevTag />
        </div>
        <h1 className="font-display text-5xl leading-tight tracking-wide text-balance md:text-7xl">
          {t('让策略替你盯盘', 'Let a bot watch the market')}
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-foreground/60 text-pretty">
          {t(
            '自动化交易策略或跟随顶级交易员。网格、马丁格尔、定投与套利一键创建，7×24 小时不间断执行。',
            'Automate strategies or follow top traders. Launch grid, martingale, recurring-buy and arbitrage bots in one click — running 24/7.',
          )}
        </p>
        <DevNotice />
      </section>

      <ToolGrid />

      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-24 md:px-6">
        <div role="tablist" aria-label={t('策略分类', 'Strategy sections')} className="flex gap-6 overflow-x-auto border-b border-line">
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
                '-mb-px shrink-0 border-b-2 pb-3 text-base transition-colors focus-visible:outline-none focus-visible:text-foreground',
                section === s.id ? 'border-gold text-foreground' : 'border-transparent text-foreground/45 hover:text-foreground/80',
              )}
            >
              {t(s.label)}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${section}`} aria-labelledby={`tab-${section}`} className="flex flex-col gap-10">
          {section === 'curated' && CURATED_THEMES.map((theme) => <ThemeBlock key={theme.id} theme={theme} />)}
          {section === 'spot-copy' && <LeaderGrid styles={SPOT_COPY_STYLES} />}
          {section === 'swap-copy' && <LeaderGrid styles={SWAP_COPY_STYLES} />}
        </div>

        <p className="text-xs leading-relaxed text-foreground/35">
          {t(
            '*策略与跟单存在亏损风险，请根据自身风险承受能力谨慎参与。',
            '*Bots and copy trading can lose money. Participate according to your risk tolerance.',
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
