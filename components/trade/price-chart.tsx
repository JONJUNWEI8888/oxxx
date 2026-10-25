'use client'

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import type { LiveCandle } from '@/hooks/use-binance-market'
import { useI18n } from '@/lib/i18n'
import { CHART_COLORS, type Candle, type Interval, type Market, fetchKlines, formatNumber } from '@/lib/markets'

const MA_PERIODS = [
  { period: 7, color: CHART_COLORS.ma7 },
  { period: 25, color: CHART_COLORS.ma25 },
  { period: 99, color: CHART_COLORS.ma99 },
] as const

type Series = {
  candles: ISeriesApi<'Candlestick'>
  volume: ISeriesApi<'Histogram'>
  ma: ISeriesApi<'Line'>[]
}

const tzOffsetSeconds = () => -new Date().getTimezoneOffset() * 60
const toChartTime = (ms: number) => (Math.floor(ms / 1000) + tzOffsetSeconds()) as UTCTimestamp

function averageAt(candles: Candle[], index: number, period: number) {
  if (index + 1 < period) return null
  let sum = 0
  for (let i = index - period + 1; i <= index; i++) sum += candles[i].close
  return sum / period
}

const volumeBar = (c: Candle) => ({
  time: toChartTime(c.time),
  value: c.volume,
  color: c.close >= c.open ? CHART_COLORS.upVolume : CHART_COLORS.downVolume,
})

const candleBar = (c: Candle) => ({ time: toChartTime(c.time), open: c.open, high: c.high, low: c.low, close: c.close })

export function PriceChart({ market, interval, liveCandle }: { market: Market; interval: Interval; liveCandle: LiveCandle | null }) {
  const { t, lang } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<Series | null>(null)
  const candlesRef = useRef<Candle[]>([])
  const hoveringRef = useRef(false)
  const [legend, setLegend] = useState<{ candle: Candle; ma: (number | null)[] } | null>(null)

  const { data: history, error, isLoading } = useSWR(['klines', market.symbol, interval], () => fetchKlines(market.symbol, interval), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: CHART_COLORS.text,
        fontFamily: 'Space Mono, monospace',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { color: CHART_COLORS.grid }, horzLines: { color: CHART_COLORS.grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: CHART_COLORS.crosshair, labelBackgroundColor: '#3a2832' },
        horzLine: { color: CHART_COLORS.crosshair, labelBackgroundColor: '#3a2832' },
      },
      rightPriceScale: { borderColor: CHART_COLORS.border, scaleMargins: { top: 0.12, bottom: 0.24 } },
      timeScale: { borderColor: CHART_COLORS.border, timeVisible: true, secondsVisible: false, rightOffset: 6 },
    })

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      borderVisible: false,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    })
    const volume = chart.addSeries(HistogramSeries, { priceScaleId: 'volume', priceFormat: { type: 'volume' }, lastValueVisible: false, priceLineVisible: false })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    const ma = MA_PERIODS.map(({ color }) =>
      chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }),
    )

    chart.subscribeCrosshairMove((param) => {
      const list = candlesRef.current
      if (!param.time || !param.point) {
        hoveringRef.current = false
        const last = list.length - 1
        if (last >= 0) setLegend({ candle: list[last], ma: MA_PERIODS.map(({ period }) => averageAt(list, last, period)) })
        return
      }
      hoveringRef.current = true
      const index = list.findIndex((c) => toChartTime(c.time) === param.time)
      if (index >= 0) setLegend({ candle: list[index], ma: MA_PERIODS.map(({ period }) => averageAt(list, index, period)) })
    })

    chartRef.current = chart
    seriesRef.current = { candles, volume, ma }
    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.applyOptions({ localization: { locale: lang } })
  }, [lang])

  useEffect(() => {
    const series = seriesRef.current
    if (!series || !history) return
    candlesRef.current = history
    series.candles.setData(history.map(candleBar))
    series.volume.setData(history.map(volumeBar))
    MA_PERIODS.forEach(({ period }, i) => {
      series.ma[i].setData(
        history.flatMap((c, idx) => {
          const value = averageAt(history, idx, period)
          return value === null ? [] : [{ time: toChartTime(c.time), value }]
        }),
      )
    })
    const last = history.length - 1
    if (last >= 0) {
      chartRef.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, last - 120), to: last + 6 })
      setLegend({ candle: history[last], ma: MA_PERIODS.map(({ period }) => averageAt(history, last, period)) })
    }
  }, [history])

  useEffect(() => {
    const series = seriesRef.current
    const list = candlesRef.current
    if (!series || !liveCandle || !list.length) return
    if (liveCandle.symbol !== market.symbol || liveCandle.interval !== interval) return
    const lastIndex = list.length - 1
    if (liveCandle.time < list[lastIndex].time) return

    const candle: Candle = { time: liveCandle.time, open: liveCandle.open, high: liveCandle.high, low: liveCandle.low, close: liveCandle.close, volume: liveCandle.volume }
    if (liveCandle.time === list[lastIndex].time) list[lastIndex] = candle
    else list.push(candle)
    const index = list.length - 1

    series.candles.update(candleBar(candle))
    series.volume.update(volumeBar(candle))
    const ma = MA_PERIODS.map(({ period }, i) => {
      const value = averageAt(list, index, period)
      if (value !== null) series.ma[i].update({ time: toChartTime(candle.time), value })
      return value
    })
    if (!hoveringRef.current) setLegend({ candle, ma })
  }, [liveCandle, market.symbol, interval])

  const change = legend ? legend.candle.close - legend.candle.open : 0
  const changeTone = change >= 0 ? 'text-up' : 'text-down'

  return (
    <div className="relative h-full min-h-0 w-full">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-3 top-2 z-10 flex flex-col gap-1 text-[11px] leading-relaxed">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="text-white/70">
            {market.base}/{market.quote} · {interval}
          </span>
          {legend && (
            <span className={`flex flex-wrap gap-x-2 tabular-nums ${changeTone}`}>
              <span>
                <span className="text-white/40">O </span>
                {formatNumber(legend.candle.open, market.priceDp)}
              </span>
              <span>
                <span className="text-white/40">H </span>
                {formatNumber(legend.candle.high, market.priceDp)}
              </span>
              <span>
                <span className="text-white/40">L </span>
                {formatNumber(legend.candle.low, market.priceDp)}
              </span>
              <span>
                <span className="text-white/40">C </span>
                {formatNumber(legend.candle.close, market.priceDp)}
              </span>
              <span>
                {change >= 0 ? '+' : ''}
                {formatNumber(change, market.priceDp)} ({change >= 0 ? '+' : ''}
                {formatNumber((change / legend.candle.open) * 100, 2)}%)
              </span>
            </span>
          )}
        </div>
        {legend && (
          <div className="flex flex-wrap gap-x-3 tabular-nums">
            {MA_PERIODS.map(({ period, color }, i) => (
              <span key={period} style={{ color }}>
                MA{period} {formatNumber(legend.ma[i], market.priceDp)}
              </span>
            ))}
          </div>
        )}
      </div>

      {(isLoading || error) && (
        <div className="absolute inset-0 z-20 flex items-center justify-center text-sm text-white/50">
          {error ? t('K 线历史数据加载失败，正在使用实时数据', 'Failed to load history, showing live data only') : t('加载 K 线数据…', 'Loading candles…')}
        </div>
      )}
    </div>
  )
}
