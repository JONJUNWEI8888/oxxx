'use client'

import { Inbox } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'positions', label: { zh: '当前持仓 (0)', en: 'Positions (0)' } },
  { key: 'open', label: { zh: '当前委托 (0)', en: 'Open Orders (0)' } },
  { key: 'history', label: { zh: '历史委托', en: 'Order History' } },
  { key: 'fills', label: { zh: '历史成交', en: 'Trade History' } },
  { key: 'ledger', label: { zh: '资金流水', en: 'Transactions' } },
  { key: 'assets', label: { zh: '资产', en: 'Assets' } },
] as const

export function PositionsPanel() {
  const { t } = useI18n()
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('positions')

  return (
    <section aria-label={t('订单与持仓', 'Orders and positions')} className="flex min-h-64 flex-col rounded-lg bg-panel">
      <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-line px-4 [scrollbar-width:none]">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'relative shrink-0 py-3 text-sm transition-colors',
              tab === item.key ? 'font-bold text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-gold' : 'text-white/50 hover:text-white/80',
            )}
          >
            {t(item.label)}
          </button>
        ))}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-sm text-white/40">
        <Inbox className="size-8 text-white/20" strokeWidth={1.4} aria-hidden="true" />
        <p>
          {t('暂无数据，', 'No data yet. ')}
          <a href="#" className="text-gold hover:text-gold-light">
            {t('登录', 'Log in')}
          </a>
          {t(' 后查看', ' to view')}
        </p>
      </div>
    </section>
  )
}

export function AccountPanel() {
  const { t } = useI18n()
  const rows = [
    [t('维持保证金率', 'Maintenance margin'), '0.00%'],
    [t('初始保证金率', 'Initial margin'), '0.00%'],
    [t('有效保证金', 'Effective margin'), '--'],
    [t('可用余额', 'Available'), '--'],
  ]
  return (
    <section aria-label={t('统一账户', 'Unified account')} className="flex flex-col gap-4 rounded-lg bg-panel p-4">
      <h2 className="text-[15px] font-bold text-white">{t('统一账户', 'Unified Account')}</h2>
      <p className="text-sm text-white/80">{t('保证金模式 · 全仓', 'Margin mode · Cross')}</p>
      <dl className="flex flex-col gap-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between">
            <dt className="text-white/50 underline decoration-white/20 decoration-dashed underline-offset-4">{label}</dt>
            <dd className="tabular-nums text-white/90">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
