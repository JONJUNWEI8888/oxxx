'use client'

import { motion } from 'framer-motion'

const spring = { type: 'spring' as const, stiffness: 300, damping: 20 }

export function SquashHamburger({ open, mobile = false }: { open: boolean; mobile?: boolean }) {
  const width = mobile ? 15 : 18
  const height = mobile ? 10 : 12
  const bar = mobile ? 1.2 : 1.5
  const center = (height - bar) / 2

  return (
    <span className="relative block" style={{ width, height }} aria-hidden="true">
      <motion.span
        className="absolute left-0 rounded-full bg-current"
        style={{ top: 0, width, height: bar }}
        animate={open ? { y: center, rotate: 45 } : { y: 0, rotate: 0 }}
        transition={spring}
      />
      <motion.span
        className="absolute left-0 rounded-full bg-current"
        style={{ top: center, width, height: bar }}
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={spring}
      />
      <motion.span
        className="absolute left-0 rounded-full bg-current"
        style={{ top: height - bar, width, height: bar }}
        animate={open ? { y: -center, rotate: -45 } : { y: 0, rotate: 0 }}
        transition={spring}
      />
    </span>
  )
}
