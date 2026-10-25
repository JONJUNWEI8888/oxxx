'use client'

import { motion } from 'framer-motion'
import { Crown, Download, Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SynapseXLogo } from './logo'
import { MobileNavMenu } from './mobile-nav-menu'
import { DesktopNavMenu } from './nav-menu'
import { SquashHamburger } from './squash-hamburger'

function LogoPill() {
  return (
    <motion.a
      href="#"
      onClick={(e) => {
        e.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }}
      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.22)' }}
      whileTap={{ scale: 0.98 }}
      className="flex h-10 shrink-0 items-center gap-2 rounded-[12px] bg-white/15 px-3.5 backdrop-blur-md md:h-12 md:gap-2.5 md:rounded-[14px] md:px-5"
    >
      <SynapseXLogo className="size-[15px] text-white md:size-[18px]" />
      <span className="text-[14px] font-medium tracking-tight text-white md:text-[16px]">oxxx.io</span>
    </motion.a>
  )
}

function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex size-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </a>
  )
}

export function Navbar({ visible }: { visible: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-x-0 top-0 z-50 h-20 w-full bg-transparent"
    >
      <nav aria-label="Primary" className="relative flex h-full items-center justify-between gap-3 px-4 sm:px-6 md:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <LogoPill />
          <div className="hidden md:block">
            <DesktopNavMenu />
          </div>
          <button
            type="button"
            aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex size-10 items-center justify-center rounded-[12px] bg-white/15 text-white backdrop-blur-md md:hidden"
          >
            <SquashHamburger open={mobileOpen} mobile />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href="#"
            className="hidden h-12 items-center gap-2 rounded-full border border-gold/60 px-5 text-[15px] text-gold transition-all hover:border-gold hover:bg-gold/10 hover:shadow-[0_0_24px_-6px_var(--color-gold)] xl:flex"
          >
            <Crown className="size-4" aria-hidden="true" />
            VIP礼遇通道
          </a>
          <a
            href="#"
            className="hidden h-12 items-center rounded-full bg-white/15 px-5 text-[15px] text-white backdrop-blur-md transition-colors hover:bg-white/25 md:flex"
          >
            注册
          </a>
          <motion.a
            href="#"
            whileHover={{ scale: 1.03, backgroundColor: '#e2e2e6' }}
            whileTap={{ scale: 0.97 }}
            className="flex h-10 items-center rounded-full bg-white px-5 text-[14px] font-medium text-black md:h-12 md:px-6 md:text-[15px]"
          >
            登录
          </motion.a>
          <div className="hidden items-center gap-1 border-l border-white/15 pl-2 lg:flex">
            <IconButton label="下载 App">
              <Download className="size-5" aria-hidden="true" />
            </IconButton>
            <IconButton label="切换语言">
              <Globe className="size-5" aria-hidden="true" />
            </IconButton>
          </div>
        </div>

        <MobileNavMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      </nav>
    </motion.header>
  )
}
