'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type Stock = {
  ticker: string
  name: { zh: string; en: string }
  logo: string
  chip: string
  invert?: boolean
  price: string
  change: string
  up: boolean
}

const STOCKS: Stock[] = [
  { ticker: 'TSLA', name: { zh: '特斯拉', en: 'Tesla' }, logo: '/logos/tesla.svg', chip: 'bg-[#E31937]', invert: true, price: '248.31', change: '+2.84%', up: true },
  { ticker: 'AAPL', name: { zh: '苹果', en: 'Apple' }, logo: '/logos/apple.svg', chip: 'bg-white', price: '231.70', change: '-0.62%', up: false },
  { ticker: 'NVDA', name: { zh: '英伟达', en: 'NVIDIA' }, logo: '/logos/nvidia.svg', chip: 'bg-[#76B900]', invert: true, price: '137.48', change: '+3.15%', up: true },
  { ticker: '0700.HK', name: { zh: '腾讯控股', en: 'Tencent' }, logo: '/logos/tencent.svg', chip: 'bg-[#0052D9]', price: '418.60', change: '+1.27%', up: true },
  { ticker: '9988.HK', name: { zh: '阿里巴巴', en: 'Alibaba' }, logo: '/logos/alibaba.svg', chip: 'bg-[#FF6A00]', price: '96.85', change: '-1.04%', up: false },
  { ticker: 'HOOD', name: { zh: 'Robinhood', en: 'Robinhood' }, logo: '/logos/robinhood.svg', chip: 'bg-[#CCFF00]', price: '108.18', change: '+4.62%', up: true },
  { ticker: 'GOOGL', name: { zh: '谷歌', en: 'Alphabet' }, logo: '/logos/google.svg', chip: 'bg-white', price: '172.94', change: '-0.38%', up: false },
]

const TABS = [
  { zh: '美股', en: 'US' },
  { zh: '港股', en: 'HK' },
  { zh: 'ETF', en: 'ETF' },
  { zh: '期权', en: 'Options' },
]

function buildCandles(count: number) {
  let seed = 7
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  let price = 60
  return Array.from({ length: count }, () => {
    const open = price
    const close = Math.min(90, Math.max(18, open + (rand() - 0.45) * 12))
    const high = Math.max(open, close) + rand() * 5
    const low = Math.min(open, close) - rand() * 5
    price = close
    return { open, close, high, low }
  })
}

const CANDLES = buildCandles(34)
const ASKS = [62, 38, 51, 24, 44, 30]
const BIDS = [28, 47, 35, 58, 41, 66]

function CandleChart() {
  const width = 100 / CANDLES.length
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full" aria-hidden="true">
      {[25, 50, 75].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="0.3" />
      ))}
      {CANDLES.map((c, i) => {
        const up = c.close >= c.open
        const x = i * width + width / 2
        const color = up ? '#22c55e' : '#ef4444'
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={100 - c.high} y2={100 - c.low} stroke={color} strokeWidth="0.35" />
            <rect
              x={x - width * 0.3}
              width={width * 0.6}
              y={100 - Math.max(c.open, c.close)}
              height={Math.max(0.8, Math.abs(c.close - c.open))}
              fill={color}
            />
          </g>
        )
      })}
    </svg>
  )
}

