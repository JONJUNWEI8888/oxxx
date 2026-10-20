'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useReducedMotion } from 'framer-motion'
import { BgVideo } from './bg-video'
import { OxEmblem } from './ox-emblem'

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_092455_089c54f8-3b03-4966-9df1-e9746063d0ef.mp4'

type Spec = {
  label: string
  value?: string
  count?: number
  unit?: string
  note?: string
}

const TOKEN_SPECS: Spec[] = [
  { label: '代币名称／符号', value: 'OX', note: '公牛生态权益代币' },
  { label: '发行平台', value: 'oxxx.io 公牛交易所' },
  { label: '总供应量', count: 200_000_000, unit: 'OX', note: '总量恒定' },
  { label: '增发机制', value: '零增发设计', note: '拟不设置任何额外增发' },
  { label: '首轮发行量', count: 21_000_000, unit: 'OX', note: '约占总供应量 10%' },
  { label: '首轮参考价格', value: '1 USDT／OX' },
  { label: '首轮募资上限', count: 2_100_000, unit: 'USDT' },
  { label: '完全稀释估值 FDV', count: 200_000_000, unit: 'USDT', note: '按首轮参考价格测算' },
  { label: '认购资产', value: 'USDT', note: '拟基于 BNB Smart Chain（BSC）' },
]

const FIRST_ROUND_SHARE = 10.5

function CountUp({ to, unit }: { to: number; unit?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduceMotion = useReducedMotion()
  const [value, setValue] = useState(reduceMotion ? to : 0)

  useEffect(() => {
    if (!inView || reduceMotion) return
    const controls = animate(0, to, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, reduceMotion, to])

  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString('en-US')}
      {unit && <span className="ml-2 text-gold-light/80">{unit}</span>}
    </span>
  )
}

export function Cinematic() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="about"
      className="relative flex min-h-screen min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-black px-6 py-28 sm:px-12"
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        animate={reduceMotion ? undefined : { scale: [1.02, 1.06, 1.02] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BgVideo src={VIDEO} className="absolute inset-0 size-full" />
      </motion.div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-44 bg-gradient-to-b from-black to-transparent"
      />

      <div className="relative z-20 flex w-full max-w-5xl flex-col gap-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1 }}
            className="flex flex-col gap-4"
          >
            <span className="text-[13px] uppercase tracking-[0.3em] text-gold sm:text-[14px]">
              Token · 代币经济
            </span>
            <div className="flex items-center gap-4 sm:gap-6">
              <OxEmblem className="size-20 shrink-0 sm:size-28" />
              <h2 className="text-gold-gradient animate-shimmer text-[clamp(56px,10vw,120px)] font-light leading-none tracking-[-0.04em]">
                OX
              </h2>
            </div>
            <p className="max-w-md text-pretty text-[15px] leading-relaxed text-foreground/80 sm:text-[16px]">
              公牛交易所生态的价值载体。总量恒定、拟零增发，让每一枚 OX 都与平台共同成长。
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="flex w-full flex-col gap-3 md:max-w-xs"
          >
            <div className="flex items-baseline justify-between text-[14px]">
              <span className="text-gold-light/70">首轮发行占比</span>
              <span className="font-mono text-gold">≈ 10%</span>
            </div>
            <div
              className="relative h-2 overflow-hidden rounded-full bg-gold-light/10"
              role="img"
              aria-label="首轮发行约占总供应量 10%"
            >
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gold shadow-[0_0_16px_var(--color-gold)]"
                initial={{ width: reduceMotion ? `${FIRST_ROUND_SHARE}%` : '0%' }}
                whileInView={{ width: `${FIRST_ROUND_SHARE}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="flex justify-between font-mono text-[12px] text-gold-light/50">
              <span>21M OX</span>
              <span>200M OX</span>
            </div>
          </motion.div>
        </div>

        <dl className="grid grid-cols-1 border-t border-gold/30 md:grid-cols-3">
          {TOKEN_SPECS.map((spec, i) => (
            <motion.div
              key={spec.label}
              initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: (i % 3) * 0.12 + Math.floor(i / 3) * 0.1 }}
              className="group relative flex flex-col gap-2 border-b border-gold/20 py-6 md:pr-6"
            >
              <span
                aria-hidden="true"
                className="absolute bottom-[-1px] left-0 h-px w-0 bg-gold transition-all duration-500 group-hover:w-full"
              />
              <dt className="text-[14px] tracking-wide text-gold-light/60">{spec.label}</dt>
              <dd className="flex flex-col gap-1">
                <span className="text-[22px] font-light leading-snug tracking-[-0.01em] text-foreground transition-colors group-hover:text-gold-light sm:text-[26px]">
                  {spec.count !== undefined ? <CountUp to={spec.count} unit={spec.unit} /> : spec.value}
                </span>
                {spec.note && <span className="text-[14px] text-gold">{spec.note}</span>}
              </dd>
            </motion.div>
          ))}
        </dl>

        <p className="text-[12px] leading-relaxed text-gold-light/40">
          {'* 以上参数为拟定方案，最终以正式发行公告为准。'}
        </p>
      </div>
    </section>
  )
}
