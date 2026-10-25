'use client'

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { BgVideo } from './bg-video'

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_095810_ecea3dd2-fc5e-4e41-8696-4219290b6589.mp4'

const METRICS = [
  { value: '2.4ms', label: { zh: '撮合速度', en: 'Matching Speed' } },
  { value: '99.7%', label: { zh: '交易信号', en: 'Signal Accuracy' } },
  { value: '140B', label: { zh: '资产体量', en: 'Asset Volume' } },
]

export function Metrics() {
  const { t } = useI18n()
  return (
    <section
      id="metrics"
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black px-6 pb-32 pt-32"
    >
      <BgVideo src={VIDEO} className="absolute inset-0 size-full" />
      <div aria-hidden="true" className="absolute inset-0 bg-black/45" />
      <div className="relative z-10 w-full max-w-6xl">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.2 }}
          className="mb-20 text-center text-[13px] uppercase tracking-[0.3em] text-gold sm:text-[14px]"
        >
          {t('美股代币化新一代交易所', 'The Next-Gen Exchange for Tokenized US Stocks')}
        </motion.h2>
        <dl className="grid grid-cols-1 gap-16 md:grid-cols-3 md:gap-0 md:divide-x md:divide-gold/20">
          {METRICS.map((m, i) => (
            <motion.div
              key={m.value}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: i * 0.15 }}
              className="flex flex-col items-center text-center"
            >
              <dt className="order-last mt-4 text-[14px] tracking-[0.2em] text-gold-light/60 sm:text-[15px]">
                {t(m.label)}
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
