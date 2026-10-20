'use client'

import { motion } from 'framer-motion'
import { BgVideo } from './bg-video'

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_095750_32a52ce0-2005-45c9-9093-41f03fde9530.mp4'

const FEATURES = [
  { title: 'Cortical Mapping', desc: 'Real-time spatial reconstruction of active neural regions.' },
  { title: 'Signal Isolation', desc: 'Separates cognitive intent from biological noise.' },
  { title: 'State Prediction', desc: 'Anticipates cognitive transitions before they occur.' },
  { title: 'Loop Feedback', desc: 'Closed-loop adjustment based on outcome correlation.' },
]

const viewport = { once: true, amount: 0.3 }

export function Technology() {
  return (
    <section className="relative h-screen h-[100dvh] w-full overflow-hidden bg-black">
      <BgVideo src={VIDEO} className="absolute inset-0 size-full" />
      <div className="relative z-10 flex size-full flex-col px-8 py-12 sm:px-12 sm:py-16 md:px-16">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 1 }}
            className="text-[clamp(36px,8vw,72px)] font-light leading-[0.95] tracking-[-0.03em] text-white"
          >
            Adaptive
            <br />
            Intelligence
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ duration: 1, delay: 0.2 }}
            className="max-w-xs text-[13px] leading-relaxed text-white/50 sm:text-[15px] md:pt-2 md:text-right"
          >
            The system learns your neural baseline within 72 hours. From there, every cognitive
            state is mapped, predicted, and optimized in real time.
          </motion.p>
        </div>

        <div className="flex-1" />

        <motion.ul
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewport}
          transition={{ duration: 1, delay: 0.3 }}
          className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6"
        >
          {FEATURES.map((f, i) => (
            <motion.li
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ duration: 0.7, delay: i * 0.1 }}
            >
              <h3 className="mb-2 text-[14px] font-normal text-white sm:text-[16px]">{f.title}</h3>
              <p className="text-[12px] leading-relaxed text-white/40 sm:text-[14px]">{f.desc}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
