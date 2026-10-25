'use client'

import { useRef } from 'react'
import useSWR from 'swr'
import { useI18n } from '@/lib/i18n'
import { PRESALE } from '@/lib/presale'

type PresaleData = { raised: number; updatedAt: number }
type Point = { t: number; v: number }

const fetcher = async (url: string): Promise<PresaleData> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('fetch failed')
  return res.json()
}

const W = 600
const H = 160
const MAX_POINTS = 60

function buildPath(points: Point[]) {
  if (points.length === 0) return { line: '', area: '' }
  const series = points.length === 1 ? [points[0], { ...points[0], t: points[0].t + 1 }] : points
  const t0 = series[0].t
  const t1 = series[series.length - 1].t
  const vMin = Math.min(...series.map((p) => p.v))
  const vMax = Math.max(...series.map((p) => p.v))
  const span = vMax - vMin || 1
  const coords = series.map((p) => {
    const x = ((p.t - t0) / (t1 - t0 || 1)) * W
    const y = vMax === vMin ? H * 0.75 : H - 8 - ((p.v - vMin) / span) * (H - 24)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = `M${coords.join(' L')}`
  return { line, area: `${line} L${W},${H} L0,${H} Z` }
}

const usd = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 })

export function PresaleTracker() {
  const { t } = useI18n()
  const history = useRef<Point[]>([])
  const { data, error, isLoading } = useSWR('/api/presale', fetcher, {
    refreshInterval: 15000,
    onSuccess: (d) => {
      const last = history.current[history.current.length - 1]
      if (!last || last.t !== d.updatedAt) {
        history.current = [...history.current, { t: d.updatedAt, v: d.raised }].slice(-MAX_POINTS)
      }
    },
  })

  const raised = data?.raised ?? 0
  const pct = Math.min(100, (raised / PRESALE.hardCapUsdt) * 100)
  const { line, area } = buildPath(history.current)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[13px] uppercase tracking-[0.2em] text-gold-light/70">
          <span
            className={`size-2 rounded-full ${error ? 'bg-white/30' : 'animate-pulse bg-gold'}`}
            aria-hidden="true"
          />
          {error ? t('链上数据暂不可用', 'On-chain data unavailable') : t('链上实时募资', 'Live On-Chain Raise')}
        </div>
        <p className="text-[clamp(40px,8vw,80px)] font-light leading-none tracking-[-0.04em] text-white">
          {isLoading ? '—' : usd(raised)}
          <span className="ml-3 text-[16px] tracking-normal text-gold">USDT</span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-gold/15"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label={t('私募进度', 'Presale progress')}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light transition-[width] duration-1000"
            style={{ width: `${Math.max(pct, 0.5)}%` }}
          />
        </div>
        <div className="flex justify-between text-[13px] text-white/40 sm:text-[14px]">
          <span>{pct.toFixed(2)}%</span>
          <span>{t('私募目标', 'Target')} {usd(PRESALE.hardCapUsdt)} USDT</span>
        </div>
      </div>

      <figure className="flex flex-col gap-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-32 w-full sm:h-40"
          role="img"
          aria-label={t(`私募金额实时走势，当前 ${usd(raised)} USDT`, `Live presale raise trend, currently ${usd(raised)} USDT`)}
        >
          <defs>
            <linearGradient id="presale-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((r) => (
            <line
              key={r}
              x1="0"
              x2={W}
              y1={H * r}
              y2={H * r}
              className="stroke-gold/15"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <g className="text-gold">
            <path d={area} fill="url(#presale-fill)" />
            <path
              d={line}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
        <figcaption className="text-[13px] text-white/40">{t('每 15 秒同步 BSC 链上地址余额', 'Synced with the BSC address balance every 15 seconds')}</figcaption>
      </figure>
    </div>
  )
}
