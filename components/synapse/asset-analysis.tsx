'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FinancialChart, FundamentalChart, TechnicalChart, ValuationChart } from './analysis-charts'

const SLIDES = [
  { title: '基本面', en: 'Fundamentals', Chart: FundamentalChart },
  { title: '技术面', en: 'Technicals', Chart: TechnicalChart },
  { title: '财务分析', en: 'Financials', Chart: FinancialChart },
  { title: '估值', en: 'Valuation', Chart: ValuationChart },
]

const INTERVAL = 5500

export function AssetAnalysis() {
  const reduceMotion = useReducedMotion()
  const { t, isEn } = useI18n()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = SLIDES.length
  const go = (i: number) => setActive(((i % n) + n) % n)
  const autoplay = !paused && !reduceMotion

  useEffect(() => {
    if (!autoplay) return
    const timer = setTimeout(() => setActive((a) => (a + 1) % n), INTERVAL)
    return () => clearTimeout(timer)
  }, [active, autoplay, n])

  return (
    <section id="platform" className="relative w-full overflow-hidden bg-black py-24 sm:py-32">
      <motion.header
        initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
        whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9 }}
        className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-6 text-center"
      >
        <span className="font-mono text-[12px] uppercase tracking-[0.4em] text-gold/80">{t('Research · 投研工具', 'Research Tools')}</span>
        <h2 className="text-gold-gradient text-balance text-[clamp(30px,4.6vw,56px)] font-bold leading-tight">{t('多维度理解资产价值与风险', 'Understand Asset Value and Risk from Every Angle')}</h2>
        <p className="text-pretty text-[15px] leading-relaxed text-foreground/60 sm:text-[17px]">
          {t(
            '围绕美股代币化资产与主流加密货币，oxxx.io 提供基本面、技术面、财务与估值四重分析视角，帮助你在下单之前形成更完整的判断。',
            'For tokenized US stocks and major cryptocurrencies, oxxx.io offers four lenses — fundamentals, technicals, financials and valuation — so you can form a fuller view before you trade.',
          )}
        </p>
      </motion.header>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={t('资产分析视角', 'Asset analysis views')}
        className="relative mt-14 sm:mt-20"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <motion.div
          className="relative h-[620px] touch-pan-y sm:h-[600px]"
          onPanEnd={(_, info) => {
            if (info.offset.x < -50) go(active + 1)
            else if (info.offset.x > 50) go(active - 1)
          }}
        >
          {SLIDES.map(({ title: zhTitle, en, Chart }, i) => {
            const title = isEn ? en : zhTitle
            const rel = ((i - active + n + Math.floor(n / 2)) % n) - Math.floor(n / 2)
            const isActive = rel === 0
            const visible = Math.abs(rel) <= 1
            return (
              <motion.article
                key={en}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${n}: ${title}`}
                aria-hidden={!isActive}
                inert={!isActive}
                onClick={() => !isActive && go(i)}
                initial={false}
                animate={{
                  x: `${rel * 106}%`,
                  scale: isActive ? 1 : 0.88,
                  opacity: visible ? (isActive ? 1 : 0.35) : 0,
                  rotateY: rel * -8,
                  zIndex: isActive ? 2 : 1,
                }}
                transition={{ duration: reduceMotion ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformPerspective: 1400 }}
                className={cn(
                  'absolute inset-y-0 left-0 right-0 mx-auto flex w-[min(86vw,540px)] flex-col gap-5 rounded-3xl border bg-[#0d0a0c] p-5 sm:p-7',
                  isActive ? 'border-gold/30 shadow-[0_30px_80px_-30px_var(--color-gold)]' : 'cursor-pointer border-foreground/10',
                )}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[26px] font-bold text-foreground sm:text-[30px]">{title}</h3>
                  <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold/70">
                    {String(i + 1).padStart(2, '0')}{isEn ? '' : ` · ${en}`}
                  </span>
                </div>
                <div className="flex-1 overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-4 sm:p-5">
                  <Chart play={isActive} />
                </div>
              </motion.article>
            )
          })}
        </motion.div>

        <div className="mt-10 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => go(active - 1)}
            aria-label={t('上一个分析视角', 'Previous view')}
            className="flex size-11 items-center justify-center rounded-full border border-foreground/15 text-foreground/70 transition-colors hover:border-gold hover:text-gold"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => go(i)}
                aria-label={isEn ? `Go to ${s.en}` : `切换到${s.title}`}
                aria-current={i === active}
                className={cn('relative h-1.5 overflow-hidden rounded-full bg-foreground/15 transition-all duration-500', i === active ? 'w-14' : 'w-6 hover:bg-foreground/30')}
              >
                {i === active && (
                  <motion.span
                    key={`${active}-${autoplay}`}
                    className="absolute inset-y-0 left-0 bg-gold"
                    initial={{ width: autoplay ? '0%' : '100%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: autoplay ? INTERVAL / 1000 : 0, ease: 'linear' }}
                  />
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(active + 1)}
            aria-label={t('下一个分析视角', 'Next view')}
            className="flex size-11 items-center justify-center rounded-full border border-foreground/15 text-foreground/70 transition-colors hover:border-gold hover:text-gold"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {isEn ? `Current: ${SLIDES[active].en}` : `当前：${SLIDES[active].title}`}
        </p>
      </div>
    </section>
  )
}
