'use client'

import Image from 'next/image'
import { MotionConfig, motion, useReducedMotion, useTime, useTransform } from 'framer-motion'
import { Landmark } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SynapseXLogo } from './logo'

const BRANDS = {
  nvda: { src: '/logos/nvidia.svg', label: 'NVIDIA 代币' },
  usdt: { src: '/logos/tether.svg', label: 'USDT' },
  btc: { src: '/logos/bitcoin.svg', label: 'BTC' },
  tsla: { src: '/logos/tesla.svg', label: 'Tesla 代币' },
} as const

type Brand = keyof typeof BRANDS

function BrandCoin({
  brand,
  size = 'size-12',
  flip = false,
  delay = 0,
}: {
  brand: Brand
  size?: string
  flip?: boolean
  delay?: number
}) {
  const { src, label } = BRANDS[brand]

  const face = (
    <div
      className={cn(
        size,
        'relative flex items-center justify-center overflow-hidden rounded-full border-2 border-gold/70 bg-gradient-to-br from-foreground/25 via-background to-background shadow-[0_0_22px_-4px_var(--color-gold)]',
      )}
    >
      <span aria-hidden="true" className="absolute inset-[3px] rounded-full border border-foreground/10" />
      <Image src={src} alt={label} width={48} height={48} className="relative size-[56%] object-contain" />
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-foreground/40 to-transparent"
        animate={{ x: ['0%', '520%'] }}
        transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 3.2, delay, ease: 'easeInOut' }}
      />
    </div>
  )

  if (!flip) return face

  return (
    <div style={{ perspective: 600 }}>
      <motion.div
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.4, delay, ease: [0.65, 0, 0.35, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {face}
      </motion.div>
    </div>
  )
}

function OrbitCoin({
  brand,
  index,
  count,
  rx,
  ry,
  period,
  size,
  reverse = false,
}: {
  brand: Brand
  index: number
  count: number
  rx: number
  ry: number
  period: number
  size: string
  reverse?: boolean
}) {
  const reduce = useReducedMotion()
  const time = useTime()
  const offset = (index / count) * Math.PI * 2
  const angle = useTransform(time, (t) =>
    reduce ? offset : (reverse ? -1 : 1) * (t / period) * Math.PI * 2 + offset,
  )
  const x = useTransform(angle, (a) => Math.cos(a) * rx)
  const y = useTransform(angle, (a) => Math.sin(a) * ry)
  const depth = useTransform(angle, (a) => (Math.sin(a) + 1) / 2)
  const scale = useTransform(depth, (d) => 0.62 + d * 0.48)
  const opacity = useTransform(depth, (d) => 0.4 + d * 0.6)
  const zIndex = useTransform(depth, (d) => (d > 0.5 ? 20 : 1))
  const blur = useTransform(depth, (d) => `blur(${(1 - d) * 1.6}px)`)

  return (
    <motion.div className="absolute left-1/2 top-1/2" style={{ x, y, scale, opacity, zIndex, filter: blur }}>
      <div className="-translate-x-1/2 -translate-y-1/2">
        <BrandCoin brand={brand} size={size} flip delay={index * 0.6} />
      </div>
    </motion.div>
  )
}

const ORBIT_ORDER: Brand[] = ['btc', 'nvda', 'usdt', 'tsla']

