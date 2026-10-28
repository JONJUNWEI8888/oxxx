'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import HoloCard from '@/components/react-bits/holo-card'
import { useI18n } from '@/lib/i18n'

export function RegisterWelcomePanel() {
  const { t } = useI18n()
  return (
    <section className="relative hidden flex-1 flex-col overflow-hidden bg-panel px-10 pt-16 lg:flex xl:px-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col gap-4"
      >
        <h2 className="text-balance font-display text-5xl leading-tight tracking-wide text-foreground xl:text-6xl">
          {t('欢迎来到', 'Welcome to')} <span className="text-gold">OXXX</span>
        </h2>
        <p className="max-w-md text-pretty text-[15px] leading-relaxed text-foreground/60">
          {t(
            '为专业级投资者打造的加密友好型证券平台，提供统一市场交易服务',
            'A crypto-friendly securities platform built for professional investors, with unified multi-market trading.',
          )}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
        className="relative mt-auto flex translate-y-10 items-center justify-center"
      >
        <Image
          src="/images/register-coins-ring.png"
          alt=""
          width={1024}
          height={1024}
          priority
          className="h-auto w-full max-w-[560px] object-contain mix-blend-lighten [mask-image:radial-gradient(circle_at_center,black_58%,transparent_72%)]"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <HoloCard
            image="/images/oxxx-holo-card.png"
            alt={t('OXXX 会员卡', 'OXXX member card')}
            preset="glitter"
            intensity={0.45}
            edgeSparkle={0.9}
            glare={0.6}
            foilColor="#f2b8dc"
            width={176}
            radius={12}
          />
        </div>
      </motion.div>
    </section>
  )
}
