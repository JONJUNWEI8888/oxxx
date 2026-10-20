'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { BgVideo } from './bg-video'

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_092455_089c54f8-3b03-4966-9df1-e9746063d0ef.mp4'

const TOKEN_SPECS = [
  { label: '代币名称／符号', value: 'OX' },
  { label: '所属平台', value: 'oxxx.io 公牛交易所' },
  { label: '最大供应量', value: '200,000,000 OX' },
  { label: '增发机制', value: '拟不设置额外增发' },
  { label: '首轮发行', value: '21,000,000 OX', note: '占总量 10%' },
  { label: '首轮示例价格', value: '1 USDT／OX' },
  { label: '首轮示例募资上限', value: '2,100,000 USDT' },
  { label: '对应完全稀释估值', value: '21,000,000 USDT' },
  { label: '认购资产', value: 'USDT', note: '拟采用 BSC 链' },
]

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1 }}
          className="flex flex-col gap-3"
        >
          <span className="text-[13px] uppercase tracking-[0.3em] text-gold sm:text-[14px]">
            Token
          </span>
          <h2 className="text-gold-gradient animate-shimmer text-[clamp(56px,10vw,120px)] font-light leading-none tracking-[-0.04em]">
            OX
          </h2>
        </motion.div>

        <dl className="grid grid-cols-1 border-t border-gold/30 md:grid-cols-3">
          {TOKEN_SPECS.map((spec, i) => (
            <motion.div
              key={spec.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: (i % 3) * 0.12 + Math.floor(i / 3) * 0.08 }}
              className="group flex flex-col gap-2 border-b border-gold/20 py-6 md:pr-6"
            >
              <dt className="text-[14px] tracking-wide text-gold-light/60">{spec.label}</dt>
              <dd className="flex flex-col gap-1">
                <span className="text-[22px] font-light leading-snug tracking-[-0.01em] text-foreground transition-colors group-hover:text-gold-light sm:text-[26px]">
                  {spec.value}
                </span>
                {spec.note && <span className="text-[14px] text-gold">{spec.note}</span>}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  )
}