function AccountsArt() {
  return (
    <div className="relative flex size-60 items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-24 w-56 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-dashed border-gold/30"
      />
      <motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-24 w-56 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-transparent border-t-gold/70"
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 flex size-24 items-center justify-center rounded-2xl border border-gold/40 bg-gradient-to-b from-foreground/15 to-background shadow-[0_20px_40px_-12px_var(--color-gold)]"
      >
        <Landmark className="size-11 text-foreground/85" strokeWidth={1.5} aria-hidden="true" />
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl border border-gold"
          animate={{ opacity: [0.6, 0], scale: [1, 1.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
        />
      </motion.div>

      {ORBIT_ORDER.map((brand, i) => (
        <OrbitCoin key={brand} brand={brand} index={i} count={4} rx={104} ry={44} period={9000} size="size-12" />
      ))}
    </div>
  )
}

const API_INNER: Brand[] = ['btc', 'usdt', 'nvda', 'tsla']
const API_OUTER: Brand[] = ['tsla', 'nvda', 'usdt', 'btc']

function ApiArt() {
  return (
    <div className="relative flex size-60 items-center justify-center">
      {API_INNER.map((_, i) => (
        <motion.span
          key={`stream-${i}`}
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-px w-24 origin-left bg-gradient-to-r from-gold/0 via-gold to-gold/0"
          style={{ rotate: i * 90 + 45 }}
          animate={{ opacity: [0, 1, 0], scaleX: [0.2, 1, 0.2] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
        />
      ))}

      {API_OUTER.map((brand, i) => (
        <OrbitCoin key={`o-${brand}`} brand={brand} index={i} count={4} rx={108} ry={96} period={16000} size="size-10" reverse />
      ))}
      {API_INNER.map((brand, i) => (
        <OrbitCoin key={`i-${brand}`} brand={brand} index={i + 0.5} count={4} rx={74} ry={62} period={10000} size="size-9" />
      ))}

      <div className="relative z-10 flex h-14 w-28 -rotate-12 items-center rounded-full border-[5px] border-gold bg-background/80 p-1 shadow-[0_0_36px_-4px_var(--color-gold)]">
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-gold"
          animate={{ opacity: [0.7, 0], scale: [1, 1.4] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          animate={{ x: [0, 54, 54, 0, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: [0.65, 0, 0.35, 1], times: [0, 0.35, 0.5, 0.85, 1] }}
          className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold"
        >
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
            <SynapseXLogo className="size-5 text-background" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

const CANDLES = [
  { h: [44, 72, 44], up: true },
  { h: [62, 36, 62], up: false },
  { h: [34, 62, 34], up: true },
  { h: [50, 84, 50], up: true },
]

const STACK: Brand[] = ['usdt', 'usdt', 'usdt']

function LiquidityArt() {
  return (
    <div className="relative flex size-60 flex-col items-center justify-end gap-3 pb-4">
      <div className="flex h-28 items-end gap-4" aria-hidden="true">
        {CANDLES.map((c, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="h-3 w-px bg-foreground/40" />
            <motion.div
              animate={{ height: c.h }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
              className={cn('w-4 rounded-sm', c.up ? 'bg-gold shadow-[0_0_12px_-2px_var(--color-gold)]' : 'bg-foreground/40')}
            />
            <div className="h-3 w-px bg-foreground/40" />
          </div>
        ))}
      </div>

      <motion.div
        animate={{ rotate: [-7, 5, -7] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative h-2 w-44 origin-center rounded-full bg-gradient-to-r from-foreground/30 via-foreground/70 to-foreground/30"
      >
        <div className="absolute bottom-2 right-2 flex flex-col-reverse items-center">
          {STACK.map((brand, n) => (
            <motion.div
              key={n}
              className="-mt-4"
              initial={{ opacity: 0, y: -60 }}
              animate={{ opacity: [0, 1, 1, 0], y: [-60, 0, 0, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: n * 0.45,
                times: [0, 0.18, 0.85, 1],
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              <BrandCoin brand={brand} size="size-9" />
            </motion.div>
          ))}
        </div>
      </motion.div>
      <div className="h-6 w-10 bg-gradient-to-b from-foreground/40 to-transparent [clip-path:polygon(50%_0,100%_100%,0_100%)]" />

      <motion.div
        className="absolute left-2 top-2"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BrandCoin brand="nvda" size="size-14" flip />
      </motion.div>
      <motion.div
        className="absolute right-3 top-6"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        <BrandCoin brand="btc" size="size-12" flip delay={1.2} />
      </motion.div>
      <motion.div
        className="absolute left-1/2 top-0 -translate-x-1/2"
        animate={{ y: [0, -6, 0], rotate: [-6, 6, -6] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
      >
        <BrandCoin brand="tsla" size="size-10" delay={2} />
      </motion.div>
    </div>
  )
}

const CARDS: { title: string; body: string; art: ReactNode }[] = [
  {
    title: '多层级子账户与精细化权限管控',
    body: '主账户统一管理资金，子账户按团队与策略分配额度和权限。',
    art: <AccountsArt />,
  },
  {
    title: '低延迟 API 与毫秒级撮合执行',
    body: 'REST 与 WebSocket 双通道接入，加密与美股代币一套接口直连。',
    art: <ApiArt />,
  },
  {
    title: '聚合深度流动性与大宗 OTC 服务',
    body: '多源深度汇聚，大额订单专属通道，降低冲击成本。',
    art: <LiquidityArt />,
  },
]

export function Institutional() {
  return (
    <MotionConfig reducedMotion="user">
      <section
        id="institutional"
        aria-labelledby="institutional-heading"
        className="relative flex w-full flex-col items-center overflow-hidden bg-black px-6 py-24 sm:px-10 lg:px-20"
      >
        <motion.h2
          id="institutional-heading"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9 }}
          className="text-gold-gradient max-w-4xl text-balance text-center text-[clamp(26px,4vw,48px)] font-bold leading-tight"
        >
          为机构与专业交易者，打造高性能交易引擎
        </motion.h2>

        <ul className="mt-14 grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {CARDS.map((card, i) => (
            <motion.li
              key={card.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: i * 0.15 }}
              whileHover={{ y: -6 }}
              className="group flex min-h-[27rem] flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-gold/10 bg-white/[0.04] p-7 transition-colors hover:border-gold/35"
            >
              <div className="flex flex-col gap-3">
                <h3 className="text-pretty text-[20px] font-bold leading-snug text-foreground">{card.title}</h3>
                <p className="text-pretty text-[14px] leading-relaxed text-foreground/50">{card.body}</p>
              </div>
              <div className="flex justify-center">{card.art}</div>
            </motion.li>
          ))}
        </ul>
      </section>
    </MotionConfig>
  )
}
