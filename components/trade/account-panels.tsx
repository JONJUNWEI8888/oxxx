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

type AccountRow = {
  label: string
  value: string
  lines: string[]
  breakdown?: { label: string; value: string }[]
}

export function AccountPanel() {
  const { t } = useI18n()
  const rows: AccountRow[] = [
    {
      label: t('维持保证金率', 'Maint. margin rate'),
      value: '0.00%',
      lines: [
        t('风险衡量指标。', 'Risk indicator.'),
        t('维持保证金率(MMR) = 维持保证金 / 有效保证金', 'MMR = Maintenance margin / Effective margin'),
        t('维持保证金(MM) = 合约维持保证金 + 借币维持保证金', 'MM = Contract MM + Borrowing MM'),
      ],
      breakdown: [
        { label: t('维持保证金', 'Maintenance margin'), value: '--' },
        { label: t('合约维持保证金', 'Contract MM'), value: '--' },
        { label: t('借币维持保证金', 'Borrowing MM'), value: '--' },
      ],
    },
    {
      label: t('初始保证金率', 'Initial margin rate'),
      value: '0.00%',
      lines: [
        t('资金占用率。', 'Capital utilization.'),
        t('初始保证金率(IMR) = 初始保证金 / 有效保证金', 'IMR = Initial margin / Effective margin'),
        t('初始保证金(IM) = 合约初始保证金 + 借币初始保证金', 'IM = Contract IM + Borrowing IM'),
      ],
      breakdown: [
        { label: t('初始保证金', 'Initial margin'), value: '--' },
        { label: t('合约初始保证金', 'Contract IM'), value: '--' },
        { label: t('借币初始保证金', 'Borrowing IM'), value: '--' },
      ],
    },
    {
      label: t('有效保证金', 'Effective margin'),
      value: '--',
      lines: [
        t(
          '加密货币、现金宝和定期理财考虑折扣率之后可做交易保证金的数量',
          'Amount of crypto, savings and fixed-term products usable as trading margin after haircuts',
        ),
      ],
    },
    {
      label: t('账户杠杆', 'Account leverage'),
      value: '--',
      lines: [
        t('账户层面整体杠杆。', 'Overall account-level leverage.'),
        t('账户杠杆 = 总仓位价值 / 有效保证金', 'Account leverage = Total position value / Effective margin'),
        t('总仓位价值 = 合约价值 + 借币价值', 'Total position value = Contract value + Borrowed value'),
      ],
      breakdown: [
        { label: t('总仓位价值', 'Total position value'), value: '--' },
        { label: t('合约价值', 'Contract value'), value: '--' },
        { label: t('借币价值', 'Borrowed value'), value: '--' },
      ],
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
                  <TooltipContent
                    side="top"
                    align="start"
                    className="flex max-w-sm flex-col items-stretch gap-3 bg-raised text-left px-3 py-2.5 text-[13px] leading-relaxed text-white/90 shadow-lg ring-1 ring-white/10"
                  >
                    <div className="flex flex-col">
                      {row.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                    {row.breakdown && (
                      <dl className="flex w-full flex-col gap-1 border-t border-white/10 pt-3">
                        {row.breakdown.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-6">
                            <dt>{item.label}</dt>
                            <dd className="font-mono tabular-nums">{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </TooltipContent>
                </Tooltip>
              </dt>
              <dd className="font-mono tabular-nums text-white/90">{row.value}</dd>
            </div>
          ))}
        </dl>
      </TooltipProvider>
      <div className="mt-auto flex gap-2">
        <button
          type="button"
          className="h-10 flex-1 rounded-md bg-raised text-sm font-medium text-white/60 transition-colors hover:text-white"
        >
          {t('充值', 'Deposit')}
        </button>
        <button
          type="button"
          className="h-10 flex-1 rounded-md bg-raised text-sm font-medium text-white/60 transition-colors hover:text-white"
        >
          {t('划转', 'Transfer')}
        </button>
      </div>
    </section>
  )
}
