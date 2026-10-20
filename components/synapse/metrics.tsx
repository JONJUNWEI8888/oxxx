'use client'

import { motion } from 'framer-motion'
import { CryptoField } from './crypto-field'

const METRICS = [
  { value: '2.4ms', label: '撮合速度' },
  { value: '99.7%', label: '交易信号' },
  { value: '140B', label: '资产体量' },
]

export function Metrics() {
  return (
    <section
      id="metrics"
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black px-6 pb-32 pt-32"
    >
      <CryptoField density={12} candles className="absolute inset-0 size-full" />
      <div className="relative z-10 w-full max-w-6xl">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.2 }}
          className="mb-20 text-center text-[13px] uppercase tracking-[0.3em] text-gold sm:text-[14px]"
        >
          美股代币化新一代交易所
        </motion.h2>
        <dl className="grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-0 md:divide-x md:divide-gold/20">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: i * 0.15 }}
              className="flex flex-col items-center text-center"
            >
              <dt className="order-last mt-4 text-[14px] tracking-[0.2em] text-gold-light/60 sm:text-[15px]">
                {m.label}
              </dt>
              <dd className="text-gold-gradient animate-shimmer text-[clamp(48px,10vw,96px)] font-light leading-none tracking-[-0.04em]">
                {m.value}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  )
}
