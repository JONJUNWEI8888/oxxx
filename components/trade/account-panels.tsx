'use client'

import { Inbox } from 'lucide-react'
import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
    {
      label: t('维持保证金率', 'Maint. margin rate'),
      hint: t('维持保证金 / 有效保证金。该比率达到 100% 时将触发强制平仓。', 'Maintenance margin / effective margin. Liquidation is triggered at 100%.'),
      value: '0.00%',
    },
    {
      label: t('初始保证金率', 'Initial margin rate'),
      hint: t('初始保证金 / 有效保证金。该比率达到 100% 时无法继续开仓。', 'Initial margin / effective margin. New positions are blocked at 100%.'),
      value: '0.00%',
    },
    {
      label: t('有效保证金', 'Effective margin'),
      hint: t('账户钱包余额加上全部仓位的未实现盈亏。', 'Wallet balance plus unrealized PnL across all positions.'),
      value: '--',
    },
    {
      label: t('可用余额', 'Available balance'),
      hint: t('可用于开新仓或划转的金额。', 'Amount available to open new positions or transfer out.'),
      value: '--',
    },
  ]
  return (
    <section aria-label={t('统一账户', 'Unified account')} className="flex min-h-64 flex-col gap-5 rounded-lg bg-panel p-4">
      <h2 className="text-[15px] font-bold text-white">{t('统一账户', 'Unified Account')}</h2>
      <p className="flex items-center gap-2 text-sm text-white/85">
        <span>{t('保证金模式', 'Margin mode')}</span>
        <span aria-hidden="true" className="text-white/40">
          ·
        </span>
        <span>{t('全仓', 'Cross')}</span>
      </p>
      <TooltipProvider delay={100}>
        <dl className="flex flex-col gap-3 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4">
              <dt>
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    className="cursor-help text-left text-white/50 underline decoration-white/25 decoration-dashed underline-offset-4 transition-colors hover:text-white/80"
                  >
                    {row.label}
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start" className="max-w-64 bg-raised px-3 py-2 text-[13px] leading-relaxed text-white/90 shadow-lg ring-1 ring-white/10">
                    {row.hint}
                  </TooltipContent>
                </Tooltip>
              </dt>
              <dd className="font-mono tabular-nums text-white/90">{row.value}</dd>
            </div>
          ))}
        </dl>
      </TooltipProvider>
    </section>
  )
}
