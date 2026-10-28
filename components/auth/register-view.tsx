'use client'

import { motion } from 'framer-motion'
import { Building2, Check, UserRound } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { TopBar } from '@/components/auth/login-view'
import { RegisterWelcomePanel } from '@/components/auth/register-welcome-panel'
import { I18nProvider, useI18n } from '@/lib/i18n'

type AccountType = 'personal' | 'business'

function AccountTypeCard({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: LucideIcon
  title: string
  description: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`group relative flex w-full flex-col items-start gap-4 rounded-2xl border p-6 text-left transition-all sm:p-7 ${
        selected
          ? 'border-gold bg-gold/[0.06] shadow-[0_0_40px_-16px_var(--color-gold)]'
          : 'border-foreground/12 bg-panel hover:border-gold/50'
      }`}
    >
      <span
        className={`flex size-12 items-center justify-center rounded-xl transition-colors ${
          selected ? 'bg-gold text-gold-deep' : 'bg-raised text-gold group-hover:bg-gold/15'
        }`}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <span className="flex flex-col gap-2">
        <span className="text-xl font-bold text-foreground">{title}</span>
        <span className="text-pretty text-[15px] leading-relaxed text-foreground/60">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={`absolute right-5 top-5 flex size-6 items-center justify-center rounded-full border transition-colors ${
          selected ? 'border-gold bg-gold text-gold-deep' : 'border-foreground/25'
        }`}
      >
        {selected && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  )
}

function RegisterForm() {
  const { t } = useI18n()
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const options: { key: AccountType; icon: LucideIcon; title: string; description: string }[] = [
    {
      key: 'personal',
      icon: UserRound,
      title: t('个人注册', 'Personal Account'),
      description: t('适合个人用户快速开展业务', 'For individuals who want to get started quickly'),
    },
    {
      key: 'business',
      icon: Building2,
      title: t('企业注册', 'Business Account'),
      description: t(
        '适合企业和机构，支持在更多国家和地区开展业务',
        'For companies and institutions, available in more countries and regions',
      ),
    },
  ]

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountType) return
    setNotice(
      accountType === 'personal'
        ? t('个人注册即将开放，敬请期待。', 'Personal sign-up is coming soon. Stay tuned.')
        : t('企业注册即将开放，敬请期待。', 'Business sign-up is coming soon. Stay tuned.'),
    )
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex w-full max-w-[440px] flex-col gap-8"
    >
      <h1 className="text-balance font-display text-5xl tracking-wide text-foreground">
        {t('选择账号类型', 'Choose Account Type')}
      </h1>

      <div role="radiogroup" aria-label={t('账号类型', 'Account type')} className="flex flex-col gap-4">
        {options.map((option) => (
          <AccountTypeCard
            key={option.key}
            icon={option.icon}
            title={option.title}
            description={option.description}
            selected={accountType === option.key}
            onSelect={() => {
              setAccountType(option.key)
              setNotice(null)
            }}
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={!accountType}
        className="h-14 rounded-xl bg-gold text-base font-bold text-gold-deep transition-all hover:bg-gold-light hover:shadow-[0_0_32px_-8px_var(--color-gold)] disabled:cursor-not-allowed disabled:bg-raised disabled:text-foreground/35 disabled:shadow-none"
      >
        {t('下一步', 'Next')}
      </button>

      <p aria-live="polite" className="-mt-4 min-h-5 text-center text-sm text-gold-light">
        {notice}
      </p>

      <p className="-mt-6 text-center text-sm text-foreground/60">
        {t('已有账号？', 'Already have an account?')}{' '}
        <Link href="/login" className="font-bold text-gold transition-colors hover:text-gold-light">
          {t('立即登录', 'Log in now')}
        </Link>
      </p>
    </motion.form>
  )
}

export function RegisterView() {
  return (
    <I18nProvider title={{ zh: '注册 | OXXX', en: 'Sign Up | OXXX' }}>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <TopBar />
        <main className="flex flex-1">
          <RegisterWelcomePanel />
          <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
            <RegisterForm />
          </section>
        </main>
      </div>
    </I18nProvider>
  )
}
