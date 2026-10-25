'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { type Bi, useI18n } from '@/lib/i18n'

type Market = 'crypto' | 'stocks'

const MARKETS: Record<Market, { label: Bi; hint: Bi; href: string }> = {
  crypto: { label: { zh: '加密', en: 'Crypto' }, hint: { zh: 'BTC · ETH · USDT 现货与合约', en: 'BTC · ETH · USDT spot & futures' }, href: '#platform' },
  stocks: { label: { zh: '股票', en: 'Stocks' }, hint: { zh: 'NVDA · TSLA · AAPL 美股代币', en: 'NVDA · TSLA · AAPL tokenized stocks' }, href: '#platform' },
}

export function MarketSwitch() {
  const { t } = useI18n()
  const [market, setMarket] = useState<Market>('crypto')
  const isStocks = market === 'stocks'
  const toggle = () => setMarket(isStocks ? 'crypto' : 'stocks')

  return (
    <div className="flex w-full max-w-xs flex-col gap-5 rounded-2xl border border-gold/25 bg-black/55 p-5 backdrop-blur-md [box-shadow:0_0_40px_-12px_color-mix(in_oklab,var(--color-gold)_45%,transparent)]">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setMarket('crypto')}
          className={`text-base font-medium transition-colors ${isStocks ? 'text-white/45 hover:text-white/70' : 'text-gold'}`}
        >
          {t(MARKETS.crypto.label)}
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={isStocks}
          aria-label={t('切换加密与股票市场', 'Switch between crypto and stock markets')}
          onClick={toggle}
          className="relative flex h-10 w-16 items-center rounded-xl border-[5px] border-gold bg-black p-1 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-black [box-shadow:0_0_18px_-4px_var(--color-gold)]"
        >
          <motion.span
            aria-hidden="true"
            className="block size-4 rounded-md bg-gold [box-shadow:0_0_10px_var(--color-gold)]"
            animate={{ x: isStocks ? 30 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        </button>

        <button
          type="button"
          onClick={() => setMarket('stocks')}
          className={`text-base font-medium transition-colors ${isStocks ? 'text-gold' : 'text-white/45 hover:text-white/70'}`}
        >
          {t(MARKETS.stocks.label)}
        </button>
      </div>

      <div className="relative h-5 overflow-hidden text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={market}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="font-mono text-xs tracking-wide text-white/60"
          >
            {t(MARKETS[market].hint)}
          </motion.p>
        </AnimatePresence>
      </div>

      <a
        href={MARKETS[market].href}
        className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-gold text-base font-semibold text-gold-deep outline-none transition-all hover:bg-gold-light focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-black [box-shadow:0_8px_30px_-8px_var(--color-gold)]"
      >
        {t('立即体验', 'Try It Now')}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </a>
    </div>
  )
}
