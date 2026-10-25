'use client'

import { Inbox } from 'lucide-react'
import { type ReactNode, useState } from 'react'
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

type TipContent = {
  lines: string[]
  rows?: string[]
}

function HintRow({
  id,
  label,
  tip,
  children,
}: {
  id: string
  label: string
  tip: TipContent
  children: ReactNode
}) {
  const tipId = `account-tip-${id}`
  return (
    <div className="group/tip relative flex items-center justify-between gap-3">
      <dt>
        <button
          type="button"
          aria-describedby={tipId}
          className="relative cursor-help text-white/55 underline decoration-white/30 decoration-dashed underline-offset-[5px] transition-colors hover:text-white/80 focus-visible:text-white/80 focus-visible:outline-none"
        >
          {label}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-3 left-1/2 size-2.5 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-pop opacity-0 transition-opacity group-focus-within/tip:opacity-100 group-hover/tip:opacity-100"
          />
        </button>
        <div
          id={tipId}
          role="tooltip"
          className="pointer-events-none invisible absolute bottom-full left-0 z-30 lg:left-auto lg:right-0 mb-2.5 w-[23rem] max-w-[calc(100vw-2rem)] translate-y-1 rounded-lg border border-white/10 bg-pop p-3 text-[13px] leading-relaxed text-white/90 opacity-0 shadow-2xl shadow-black/60 transition-all duration-150 group-focus-within/tip:visible group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:translate-y-0 group-hover/tip:opacity-100"
        >
          {tip.lines.map((line) => (
            <p key={line} className="text-pretty">
              {line}
            </p>
          ))}
          {tip.rows && (
            <dl className="mt-2.5 flex flex-col gap-1.5 border-t border-white/10 pt-2.5">
              {tip.rows.map((row) => (
                <div key={row} className="flex items-center justify-between">
                  <dt className="text-white/75">{row}</dt>
                  <dd className="text-white/50">--</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </dt>
      <dd className="flex items-center gap-2 tabular-nums">{children}</dd>
    </div>
  )
}

function RiskGauge() {
  return (
    <svg viewBox="0 0 24 14" className="h-3.5 w-6" aria-hidden="true">
      <path d="M3 12 A9 9 0 0 1 6.6 4.8" fill="none" stroke="var(--color-up)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8.6 3.6 A9 9 0 0 1 15.4 3.6" fill="none" stroke="var(--color-warn)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17.4 4.8 A9 9 0 0 1 21 12" fill="none" stroke="var(--color-down)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 12 L6.5 10.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-white/80" />
      <circle cx="12" cy="12" r="1.4" className="fill-white/80" />
    </svg>
  )
}

export function AccountPanel() {
  const { t } = useI18n()

  return (
    <section aria-label={t('统一账户', 'Unified account')} className="flex flex-col rounded-lg bg-panel">
      <h2 className="border-b border-line px-4 py-3.5 text-[15px] font-bold text-white">
        {t('统一账户', 'Unified Account')}
      </h2>
      <div className="flex flex-col gap-4 p-4">
        <h3 className="text-sm font-bold text-white">{t('保证金模式', 'Margin Mode')}</h3>
        <dl className="flex flex-col gap-3 text-sm">
          <HintRow
            id="mmr"
            label={t('维持保证金率', 'Maintenance Margin Ratio')}
            tip={{
              lines: [
                t('风险衡量指标。', 'Risk indicator.'),
                t('维持保证金率(MMR) = 维持保证金 / 有效保证金', 'MMR = Maintenance Margin / Effective Margin'),
                t('维持保证金(MM) = 合约维持保证金 + 借币维持保证金', 'MM = Futures MM + Borrowing MM'),
              ],
              rows: [
                t('维持保证金', 'Maintenance Margin'),
                t('合约维持保证金', 'Futures Maintenance Margin'),
                t('借币维持保证金', 'Borrowing Maintenance Margin'),
              ],
            }}
          >
            <RiskGauge />
            <span className="text-up underline decoration-up/40 decoration-dashed underline-offset-[5px]">0.00%</span>
          </HintRow>
          <HintRow
            id="imr"
            label={t('初始保证金率', 'Initial Margin Ratio')}
            tip={{
              lines: [
                t('资金占用率。', 'Capital utilization.'),
                t('初始保证金率(IMR) = 初始保证金 / 有效保证金', 'IMR = Initial Margin / Effective Margin'),
                t('初始保证金(IM) = 合约初始保证金 + 借币初始保证金', 'IM = Futures IM + Borrowing IM'),
              ],
              rows: [
                t('初始保证金', 'Initial Margin'),
                t('合约初始保证金', 'Futures Initial Margin'),
                t('借币初始保证金', 'Borrowing Initial Margin'),
              ],
            }}
          >
            <span className="text-white">0.00%</span>
          </HintRow>
          <HintRow
            id="effective"
            label={t('有效保证金', 'Effective Margin')}
            tip={{
              lines: [
                t(
                  '加密货币、现金宝和定期理财考虑折扣率之后可做交易保证金的数量',
                  'The amount of crypto, flexible and fixed savings usable as trading margin after applying discount rates.',
                ),
              ],
            }}
          >
            <span className="text-white">--</span>
          </HintRow>
          <div className="flex flex-col gap-3 rounded-lg bg-well px-8 py-3">
            {[t('理财产品', 'Earn Products'), t('加密货币', 'Crypto')].map((label) => (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-white/55">{label}</dt>
                <dd className="text-white/40">--</dd>
              </div>
            ))}
          </div>
          <HintRow
            id="leverage"
            label={t('账户杠杆', 'Account Leverage')}
            tip={{
              lines: [
                t('账户层面整体杠杆。', 'Overall account-level leverage.'),
                t('账户杠杆 = 总仓位价值 / 有效保证金', 'Leverage = Total Position Value / Effective Margin'),
                t('总仓位价值 = 合约价值 + 借币价值', 'Total Position Value = Futures Value + Borrowed Value'),
              ],
              rows: [t('总仓位价值', 'Total Position Value'), t('合约价值', 'Futures Value'), t('借币价值', 'Borrowed Value')],
            }}
          >
            <span className="text-white">--</span>
          </HintRow>
        </dl>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {[t('充值', 'Deposit'), t('划转', 'Transfer')].map((label) => (
            <button
              key={label}
              type="button"
              disabled
              title={t('登录后可用', 'Available after login')}
              className="h-11 cursor-not-allowed rounded-lg bg-white/[0.06] text-sm text-white/35"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
