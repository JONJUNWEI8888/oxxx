'use client'

import { motion } from 'framer-motion'
import { BgVideo } from './bg-video'
import { PresaleQr } from './presale-qr'
import { PresaleTracker } from './presale-tracker'

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_095750_32a52ce0-2005-45c9-9093-41f03fde9530.mp4'

const viewport = { once: true, amount: 0.2 }

export function Technology() {
  return (
    <section
      id="presale"
      className="relative min-h-screen min-h-[100dvh] w-full overflow-hidden bg-black"
    >
      <BgVideo src={VIDEO} className="absolute inset-0 size-full" />
      <div className="relative z-10 mx-auto flex min-h-screen min-h-[100dvh] w-full max-w-6xl flex-col justify-center gap-10 px-8 pb-16 pt-28 sm:px-12 md:px-16">
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 1 }}
          className="text-[clamp(36px,7vw,64px)] font-light leading-[0.95] tracking-[-0.03em] text-white"
        >
          OX 首轮私募
        </motion.h2>

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
            className="md:col-span-2"
          >
            <PresaleQr />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
