'use client'

import { useEffect, useId, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { CHART_COLORS, type Interval, type Market } from '@/lib/markets'

type TradingViewWidget = { remove?: () => void }
type TradingViewGlobal = { widget: new (options: Record<string, unknown>) => TradingViewWidget }

declare global {
  interface Window {
    TradingView?: TradingViewGlobal
  }
}

const TV_SCRIPT_SRC = 'https://s3.tradingview.com/tv.js'

const TV_INTERVALS: Record<Interval, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
  '1w': 'W',
}

const PANEL_BG = '#0d0b0c'
const GRID = 'rgba(255,255,255,0.04)'

let scriptPromise: Promise<TradingViewGlobal> | null = null

function loadTradingView() {
  if (window.TradingView) return Promise.resolve(window.TradingView)
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = TV_SCRIPT_SRC
      script.async = true
      script.onload = () => (window.TradingView ? resolve(window.TradingView) : reject(new Error('TradingView unavailable')))
      script.onerror = () => {
        scriptPromise = null
        script.remove()
        reject(new Error('Failed to load TradingView'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

export function TradingViewChart({ market, interval }: { market: Market; interval: Interval }) {
  const { t, lang } = useI18n()
  const containerId = `tv-${useId().replace(/:/g, '')}`
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    let widget: TradingViewWidget | null = null
    setStatus('loading')

    loadTradingView()
      .then((TradingView) => {
        const container = document.getElementById(containerId)
        if (cancelled || !container) return
        container.innerHTML = ''
        widget = new TradingView.widget({
          container_id: containerId,
          autosize: true,
          symbol: `BINANCE:${market.symbol}.P`,
          interval: TV_INTERVALS[interval],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          theme: 'dark',
          style: '1',
          locale: lang === 'zh' ? 'zh_CN' : 'en',
          toolbar_bg: PANEL_BG,
          backgroundColor: PANEL_BG,
          gridColor: GRID,
          enable_publishing: false,
          allow_symbol_change: false,
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          hide_legend: false,
          save_image: true,
          withdateranges: false,
          details: false,
          calendar: false,
          overrides: {
            'paneProperties.background': PANEL_BG,
            'paneProperties.backgroundType': 'solid',
            'paneProperties.vertGridProperties.color': GRID,
            'paneProperties.horzGridProperties.color': GRID,
            'mainSeriesProperties.candleStyle.upColor': CHART_COLORS.up,
            'mainSeriesProperties.candleStyle.downColor': CHART_COLORS.down,
            'mainSeriesProperties.candleStyle.borderUpColor': CHART_COLORS.up,
            'mainSeriesProperties.candleStyle.borderDownColor': CHART_COLORS.down,
            'mainSeriesProperties.candleStyle.wickUpColor': CHART_COLORS.up,
            'mainSeriesProperties.candleStyle.wickDownColor': CHART_COLORS.down,
          },
          loading_screen: { backgroundColor: PANEL_BG, foregroundColor: CHART_COLORS.up },
        })
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      try {
        widget?.remove?.()
      } catch {
        // The embed may already have torn down its iframe.
      }
      const container = document.getElementById(containerId)
      if (container) container.innerHTML = ''
    }
  }, [containerId, market.symbol, interval, lang])

  return (
    <div className="relative size-full">
      <div id={containerId} className="size-full" />
      {status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/50" role="status">
          {status === 'error' ? t('TradingView 加载失败，请切换至基本版', 'TradingView failed to load. Switch to Basic view.') : t('正在加载 TradingView…', 'Loading TradingView…')}
        </div>
      )}
    </div>
  )
}
