'use client'

import Image from 'next/image'
import { MotionConfig, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { PointerEvent } from 'react'
import { cn } from '@/lib/utils'

const FEATURES = [
  '一站式交易美股、港股、ETF 与美股期权',
  '实时行情、Level-2 深度数据与多周期 K 线',
  '个股分析、期权链与风险收益分析工具',
]

const COINS = [
  { src: '/logos/tencent.svg', label: '腾讯控股', ticker: '0700.HK', className: 'left-[4%] top-[2%] w-[46%] aspect-square', tilt: -18, delay: 0 },
  { src: '/logos/apple.svg', label: '苹果', ticker: 'AAPL', className: 'right-[2%] top-[22%] w-[40%] aspect-square', tilt: 16, delay: 0.6 },
  { src: '/logos/alibaba.svg', label: '阿里巴巴', ticker: 'BABA', className: 'left-[8%] top-[46%] w-[40%] aspect-square', tilt: -14, delay: 1.2 },
  { src: '/logos/nvidia.svg', label: '英伟达', ticker: 'NVDA', className: 'right-[8%] top-[66%] w-[40%] aspect-square', tilt: 20, delay: 1.8 },
]

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

function StockCoin({ src, label, ticker, className, tilt, delay }: (typeof COINS)[number]) {
  return (
    <motion.div
      className={cn('absolute', className)}
      style={{ perspective: 900 }}
      initial={{ opacity: 0, scale: 0.6, y: 60 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1, delay: 0.3 + delay * 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="group relative size-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ y: [0, -14, 0], rotateY: [tilt, tilt * -0.6, tilt], rotateX: [12, 4, 12] }}
        transition={{ duration: 6.5, delay, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Ridged edge offset behind the face reads as coin thickness while the coin rotates. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 translate-x-2 translate-y-3 rounded-full bg-[repeating-linear-gradient(90deg,#3a2a33_0px,#3a2a33_2px,#16101a_2px,#16101a_4px)] [box-shadow:0_30px_50px_-12px_rgba(0,0,0,0.9)]"
        />
        <span aria-hidden="true" className="absolute inset-0 translate-x-1 translate-y-1.5 rounded-full bg-[#2a1f27]" />

        <div className="absolute inset-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_32%_28%,#8a7f88_0%,#4b434b_38%,#211b22_100%)] [box-shadow:inset_0_2px_6px_rgba(255,255,255,0.35),inset_0_-10px_24px_rgba(0,0,0,0.6)]">
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(255,255,255,0.08),rgba(255,255,255,0)_25%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0)_75%,rgba(255,255,255,0.08))]" />
          <motion.span
            aria-hidden="true"
            className="absolute inset-[7%] rounded-full border-[3px] border-gold"
            animate={{ boxShadow: ['0 0 10px var(--color-gold), inset 0 0 10px var(--color-gold)', '0 0 22px var(--color-gold), inset 0 0 18px var(--color-gold)', '0 0 10px var(--color-gold), inset 0 0 10px var(--color-gold)'] }}
            transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span aria-hidden="true" className="absolute inset-[13%] rounded-full border border-foreground/10" />

          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src={src}
              alt={`${label} ${ticker}`}
              width={96}
              height={96}
              className="size-[42%] object-contain opacity-85 brightness-0 invert drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
            />
          </div>

          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-foreground/35 to-transparent"
            animate={{ x: ['0%', '520%'] }}
            transition={{ duration: 1.8, delay: 1 + delay, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
          />
        </div>

        <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] tracking-[0.3em] text-gold/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {ticker}
        </span>
      </motion.div>
    </motion.div>
  )
}

function CoinCluster() {
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-10, 10]), { stiffness: 80, damping: 18 })
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), { stiffness: 80, damping: 18 })

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
  }

  return (
    <div
      className="relative mx-auto aspect-[4/5] w-full max-w-md"
      style={{ perspective: 1200 }}
      onPointerMove={onMove}
      onPointerLeave={() => {
        px.set(0)
        py.set(0)
      }}
    >
      <div aria-hidden="true" className="absolute inset-[18%] rounded-full bg-gold/15 blur-3xl" />
      <motion.div className="relative size-full" style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>
        {COINS.map((coin) => (
          <StockCoin key={coin.ticker} {...coin} />
        ))}
      </motion.div>
    </div>
  )
}

export function Securities() {
  return (
    <MotionConfig reducedMotion="user">
      <section
        id="about"
        aria-labelledby="securities-title"
        className="relative w-full overflow-hidden bg-[radial-gradient(ellipse_at_80%_40%,color-mix(in_oklab,var(--color-gold)_14%,black)_0%,black_60%)] px-6 py-24 sm:px-12 lg:py-32"
      >
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-16 md:flex-row md:gap-10">
          <motion.div
            className="flex w-full flex-col gap-8 md:w-3/5"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ staggerChildren: 0.12 }}
          >
            <motion.p variants={fadeUp} className="font-mono text-xs tracking-[0.4em] text-gold">
              {'SECURITIES · 证券交易'}
            </motion.p>

            <motion.h2
              id="securities-title"
              variants={fadeUp}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-balance font-sans text-4xl font-semibold leading-tight text-white sm:text-5xl xl:text-6xl"
            >
              专业证券交易，
              <br />
              覆盖
              <span className="text-gold-shimmer">美股、港股、</span>
              <br />
              ETF 与美股期权
            </motion.h2>

            <motion.p variants={fadeUp} className="max-w-xl text-pretty text-base leading-relaxed text-white/65">
              在 oxxx.io 交易全球证券产品，获取实时行情、深度数据、个股分析与期权工具支持，帮助你更高效地发现机会、管理头寸与执行策略。
            </motion.p>

            <ul className="flex flex-col gap-3">
              {FEATURES.map((f) => (
                <motion.li
                  key={f}
                  variants={{ hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0 } }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="group flex w-fit items-center gap-3 rounded-lg border border-gold/25 bg-white/[0.02] px-4 py-2.5 text-sm text-white/85 transition-colors hover:border-gold/60 hover:bg-gold/[0.06]"
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold)] transition-transform group-hover:scale-150" />
                  {f}
                </motion.li>
              ))}
            </ul>

            <motion.div variants={fadeUp} className="flex flex-col gap-4 pt-4">
              <a
                href="#platform"
                className="group relative flex h-14 w-full max-w-sm items-center justify-center gap-2 overflow-hidden rounded-xl bg-gold font-medium text-black transition-shadow [box-shadow:0_0_30px_-8px_var(--color-gold)] hover:[box-shadow:0_0_44px_-6px_var(--color-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span className="relative z-10">立即体验</span>
                <ArrowRight className="relative z-10 size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                <span aria-hidden="true" className="absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-white/40 transition-transform duration-700 group-hover:translate-x-[520%]" />
              </a>
              <p className="text-xs text-gold/70">* 证券交易功能暂不支持网页端，下载 oxxx.io App 以获取完整交易功能</p>
            </motion.div>
          </motion.div>

          <div className="w-full md:w-2/5">
            <CoinCluster />
          </div>
        </div>
      </section>
    </MotionConfig>
  )
}
