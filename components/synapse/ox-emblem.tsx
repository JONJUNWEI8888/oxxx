'use client'

import { motion, useReducedMotion } from 'framer-motion'

const LEFT_HORN = 'M27 33 C 17 31, 11 22, 13 10 C 17 19, 23 24, 31 26'
const RIGHT_HORN = 'M37 33 C 47 31, 53 22, 51 10 C 47 19, 41 24, 33 26'
const HEAD = 'M24 30 C 24 40, 28 48, 32 50 C 36 48, 40 40, 40 30 C 37 27, 27 27, 24 30 Z'

export function OxEmblem({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion()
  const draw = (delay: number) => ({
    initial: reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true, amount: 0.6 },
    transition: { duration: 1.4, delay, ease: [0.65, 0, 0.35, 1] as const },
  })

  return (
    <div className={`relative ${className ?? ''}`} aria-hidden="true">
      <motion.div
        className="absolute inset-0 rounded-full bg-gold/25 blur-2xl"
        animate={reduceMotion ? undefined : { opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.svg
        viewBox="0 0 64 64"
        className="absolute inset-0 size-full text-gold-light/40"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1.5 3" />
      </motion.svg>
      <svg viewBox="0 0 64 64" className="relative size-full text-gold-light" fill="none">
        <defs>
          <linearGradient id="ox-horn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" />
            <stop offset="100%" stopColor="var(--color-gold)" />
          </linearGradient>
        </defs>
        <motion.circle
          cx="32"
          cy="32"
          r="25"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="1.2"
          {...draw(0)}
        />
        <motion.path d={LEFT_HORN} stroke="url(#ox-horn)" strokeWidth="3" strokeLinecap="round" {...draw(0.35)} />
        <motion.path d={RIGHT_HORN} stroke="url(#ox-horn)" strokeWidth="3" strokeLinecap="round" {...draw(0.35)} />
        <motion.path d={HEAD} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...draw(0.8)} />
        <motion.circle
          cx="32"
          cy="41"
          r="1.6"
          fill="currentColor"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: [0, 1, 0.4, 1] }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 1.8 }}
        />
      </svg>
    </div>
  )
}
