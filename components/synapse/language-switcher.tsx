'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Globe } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type Lang, useI18n } from '@/lib/i18n'

const LANGUAGES = [
  { code: 'zh-CN', label: '简体中文' },
  { code: 'en', label: 'English' },
] as const


export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const { lang: current, setLang, t } = useI18n()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open])

  const select = (code: Lang) => {
    setLang(code)
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={t('切换语言', 'Change language')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="language-menu"
        onClick={() => setOpen((v) => !v)}
        className={`flex size-10 items-center justify-center rounded-full transition-colors ${
          open ? 'bg-white/10 text-gold' : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Globe className="size-5" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full origin-top-right pt-3"
          >
            <ul
              id="language-menu"
              role="menu"
              aria-label={t('选择语言', 'Select language')}
              className="relative flex w-[200px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-gold-deep/90 p-2 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
              />
              {LANGUAGES.map((lang) => {
                const active = lang.code === current
                return (
                  <li key={lang.code} role="none">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      lang={lang.code}
                      onClick={() => select(lang.code)}
                      className={`flex h-12 w-full items-center justify-between rounded-xl px-4 text-left text-[15px] font-medium transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none ${
                        active ? 'text-gold-light' : 'text-white/85 hover:text-white'
                      }`}
                    >
                      {lang.label}
                      {active && <Check className="size-4 text-gold" strokeWidth={2.4} aria-hidden="true" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
