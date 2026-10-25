'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { NAV_GROUPS, type NavItem } from './nav-data'

export function NavItemRow({ item, onSelect }: { item: NavItem; onSelect?: () => void }) {
  const { t } = useI18n()
  const Icon = item.icon
  return (
    <a
      href={item.href}
      onClick={onSelect}
      className="group flex items-start gap-4 rounded-xl p-3 transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/80 transition-all group-hover:border-gold/50 group-hover:text-gold group-hover:shadow-[0_0_18px_-4px_var(--color-gold)]">
        <Icon className="size-5" strokeWidth={1.6} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[15px] font-medium text-white transition-colors group-hover:text-gold-light">
          {t(item.title)}
        </span>
        <span className="text-pretty text-[13px] leading-relaxed text-white/50">{t(item.description)}</span>
      </span>
    </a>
  )
}

export function DesktopNavMenu() {
  const { t } = useI18n()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLUListElement>(null)

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => setOpenKey(null), 140)
  }

  useEffect(() => {
    if (!openKey) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenKey(null)
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenKey(null)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [openKey])

  useEffect(() => cancelClose, [])

  return (
    <ul
      ref={rootRef}
      onMouseLeave={scheduleClose}
      onMouseEnter={cancelClose}
      className="flex h-12 items-center gap-1 rounded-[14px] bg-white/15 px-2 backdrop-blur-md"
    >
      {NAV_GROUPS.map((group) => {
        const isOpen = openKey === group.key
        if (!group.items) {
          return (
            <li key={group.key}>
              <a
                href={group.href}
                onMouseEnter={() => setOpenKey(null)}
                className="flex h-9 items-center rounded-[10px] px-3 text-[15px] text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t(group.label)}
              </a>
            </li>
          )
        }
        const panelId = `nav-panel-${group.key}`
        return (
          <li key={group.key} className="relative" onMouseEnter={() => setOpenKey(group.key)}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenKey(isOpen ? null : group.key)}
              className={`flex h-9 items-center gap-1 rounded-[10px] px-3 text-[15px] transition-colors ${
                isOpen ? 'bg-white/10 text-gold' : 'text-white/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t(group.label)}
              <ChevronDown
                className={`size-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  id={panelId}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute left-0 top-full origin-top-left pt-3"
                >
                  <div className="relative w-[360px] overflow-hidden rounded-2xl border border-white/10 bg-gold-deep/90 p-2 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
                    />
                    <div className="flex flex-col">
                      {group.items.map((item) => (
                        <NavItemRow key={t(item.title)} item={item} onSelect={() => setOpenKey(null)} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        )
      })}
    </ul>
  )
}
