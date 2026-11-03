'use client'

import { MotionConfig, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { type Bi, useI18n } from '@/lib/i18n'
import { SecuritiesDevices } from './securities-devices'

const FEATURES: Bi[] = [
  { zh: '一站式交易美股、港股、ETF 与美股期权', en: 'Trade US stocks, HK stocks, ETFs and US options in one place' },
  { zh: '实时行情、Level-2 深度数据与多周期 K 线', en: 'Real-time quotes, Level-2 depth and multi-timeframe charts' },
  { zh: '个股分析、期权链与风险收益分析工具', en: 'Stock research, option chains and risk/reward tools' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
}

export function Securities() {
  const { t } = useI18n()
  return (
    <MotionConfig reducedMotion="user">
      <section
        id="about"
        aria-labelledby="securities-title"
        className="relative w-full overflow-hidden bg-[radial-gradient(ellipse_at_80%_40%,color-mix(in_oklab,var(--color-gold)_14%,black)_0%,black_60%)] px-6 py-24 sm:px-12 lg:py-32"
      >
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-16 md:flex-row md:gap-10">
          <motion.div
            className="flex w-full flex-col gap-8 md:w-1/2"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ staggerChildren: 0.12 }}
          >
            <motion.p variants={fadeUp} className="font-mono text-xs tracking-[0.4em] text-gold">
              {t('SECURITIES · 证券交易', 'SECURITIES')}
            </motion.p>

            <motion.h2
              id="securities-title"
              variants={fadeUp}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-balance font-sans text-4xl font-semibold leading-tight text-white sm:text-5xl xl:text-6xl"
            >
              {t('专业证券交易，', 'Professional Securities Trading,')}
              <br />
              {t('覆盖', 'Covering ')}
              <span className="text-gold-shimmer">{t('美股、港股、', 'US & HK Stocks,')}</span>
              <br />
              {t('ETF 与美股期权', 'ETFs and US Options')}
            </motion.h2>

            <motion.p variants={fadeUp} className="max-w-xl text-pretty text-base leading-relaxed text-white/65">
              {t(
                '在 oxxx.io 交易全球证券产品，获取实时行情、深度数据、个股分析与期权工具支持，帮助你更高效地发现机会、管理头寸与执行策略。',
                'Trade global securities on oxxx.io with real-time quotes, market depth, stock research and options tools to find opportunities, manage positions and execute strategies more efficiently.',
              )}
            </motion.p>

            <ul className="flex flex-col gap-3">
              {FEATURES.map((f) => (
                <motion.li
                  key={f.en}
                  variants={{ hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0 } }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="group flex w-fit items-center gap-3 rounded-lg border border-gold/25 bg-white/[0.02] px-4 py-2.5 text-sm text-white/85 transition-colors hover:border-gold/60 hover:bg-gold/[0.06]"
                >
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold)] transition-transform group-hover:scale-150" />
                  {t(f)}
                </motion.li>
              ))}
            </ul>

            <motion.div variants={fadeUp} className="flex flex-col gap-4 pt-4">
              <a
                href="#platform"
                className="group relative flex h-14 w-full max-w-sm items-center justify-center gap-2 overflow-hidden rounded-xl bg-gold font-medium text-black transition-shadow [box-shadow:0_0_30px_-8px_var(--color-gold)] hover:[box-shadow:0_0_44px_-6px_var(--color-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span className="relative z-10">{t('立即体验', 'Try It Now')}</span>
                <ArrowRight className="relative z-10 size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                <span aria-hidden="true" className="absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-white/40 transition-transform duration-700 group-hover:translate-x-[520%]" />
              </a>
              <p className="text-xs text-gold/70">{t('* 证券交易功能暂不支持网页端，下载 oxxx.io App 以获取完整交易功能', '* Securities trading is not yet available on web. Download the oxxx.io App for full trading features.')}</p>
            </motion.div>
          </motion.div>

          <div className="w-full md:w-1/2">
            <SecuritiesDevices />
          </div>
        </div>
      </section>
    </MotionConfig>
  )
}
