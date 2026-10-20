'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { SynapseXLogo } from './logo'
import { ScrambleText } from './scramble'
import { SquashHamburger } from './squash-hamburger'

const pillSpring = { type: 'spring' as const, stiffness: 350, damping: 28 }

const LINKS = [
  { label: 'About', multiplier: 1 },
  { label: 'Metrics', multiplier: 2 },
]

function scrollToScreen(multiplier: number) {
  window.scrollTo({ top: window.innerHeight * multiplier, behavior: 'smooth' })
}

function NavLink({
  label,
  onClick,
  mobile,
}: {
  label: string
  onClick: () => void
  mobile?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`whitespace-nowrap font-normal text-white/85 transition-colors hover:text-white ${
        mobile ? 'text-[13px]' : 'text-[16px]'
      }`}
    >
      <ScrambleText text={label} isHovered={hovered} />
    </button>
  )
}

function DownloadButton({ mobile }: { mobile?: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.a
      href="#"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.03, backgroundColor: '#e2e2e6' }}
      whileTap={{ scale: 0.97 }}
      className={`flex shrink-0 items-center gap-2 rounded-full bg-white font-medium text-black ${
        mobile ? 'h-9 px-3.5 text-[13px]' : 'h-12 px-6 text-[16px]'
      }`}
    >
      <i className="bi bi-apple" aria-hidden="true" />
      <ScrambleText text="Download" isHovered={hovered} />
    </motion.a>
  )
}

export function Navbar({ visible }: { visible: boolean }) {
  const [open, setOpen] = useState(false)

  const handleLink = (multiplier: number) => {
    scrollToScreen(multiplier)
    setOpen(false)
  }

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-x-0 top-0 z-50 h-20 w-full bg-transparent"
    >
      {/* Desktop */}
      <nav
        aria-label="Primary"
        className="hidden h-full items-center justify-between px-4 sm:flex sm:px-6 md:px-8"
      >
        <div className="flex items-center gap-2">
          <motion.a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.22)' }}
            whileTap={{ scale: 0.98 }}
            className={`${open ? 'hidden md:flex' : 'flex'} h-12 items-center gap-2.5 rounded-[14px] bg-white/15 px-5 backdrop-blur-md`}
          >
            <SynapseXLogo className="size-[18px] text-white" />
            <span className="text-[16px] font-medium tracking-tight text-white">SynapseX</span>
          </motion.a>

          <motion.div
            initial={false}
            animate={{ width: open ? 290 : 48 }}
            transition={pillSpring}
            className="flex h-12 items-center overflow-hidden rounded-[14px] bg-white/15 backdrop-blur-md"
          >
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`flex shrink-0 items-center justify-center text-white transition-all ${
                open
                  ? 'ml-1.5 size-9 rounded-[11px] bg-white/10 hover:bg-white/20'
                  : 'size-12 rounded-[14px]'
              }`}
            >
              <SquashHamburger open={open} />
            </button>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.25, delay: 0.08 }}
                  className="flex items-center gap-6 pl-6"
                >
                  {LINKS.map((link) => (
                    <NavLink
                      key={link.label}
                      label={link.label}
                      onClick={() => handleLink(link.multiplier)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <DownloadButton />
      </nav>

      {/* Mobile */}
      <nav aria-label="Primary mobile" className="flex h-full items-center gap-2 px-4 sm:hidden">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <motion.a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            initial={false}
            animate={{ width: open ? 0 : 'auto', opacity: open ? 0 : 1 }}
            transition={pillSpring}
            aria-hidden={open}
            tabIndex={open ? -1 : 0}
            className="flex h-9 shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-[10px] bg-white/15 backdrop-blur-md"
          >
            <span className="flex items-center gap-2 px-3.5">
              <SynapseXLogo className="size-[14px] text-white" />
              <span className="text-[13px] font-medium tracking-tight text-white">SynapseX</span>
            </span>
          </motion.a>

          <motion.div
            initial={false}
            animate={{ width: open ? '100%' : 36 }}
            transition={pillSpring}
            className="flex h-9 items-center overflow-hidden rounded-[10px] bg-white/15 backdrop-blur-md"
          >
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className={`flex shrink-0 items-center justify-center text-white transition-all ${
                open ? 'ml-1 size-7 rounded-[8px] bg-white/10' : 'size-9 rounded-[10px]'
              }`}
            >
              <SquashHamburger open={open} mobile />
            </button>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.25, delay: 0.08 }}
                  className="flex items-center gap-4 pl-4"
                >
                  {LINKS.map((link) => (
                    <NavLink
                      key={link.label}
                      label={link.label}
                      mobile
                      onClick={() => handleLink(link.multiplier)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <DownloadButton mobile />
      </nav>
    </motion.header>
  )
}
