'use client'

import { AnimatePresence, motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Navbar } from '@/components/synapse/navbar'
import { I18nProvider, useI18n } from '@/lib/i18n'

const CrystalScene = dynamic(() => import('./crystal-scene').then((m) => m.CrystalScene), {
  ssr: false,
})

const ease = [0.22, 1, 0.36, 1] as const

function NameGate({ onEnter }: { onEnter: (name: string) => void }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const trimmed = name.trim()

  return (
    <motion.div
      key="gate"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24, filter: 'blur(8px)' }}
      transition={{ duration: 0.9, ease }}
      className="flex w-full max-w-xl flex-col items-center gap-10"
    >
      <div className="flex flex-col items-center gap-4">
        <p className="text-[13px] uppercase tracking-[0.4em] text-gold">{t('OXXX VIP · 尊享礼遇', 'OXXX VIP · Privilege')}</p>
        <h1 className="vip-title font-display text-[64px] leading-none tracking-[0.06em] text-balance sm:text-[96px] md:text-[120px]">
          {t('礼遇非凡', 'BEYOND')}
        </h1>
      </div>

      <form
        className="flex w-full flex-col items-center gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed) onEnter(trimmed)
        }}
      >
        <label htmlFor="vip-name" className="sr-only">
          {t('你的名字', 'Your name')}
        </label>
        <input
          id="vip-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          autoComplete="name"
          placeholder={t('你的名字', 'Your name')}
          className="w-full border-b border-foreground/25 bg-transparent pb-4 text-center text-[28px] text-foreground outline-none transition-colors placeholder:text-foreground/55 focus:border-gold md:text-[36px]"
        />
        <motion.button
          type="submit"
          disabled={!trimmed}
          whileHover={trimmed ? { scale: 1.04 } : undefined}
          whileTap={trimmed ? { scale: 0.97 } : undefined}
          className="h-14 rounded-full px-10 text-[16px] backdrop-blur-md transition-colors enabled:bg-gold enabled:text-gold-deep enabled:shadow-[0_0_40px_-8px_var(--color-gold)] disabled:cursor-not-allowed disabled:bg-foreground/10 disabled:text-foreground/40"
        >
          {t('走进去', 'Step Inside')}
        </motion.button>
        <button
          type="button"
          onClick={() => onEnter('')}
          className="text-[14px] text-foreground/60 underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t('跳过', 'Skip')}
        </button>
      </form>
    </motion.div>
  )
}

function Welcome({ name, onBack }: { name: string; onBack: () => void }) {
  const { t } = useI18n()
  const perks = [
    { title: t('专属费率', 'Tiered Fees'), desc: t('最低至 0.008% 的现货与合约费率', 'Spot & futures fees from 0.008%') },
    { title: t('专属客户经理', 'Dedicated Manager'), desc: t('7×24 小时一对一服务', '24/7 one-on-one support') },
    { title: t('优先通道', 'Priority Lane'), desc: t('提现、出入金优先处理', 'Prioritised withdrawals & funding') },
  ]

  return (
    <motion.div
      key="welcome"
      initial="hidden"
      animate="show"
      exit={{ opacity: 0 }}
      variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } } }}
      className="flex w-full max-w-4xl flex-col items-center gap-10"
    >
      <motion.div
        variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } } }}
        className="flex flex-col items-center gap-4"
      >
        <p className="text-[13px] uppercase tracking-[0.4em] text-gold">{t('欢迎来到 OXXX VIP', 'Welcome to OXXX VIP')}</p>
        <h1 className="vip-title font-display text-[48px] leading-tight tracking-[0.04em] text-balance sm:text-[72px] md:text-[88px]">
          {name ? t(`尊贵的 ${name}`, `Dear ${name}`) : t('尊贵的您', 'Distinguished Guest')}
        </h1>
        <p className="max-w-lg text-[15px] leading-relaxed text-foreground/70 text-pretty">
          {t(
            '为专业交易者与机构打造的专属礼遇，一个账户连接全球证券与数字资产。',
            'Privileges crafted for professional traders and institutions — one account across global securities and digital assets.',
          )}
        </p>
      </motion.div>

      <motion.ul
        variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } } }}
        className="grid w-full grid-cols-1 border-y border-foreground/15 md:grid-cols-3"
      >
        {perks.map((p, i) => (
          <li
            key={p.title}
            className={`flex flex-col gap-2 px-6 py-6 text-center backdrop-blur-sm ${i > 0 ? 'border-t border-foreground/15 md:border-t-0 md:border-l' : ''}`}
          >
            <span className="text-[18px] text-gold-light">{p.title}</span>
            <span className="text-[14px] leading-relaxed text-foreground/60">{p.desc}</span>
          </li>
        ))}
      </motion.ul>

      <motion.div
        variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease } } }}
        className="flex flex-col items-center gap-4 sm:flex-row"
      >
        <a
          href="/register"
          className="flex h-14 items-center rounded-full bg-gold px-10 text-[16px] text-gold-deep shadow-[0_0_40px_-8px_var(--color-gold)] transition-transform hover:scale-[1.03]"
        >
          {t('申请 VIP 认证', 'Apply for VIP')}
        </a>
        <button
          type="button"
          onClick={onBack}
          className="h-14 rounded-full border border-foreground/25 px-8 text-[15px] text-foreground/80 transition-colors hover:border-foreground/60 hover:text-foreground"
        >
          {t('重新输入', 'Back')}
        </button>
      </motion.div>
    </motion.div>
  )
}

function VipContent() {
  const [guest, setGuest] = useState<string | null>(null)

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0">
        <CrystalScene unlocked={guest !== null} />
      </div>
      <div aria-hidden="true" className="vip-vignette pointer-events-none absolute inset-0" />

      <Navbar visible />

      <section className="pointer-events-none relative z-10 flex min-h-dvh items-center justify-center px-6 pb-12 pt-28">
        <div className="pointer-events-auto flex w-full justify-center">
          <AnimatePresence mode="wait">
            {guest === null ? (
              <NameGate key="gate" onEnter={setGuest} />
            ) : (
              <Welcome key="welcome" name={guest} onBack={() => setGuest(null)} />
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  )
}

export function VipView() {
  return (
    <I18nProvider>
      <VipContent />
    </I18nProvider>
  )
}
