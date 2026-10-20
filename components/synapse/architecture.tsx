'use client'

import { motion } from 'framer-motion'
import { CryptoField } from './crypto-field'

const LAYERS = ['Capture', 'Process', 'Interface']

export function Architecture() {
  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black px-6 py-32">
      <CryptoField density={10} candles className="absolute inset-0 size-full opacity-60" />
      <div className="relative z-10 w-full max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1 }}
        >
          <p className="mb-8 text-[13px] uppercase tracking-[0.3em] text-gold sm:text-[14px]">
            Architecture
          </p>
          <h2 className="text-gold-gradient animate-shimmer mb-10 text-balance text-[clamp(28px,6vw,56px)] font-light leading-[1.15] tracking-[-0.02em]">
            Three layers. Zero friction.
          </h2>
          <p className="mx-auto max-w-xl text-pretty text-[15px] leading-relaxed text-foreground/55 sm:text-[17px]">
            Sensor layer captures raw bioelectric signals. Processing layer isolates intent.
            Interface layer delivers structured output to any connected system.
          </p>
        </motion.div>

        <motion.ol
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.2, delay: 0.4 }}
          className="mt-20 flex flex-col items-center gap-4"
        >
          {LAYERS.map((name, i) => (
            <li
              key={name}
              className="flex h-[72px] w-full max-w-md items-center justify-between rounded-lg border border-gold/25 bg-gold-deep/80 px-6 transition-colors hover:border-gold/60"
            >
              <span className="text-[12px] uppercase tracking-[0.15em] text-gold/70">
                Layer {i + 1}
              </span>
              <span className="text-[16px] font-light text-gold-light sm:text-[18px]">{name}</span>
            </li>
          ))}
        </motion.ol>
      </div>
    </section>
  )
}
