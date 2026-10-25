'use client'

import { ExternalLink } from 'lucide-react'
import { WORLD_MONITOR_EMBED_URL, WORLD_MONITOR_URL } from '@/components/synapse/nav-data'
import { TradeNav } from '@/components/trade/trade-terminal'
import { I18nProvider, useI18n } from '@/lib/i18n'

function WorldMonitorFrame() {
  const { t } = useI18n()

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 items-center justify-between gap-4 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-gold" />
          </span>
          <h1 className="truncate text-sm font-medium text-white">{t('全球市场态势', 'Global Market Situation')}</h1>
          <span className="hidden text-xs text-white/50 sm:inline">{t('实时 · World Monitor 数据', 'Live · Powered by World Monitor')}</span>
        </div>
        <a
          href={WORLD_MONITOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {t('完整仪表盘', 'Full dashboard')}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50" aria-hidden="true">
          {t('正在加载全球地图…', 'Loading global map…')}
        </div>
        <iframe
          src={WORLD_MONITOR_EMBED_URL}
          title={t('World Monitor 全球实时地图', 'World Monitor live global map')}
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      </div>
    </main>
  )
}

export function WorldMonitorView() {
  return (
    <I18nProvider>
      <div className="flex h-dvh flex-col bg-background text-foreground">
        <TradeNav />
        <WorldMonitorFrame />
      </div>
    </I18nProvider>
  )
}
