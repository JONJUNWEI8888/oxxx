'use client'

import { useRef } from 'react'
import useSWR from 'swr'
import { useI18n } from '@/lib/i18n'
import { presaleSummaryVisible } from '@/lib/presale-summary'

type PresaleData = {
  raised: number
  hardCapUsdt: number
  updatedAt: number
  subscriberCount: number
  /** True once the indexer cursor has passed the configured start block. */
  ready: boolean
}
type Point = { t: number; v: number }

const fetcher = async (url: string): Promise<PresaleData> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('fetch failed')
  const body = (await res.json()) as Partial<PresaleData>
  if (typeof body.raised !== 'number' || typeof body.hardCapUsdt !== 'number' || typeof body.updatedAt !== 'number') {
    throw new Error('invalid presale payload')
  }
  return {
    raised: body.raised,
    hardCapUsdt: body.hardCapUsdt,
    updatedAt: body.updatedAt,
    subscriberCount: typeof body.subscriberCount === 'number' ? body.subscriberCount : 0,
    ready: body.ready === true,
  }
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

function formatUsdt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function formatPercent(pct: number) {
  if (pct > 0 && pct < 0.01) return `${pct.toFixed(4)}%`
  return `${pct.toFixed(2)}%`
}

function isLive(data: PresaleData | undefined): data is PresaleData {
  return presaleSummaryVisible(data ?? {})
}

export function PresaleTracker() {
  const { t } = useI18n()
  const history = useRef<Point[]>([])
  const { data, error } = useSWR('/api/presale', fetcher, {
    refreshInterval: 15000,
    onSuccess: (d) => {
      if (!isLive(d)) return
      const last = history.current[history.current.length - 1]
      if (!last || last.t !== d.updatedAt) {
        history.current = [...history.current, { t: d.updatedAt, v: d.raised }].slice(-MAX_POINTS)
      }
    },
  })

  const live = !error && isLive(data)
  const pct = live ? Math.min(100, (data.raised / data.hardCapUsdt) * 100) : 0
  const { line, area } = buildPath(live ? history.current : [])
  const raisedLabel = live ? formatUsdt(data.raised) : ''

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[13px] uppercase tracking-[0.2em] text-gold-light/70">
          <span
            className={`size-2 rounded-full ${live ? 'animate-pulse bg-gold' : 'bg-white/30'}`}
            aria-hidden="true"
          />
          {live ? t('链上实时募资', 'Live On-Chain Raise') : t('数据同步中', 'Syncing data')}
        </div>
        <p className="text-[clamp(40px,8vw,80px)] font-light leading-none tracking-[-0.04em] text-white">
          {live ? (
            <>
              {raisedLabel}
              <span className="ml-3 text-[16px] tracking-normal text-gold">USDT</span>
            </>
          ) : (
            <span className="text-[clamp(28px,5vw,48px)] tracking-normal text-white/80">{t('数据同步中', 'Syncing data')}</span>
          )}
        </p>
        {live ? (
          <p className="text-[13px] text-white/45 sm:text-[14px]">
            {t(`${data.subscriberCount} 位认购人`, `${data.subscriberCount} subscribers`)}
          </p>
        ) : null}
      </div>

      {live ? (
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
              style={{ width: `${pct}%`, minWidth: pct > 0 ? '2px' : '0' }}
            />
          </div>
          <div className="flex justify-between gap-4 text-[13px] text-white/40 sm:text-[14px]">
            <span>{formatPercent(pct)}</span>
            <span>
              {t('私募目标', 'Target')} {formatUsdt(data.hardCapUsdt)} USDT
            </span>
          </div>
        </div>
      ) : (
        <p className="text-[14px] text-white/45" role="status">
          {t('链上合计尚未就绪，进度不会显示占位数字。', 'The on-chain total is not ready, so no placeholder amount is shown.')}
        </p>
      )}

      {live ? (
        <figure className="flex flex-col gap-2">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-32 w-full sm:h-40"
            role="img"
            aria-label={t(`私募金额实时走势，当前 ${raisedLabel} USDT`, `Live presale raise trend, currently ${raisedLabel} USDT`)}
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
              <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
          <figcaption className="text-[13px] text-white/40">
            {t('每 15 秒同步已确认的 BSC 入账', 'Synced with confirmed BSC deposits every 15 seconds')}
          </figcaption>
        </figure>
      ) : null}

      <a href="/presale" className="self-start text-[14px] text-gold-light underline-offset-4 hover:underline">
        {t('我的认购', 'My subscription')}
      </a>
    </div>
  )
}
