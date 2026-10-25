'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '@/lib/i18n'

const EASE = [0.215, 0.61, 0.355, 1] as const
const CHAR_STAGGER = 0.07

type Line = { text: string; delay: number; accent?: boolean }

const LINES_ZH: Line[] = [
  { text: '下一个', delay: 0.15 },
  { text: '独角兽交易所', delay: 0.45, accent: true },
]

const LINES_EN: Line[] = [
  { text: 'The Next', delay: 0.15 },
  { text: 'Unicorn Exchange', delay: 0.45, accent: true },
]

function AnimatedLine({ line, play, reduce }: { line: Line; play: boolean; reduce: boolean }) {
  const chars = Array.from(line.text).map((c) => (c === ' ' ? '\u00A0' : c))
  const settleDelay = line.delay + chars.length * CHAR_STAGGER + 0.5

  return (
    <span className="relative block w-fit [perspective:600px]">
      <span className="block">
        {chars.map((char, i) => (
          <motion.span
            key={i}
            className="inline-block origin-bottom will-change-transform"
            initial={reduce ? false : { opacity: 0, y: '0.6em', rotateX: -80, filter: 'blur(10px)' }}
            animate={
              play
                ? { opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }
                : reduce
                  ? undefined
                  : { opacity: 0, y: '0.6em', rotateX: -80, filter: 'blur(10px)' }
            }
            transition={{ duration: 0.8, ease: EASE, delay: line.delay + i * CHAR_STAGGER }}
          >
            {char}
          </motion.span>
        ))}
      </span>

      {line.accent && (
        <motion.span
          aria-hidden="true"
          className="text-gold-gradient animate-shimmer pointer-events-none absolute inset-0 block [filter:drop-shadow(0_0_18px_rgba(238,154,196,0.45))] [text-shadow:none]"
          initial={{ opacity: 0 }}
          animate={{ opacity: play ? 1 : 0 }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: reduce ? 0 : settleDelay }}
        >
          {line.text}
        </motion.span>
      )}

      {line.accent && (
        <motion.span
          aria-hidden="true"
          className="absolute -bottom-2 left-0 block h-px w-full origin-left bg-gradient-to-r from-gold via-gold-light to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={play ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: reduce ? 0 : settleDelay - 0.2 }}
        />
      )}
    </span>
  )
}

export function HeroHeadline({ className, play }: { className: string; play: boolean }) {
  const reduce = useReducedMotion() ?? false
  const { isEn } = useI18n()
  const LINES = isEn ? LINES_EN : LINES_ZH

  return (
    <h1 className={className}>
      <span className="sr-only">{LINES.map((l) => l.text).join(isEn ? ' ' : '')}</span>
      <span aria-hidden="true" className="flex flex-col">
        {LINES.map((line) => (
          <AnimatedLine key={line.text} line={line} play={play} reduce={reduce} />
        ))}
      </span>
    </h1>
  )
}
