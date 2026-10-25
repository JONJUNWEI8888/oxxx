'use client'

import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'
import { BgVideo } from './bg-video'
import { PresaleQr } from './presale-qr'
import { PresaleTracker } from './presale-tracker'

const viewport = { once: true, amount: 0.2 }
const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_095750_32a52ce0-2005-45c9-9093-41f03fde9530.mp4'

export function Technology() {
  const { t } = useI18n()
  return (
    <section
      id="presale"
      className="relative min-h-screen min-h-[100dvh] w-full overflow-hidden bg-black"
    >
      <BgVideo src={VIDEO} className="absolute inset-0 size-full" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40"
      />

      <div className="relative z-10 mx-auto flex min-h-screen min-h-[100dvh] w-full max-w-6xl flex-col justify-center gap-10 px-8 pb-16 pt-28 sm:px-12 md:px-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 1 }}
          className="flex flex-col gap-3"
        >
          <span className="text-[13px] uppercase tracking-[0.3em] text-gold">Private Round</span>
          <h2 className="text-gold-gradient animate-shimmer text-[clamp(36px,7vw,64px)] font-light leading-[0.95] tracking-[-0.03em]">
            {t('OX 首轮私募', 'OX Seed Private Sale')}
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-5 md:gap-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 1, delay: 0.15 }}
            className="md:col-span-3"
          >
            <PresaleTracker />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 1, delay: 0.3 }}
            className="rounded-xl border border-gold/25 bg-gold-deep/70 p-6 backdrop-blur-sm md:col-span-2"
          >
            <PresaleQr />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