function DesktopTerminal() {
  const { t } = useI18n()
  return (
    <div className="flex size-full flex-col overflow-hidden rounded-2xl border border-gold/25 bg-[#0b080c] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9),0_0_60px_-30px_var(--color-gold)]">
      <div className="flex items-center gap-3 border-b border-white/5 px-3 py-2 text-[9px] text-white/50">
        <span className="font-semibold tracking-wide text-gold">oxxx</span>
        <span className="text-white/85">{t('交易', 'Trade')}</span>
        <span>{t('行情', 'Markets')}</span>
        <span>{t('期权', 'Options')}</span>
        <span className="ml-auto">{t('资产', 'Assets')}</span>
      </div>
      <div className="flex items-center gap-3 border-b border-white/5 px-3 py-1.5 text-[8px]">
        <span className="font-semibold text-white">NVDA</span>
        <span className="text-[#22c55e]">137.48</span>
        <span className="text-white/40">{t('24H 成交', '24H Vol')} 1.87B</span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="relative flex-1 p-2">
          <CandleChart />
        </div>
        <div className="flex w-[28%] flex-col gap-[3px] border-l border-white/5 p-2 font-mono text-[7px]">
          {ASKS.map((w, i) => (
            <div key={`a${i}`} className="relative flex justify-between text-[#ef4444]">
              <span aria-hidden="true" className="absolute inset-y-0 right-0 bg-[#ef4444]/15" style={{ width: `${w}%` }} />
              <span className="relative">{(138.2 - i * 0.12).toFixed(2)}</span>
              <span className="relative text-white/50">{(w / 7).toFixed(2)}</span>
            </div>
          ))}
          <div className="py-0.5 text-center text-[8px] text-white">137.48</div>
          {BIDS.map((w, i) => (
            <div key={`b${i}`} className="relative flex justify-between text-[#22c55e]">
              <span aria-hidden="true" className="absolute inset-y-0 right-0 bg-[#22c55e]/15" style={{ width: `${w}%` }} />
              <span className="relative">{(137.4 - i * 0.12).toFixed(2)}</span>
              <span className="relative text-white/50">{(w / 7).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PhoneList() {
  const { t } = useI18n()
  return (
    <div className="flex size-full flex-col overflow-hidden rounded-[2rem] border-[5px] border-[#2b2630] bg-black shadow-[0_50px_90px_-25px_rgba(0,0,0,1),0_0_0_1px_rgba(255,255,255,0.08)]">
      <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[9px] font-semibold text-white">
        <span>9:41</span>
        <span aria-hidden="true" className="h-3.5 w-14 rounded-full bg-[#1a171c]" />
        <span aria-hidden="true" className="h-2 w-4 rounded-[2px] bg-white/85" />
      </div>
      <div className="flex gap-3 px-4 pb-2 pt-2 text-[10px]">
        {TABS.map((tab, i) => (
          <span key={tab.en} className={cn('pb-1', i === 0 ? 'border-b border-gold font-medium text-white' : 'text-white/45')}>
            {t(tab)}
          </span>
        ))}
      </div>
      <ul className="flex flex-col">
        {STOCKS.map((s) => (
          <li key={s.ticker} className="flex items-center gap-2 border-t border-white/[0.04] px-3 py-[7px]">
            <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', s.chip)}>
              <Image src={s.logo} alt="" width={14} height={14} className={cn('size-3.5 object-contain', s.invert && 'brightness-0 invert')} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-[10px] font-semibold text-white">{s.ticker}</span>
              <span className="truncate text-[8px] text-white/45">{t(s.name)}</span>
            </span>
            <span className="flex flex-col items-end leading-tight">
              <span className="font-mono text-[10px] text-white">{s.price}</span>
              <span className={cn('font-mono text-[8px]', s.up ? 'text-[#22c55e]' : 'text-[#ef4444]')}>{s.change}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-auto px-3 pb-4 pt-2">
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] text-white/40">
          {t('搜索股票、ETF', 'Search stocks, ETFs')}
        </div>
      </div>
    </div>
  )
}

export function SecuritiesDevices() {
  const { t } = useI18n()
  return (
    <figure className="relative mx-auto aspect-[6/5] w-full max-w-xl">
      <figcaption className="sr-only">
        {t('oxxx.io 证券交易界面：桌面端 K 线与盘口，移动端美股、港股行情列表', 'oxxx.io securities trading on desktop and mobile')}
      </figcaption>
      <div aria-hidden="true" className="absolute inset-x-[15%] inset-y-[20%] rounded-full bg-gold/20 blur-3xl" />

      <motion.div
        className="absolute inset-x-0 top-[16%] bottom-[12%]"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <DesktopTerminal />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 rounded-b-2xl bg-gradient-to-t from-black to-transparent" />
      </motion.div>

      <motion.div
        className="absolute inset-y-0 left-1/2 w-[40%] -translate-x-1/2"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="size-full"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <PhoneList />
        </motion.div>
      </motion.div>
    </figure>
  )
}
