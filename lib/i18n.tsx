'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Lang = 'zh-CN' | 'en'
export type Bi = { zh: string; en: string }

type I18nValue = {
  lang: Lang
  isEn: boolean
  setLang: (lang: Lang) => void
  t: (zhOrBi: string | Bi, en?: string) => string
}

const STORAGE_KEY = 'oxxx-lang'

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh-CN')

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh-CN') setLangState(saved)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = lang === 'en' ? 'oxxx.io — The Next Unicorn Exchange' : 'oxxx.io — 下一个独角兽交易所'
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const value = useMemo<I18nValue>(() => {
    const isEn = lang === 'en'
    return {
      lang,
      isEn,
      setLang,
      t: (zhOrBi, en) => {
        if (typeof zhOrBi === 'string') return isEn && en !== undefined ? en : zhOrBi
        return isEn ? zhOrBi.en : zhOrBi.zh
      },
    }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
