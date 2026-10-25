'use client'

import { ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n'
import type { Market } from '@/lib/markets'
import { cn } from '@/lib/utils'
import { CoinBadge } from './market-header'

type Bi = { zh: string; en: string }
type Row = { label: Bi; hint: Bi; value: string }

type CoinProfile = {
  intro: Bi
  stats: Row[]
  rules: Row[]
  links: { website: string; whitepaper: string }
}

const HINT = {
  rank: { zh: '按市值在所有加密货币中的排名', en: 'Ranking among all cryptocurrencies by market cap' },
  marketCap: { zh: '市值 = 当前价格 × 流通数量', en: 'Market cap = current price × circulating supply' },
  dominance: { zh: '该币种市值占加密货币总市值的比例', en: 'Share of total crypto market cap' },
  volume: { zh: '过去 24 小时全网成交额', en: 'Total trading volume across markets in the past 24 hours' },
  volumeRatio: { zh: '24 小时成交量 / 市值，反映流动性', en: '24h volume / market cap, an indicator of liquidity' },
  circulating: { zh: '当前在市场上流通的代币数量', en: 'Number of coins currently circulating in the market' },
  maxSupply: { zh: '该币种协议规定的最大发行数量', en: 'Maximum number of coins that will ever exist' },
  totalSupply: { zh: '已发行的代币总量，扣除已销毁部分', en: 'Coins created so far, minus any burned' },
  issueDate: { zh: '该项目正式发布的日期', en: 'Date the project was launched' },
  minQty: { zh: '单笔订单允许的最小下单数量', en: 'Minimum quantity allowed per order' },
  qtyStep: { zh: '下单数量须为该精度的整数倍', en: 'Order quantity must be a multiple of this step' },
  minNotional: { zh: '单笔订单允许的最小下单金额', en: 'Minimum notional value per order' },
  tick: { zh: '价格每次变动的最小单位', en: 'Smallest allowed price increment' },
  limitBand: { zh: '限价买单价格不得高于最新价的上限比例，卖单不得低于下限比例', en: 'Limit buy prices cannot exceed, and sell prices cannot fall below, these bands around the last price' },
  marketBand: { zh: '市价单成交价格相对最新价的最大偏离比例', en: 'Maximum deviation from the last price for market order fills' },
  maxNotional: { zh: '单笔限价单 / 市价单允许的最大下单金额', en: 'Maximum notional per limit / market order' },
  maxOpen: { zh: '同时存在的未成交挂单最大数量', en: 'Maximum number of open orders at the same time' },
} satisfies Record<string, Bi>

const L = (zh: string, en: string): Bi => ({ zh, en })

const PROFILES: Record<string, CoinProfile> = {
  BTC: {
    intro: L(
      '比特币（BTC）是一种去中心化加密货币，最早由化名“中本聪”的个人或团体于 2008 年在白皮书中提出，并于 2009 年 1 月正式上线。比特币是一种点对点的数字货币，所有交易均直接发生在平等、独立的网络参与者之间，无需任何金融机构或中介的许可或参与。正如中本聪所言，比特币的设计目标是实现“在线支付可以在双方之间直接完成，而无需通过金融机构”。尽管在比特币出现之前，已有类似去中心化电子货币的理论构想，但比特币是历史上第一个真正投入实际使用的加密货币。',
      'Bitcoin (BTC) is a decentralized cryptocurrency first described in a 2008 whitepaper by a person or group using the name Satoshi Nakamoto, and launched in January 2009. Bitcoin is peer-to-peer digital cash: every transaction happens directly between equal, independent network participants, without permission from or involvement of any financial institution or intermediary. In Satoshi’s words, it was designed to allow “online payments to be sent directly from one party to another without going through a financial institution.” Similar decentralized e-cash ideas existed before, but Bitcoin was the first cryptocurrency put into real-world use.',
    ),
    stats: [
      { label: L('排行', 'Rank'), hint: HINT.rank, value: 'No.1' },
      { label: L('市值', 'Market cap'), hint: HINT.marketCap, value: '$1.62T' },
      { label: L('市场占有率', 'Dominance'), hint: HINT.dominance, value: '60.1202%' },
      { label: L('成交量', 'Volume'), hint: HINT.volume, value: '$11.25B' },
      { label: L('成交量/市值', 'Volume / Market cap'), hint: HINT.volumeRatio, value: '0.69%' },
      { label: L('流通数量', 'Circulating supply'), hint: HINT.circulating, value: '20,103,409 BTC' },
      { label: L('最大供应', 'Max supply'), hint: HINT.maxSupply, value: '21,000,000 BTC' },
      { label: L('总供应', 'Total supply'), hint: HINT.totalSupply, value: '20,103,409 BTC' },
      { label: L('发行日期', 'Issue date'), hint: HINT.issueDate, value: '2008-10-31' },
    ],
    rules: [
      { label: L('最小下单数量', 'Min order qty'), hint: HINT.minQty, value: '0.00001 BTC' },
      { label: L('下单数量精度', 'Qty step'), hint: HINT.qtyStep, value: '0.00001 BTC' },
      { label: L('最小下单金额', 'Min order value'), hint: HINT.minNotional, value: '5 USDT' },
      { label: L('最小价格变动', 'Tick size'), hint: HINT.tick, value: '0.01 USDT' },
      { label: L('限价单价格上限/下限比例', 'Limit price cap / floor'), hint: HINT.limitBand, value: '3% / 3%' },
      { label: L('市价单价格上限/下限比例', 'Market price cap / floor'), hint: HINT.marketBand, value: '1% / 1%' },
      { label: L('限价单/市价单单笔最大金额', 'Max limit / market order value'), hint: HINT.maxNotional, value: '2,000,000 / 1,400,000 USDT' },
      { label: L('最大挂单数量', 'Max open orders'), hint: HINT.maxOpen, value: '500' },
    ],
    links: { website: 'https://bitcoin.org', whitepaper: 'https://bitcoin.org/bitcoin.pdf' },
  },
  ETH: {
    intro: L(
      '以太坊（ETH）是一个开源的去中心化区块链平台，由 Vitalik Buterin 于 2013 年提出，并于 2015 年 7 月正式上线。以太坊支持智能合约，开发者可以在其上构建和部署去中心化应用（DApp）。ETH 是以太坊网络的原生代币，用于支付交易手续费和计算服务费用（Gas）。2022 年以太坊完成“合并”，由工作量证明（PoW）转为权益证明（PoS），大幅降低了能耗。',
      'Ethereum (ETH) is an open-source, decentralized blockchain platform proposed by Vitalik Buterin in 2013 and launched in July 2015. Ethereum supports smart contracts, letting developers build and deploy decentralized applications (DApps). ETH is the network’s native token, used to pay transaction fees and computation costs (gas). In 2022 Ethereum completed “The Merge,” moving from proof-of-work to proof-of-stake and sharply reducing its energy use.',
    ),
    stats: [
      { label: L('排行', 'Rank'), hint: HINT.rank, value: 'No.2' },
      { label: L('市值', 'Market cap'), hint: HINT.marketCap, value: '$382.40B' },
      { label: L('市场占有率', 'Dominance'), hint: HINT.dominance, value: '14.1837%' },
      { label: L('成交量', 'Volume'), hint: HINT.volume, value: '$9.86B' },
      { label: L('成交量/市值', 'Volume / Market cap'), hint: HINT.volumeRatio, value: '2.58%' },
      { label: L('流通数量', 'Circulating supply'), hint: HINT.circulating, value: '120,712,846 ETH' },
      { label: L('最大供应', 'Max supply'), hint: HINT.maxSupply, value: '--' },
      { label: L('总供应', 'Total supply'), hint: HINT.totalSupply, value: '120,712,846 ETH' },
      { label: L('发行日期', 'Issue date'), hint: HINT.issueDate, value: '2015-07-30' },
    ],
    rules: [
      { label: L('最小下单数量', 'Min order qty'), hint: HINT.minQty, value: '0.0001 ETH' },
      { label: L('下单数量精度', 'Qty step'), hint: HINT.qtyStep, value: '0.0001 ETH' },
      { label: L('最小下单金额', 'Min order value'), hint: HINT.minNotional, value: '5 USDT' },
      { label: L('最小价格变动', 'Tick size'), hint: HINT.tick, value: '0.01 USDT' },
      { label: L('限价单价格上限/下限比例', 'Limit price cap / floor'), hint: HINT.limitBand, value: '3% / 3%' },
      { label: L('市价单价格上限/下限比例', 'Market price cap / floor'), hint: HINT.marketBand, value: '1% / 1%' },
      { label: L('限价单/市价单单笔最大金额', 'Max limit / market order value'), hint: HINT.maxNotional, value: '2,000,000 / 1,000,000 USDT' },
      { label: L('最大挂单数量', 'Max open orders'), hint: HINT.maxOpen, value: '500' },
    ],
    links: { website: 'https://ethereum.org', whitepaper: 'https://ethereum.org/whitepaper' },
  },
}

const LEVERAGE_TIERS: Record<string, { cap: string; leverage: number; mmr: string }[]> = {
  BTC: [
    { cap: '0 - 300,000', leverage: 125, mmr: '0.40%' },
    { cap: '300,000 - 800,000', leverage: 100, mmr: '0.50%' },
    { cap: '800,000 - 3,000,000', leverage: 75, mmr: '0.65%' },
    { cap: '3,000,000 - 12,000,000', leverage: 50, mmr: '1.00%' },
    { cap: '12,000,000 - 70,000,000', leverage: 25, mmr: '2.00%' },
    { cap: '70,000,000 - 100,000,000', leverage: 20, mmr: '2.50%' },
    { cap: '100,000,000 - 230,000,000', leverage: 10, mmr: '5.00%' },
    { cap: '230,000,000 - 480,000,000', leverage: 5, mmr: '10.00%' },
  ],
  ETH: [
    { cap: '0 - 250,000', leverage: 100, mmr: '0.50%' },
    { cap: '250,000 - 600,000', leverage: 75, mmr: '0.65%' },
    { cap: '600,000 - 2,500,000', leverage: 50, mmr: '1.00%' },
    { cap: '2,500,000 - 10,000,000', leverage: 25, mmr: '2.00%' },
    { cap: '10,000,000 - 50,000,000', leverage: 20, mmr: '2.50%' },
    { cap: '50,000,000 - 100,000,000', leverage: 10, mmr: '5.00%' },
    { cap: '100,000,000 - 200,000,000', leverage: 5, mmr: '10.00%' },
  ],
}

const SUB_TABS = [
  { key: 'coin', label: L('币种信息', 'Coin info') },
  { key: 'rules', label: L('交易规则', 'Trading rules') },
  { key: 'margin', label: L('杠杆与保证金', 'Leverage & margin') },
] as const

type SubTab = (typeof SUB_TABS)[number]['key']

function StatGrid({ rows }: { rows: Row[] }) {
  const { t } = useI18n()
  return (
    <dl className="grid gap-x-12 gap-y-1 @2xl:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label.en} className="flex items-center justify-between gap-4 py-2">
          <dt>
            <Tooltip>
              <TooltipTrigger
                render={<button type="button" />}
                className="cursor-help text-left text-white/50 underline decoration-white/25 decoration-dashed underline-offset-4 transition-colors hover:text-white/80"
              >
                {t(row.label)}
              </TooltipTrigger>
              <TooltipContent side="top" align="start" className="max-w-72 bg-raised px-3 py-2 text-[13px] leading-relaxed text-white/90 shadow-lg ring-1 ring-white/10">
                {t(row.hint)}
              </TooltipContent>
            </Tooltip>
          </dt>
          <dd className="text-right tabular-nums text-white/90">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ExternalButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md bg-white/[0.06] px-3 py-2 text-white/90 transition-colors hover:bg-white/10"
    >
      {children}
      <ArrowUpRight className="size-4" aria-hidden="true" />
    </a>
  )
}

export function InstrumentInfo({ market }: { market: Market }) {
  const { t } = useI18n()
  const [tab, setTab] = useState<SubTab>('coin')
  const profile = PROFILES[market.base]
  const tiers = LEVERAGE_TIERS[market.base] ?? []

  return (
    <TooltipProvider delay={100}>
      <div className="@container flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3 text-sm [scrollbar-width:thin]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label={t('基础信息', 'Info')} className="flex gap-1 rounded-lg bg-white/[0.04] p-1">
            {SUB_TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={tab === item.key}
                onClick={() => setTab(item.key)}
                className={cn(
                  'rounded-md px-3 py-1.5 transition-colors',
                  tab === item.key ? 'bg-white/10 font-bold text-white' : 'text-white/60 hover:text-white',
                )}
              >
                {t(item.label)}
              </button>
            ))}
          </div>
          {tab === 'rules' && (
            <a href="#" className="inline-flex items-center gap-1 text-gold-light transition-colors hover:text-gold">
              {t('查看更多', 'View more')}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          )}
        </div>

        {tab === 'coin' && profile && (
          <>
            <p className="rounded-md bg-white/[0.04] px-3 py-2.5 text-xs leading-relaxed text-white/45">
              {t(
                '*免责声明：基础数据由 CoinMarketCap (CMC) 提供，仅供参考。信息为“原样”呈现，OXXX 对此信息不构成任何形式的陈述或保证。',
                '*Disclaimer: Basic data is provided by CoinMarketCap (CMC) for reference only. Information is presented “as is”, and OXXX makes no representation or warranty of any kind regarding it.',
              )}
            </p>
            <div className="flex flex-col gap-3">
              <h3 className="flex items-center gap-2">
                <CoinBadge base={market.base} className="size-5" />
                <span className="text-base font-bold text-white">{market.base}</span>
                <span className="text-white/45">{t(market.name)}</span>
              </h3>
              <p className="text-pretty leading-relaxed text-white/75">{t(profile.intro)}</p>
            </div>
            <StatGrid rows={profile.stats} />
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-bold text-white">{t('官方链接', 'Official links')}</h3>
              <div className="flex flex-wrap gap-3">
                <ExternalButton href={profile.links.website}>{t('官方网址', 'Website')}</ExternalButton>
                <ExternalButton href={profile.links.whitepaper}>{t('白皮书', 'Whitepaper')}</ExternalButton>
              </div>
            </div>
          </>
        )}

        {tab === 'rules' && profile && <StatGrid rows={profile.rules} />}

        {tab === 'margin' && (
          <div className="flex flex-col gap-3">
            <p className="leading-relaxed text-white/60">
              {t(
                '仓位价值越大，可用最大杠杆越低，维持保证金率越高。',
                'Larger positions have lower maximum leverage and a higher maintenance margin rate.',
              )}
            </p>
            <table className="w-full text-left tabular-nums">
              <thead className="text-xs text-white/45">
                <tr className="border-b border-line">
                  <th scope="col" className="py-2 font-normal">{t('档位', 'Tier')}</th>
                  <th scope="col" className="py-2 font-normal">{t('仓位价值 (USDT)', 'Position value (USDT)')}</th>
                  <th scope="col" className="py-2 text-right font-normal">{t('最大杠杆', 'Max leverage')}</th>
                  <th scope="col" className="py-2 text-right font-normal">{t('维持保证金率', 'Maint. margin rate')}</th>
                </tr>
              </thead>
              <tbody className="text-white/90">
                {tiers.map((tier, i) => (
                  <tr key={tier.cap} className="border-b border-line/60">
                    <td className="py-2.5 text-white/60">{i + 1}</td>
                    <td className="py-2.5">{tier.cap}</td>
                    <td className="py-2.5 text-right">{tier.leverage}x</td>
                    <td className="py-2.5 text-right">{tier.mmr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
