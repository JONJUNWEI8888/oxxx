import {
  Blend,
  Bot,
  CalendarCheck,
  ChartLine,
  CalendarSync,
  CircleDollarSign,
  Coins,
  Gem,
  Info,
  Newspaper,
  PiggyBank,
  Presentation,
  Scale,
  ScrollText,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Bi } from '@/lib/i18n'

export type NavItem = {
  id: string
  title: Bi
  description: Bi
  icon: LucideIcon
  href: string
}

export type NavGroup = {
  key: string
  label: Bi
  href?: string
  external?: boolean
  items?: NavItem[]
}

export const WORLD_MONITOR_URL =
  'https://www.worldmonitor.app/dashboard?zoom=1.00&view=global&timeRange=7d&layers=iranAttacks%2Chotspots%2Cconflicts%2Cbases%2Cnuclear%2Cmilitary%2Cweather%2CcanadaAlerts%2Coutages%2Cnatural%2Cwaterways%2Ceconomic%2Csanctions'

export const NAV_GROUPS: NavGroup[] = [
  { key: 'market', label: { zh: '市场', en: 'Markets' }, href: WORLD_MONITOR_URL, external: true },
  {
    key: 'securities',
    label: { zh: '证券', en: 'Securities' },
    items: [
      {
        id: 'stocks',
        title: { zh: '股票 / ETF', en: 'Stocks / ETFs' },
        description: { zh: '美股、港股及 ETF 专业交易', en: 'Professional trading in US & HK stocks and ETFs' },
        icon: CircleDollarSign,
        href: '#',
      },
      {
        id: 'us-options',
        title: { zh: '美股期权', en: 'US Options' },
        description: { zh: '专业期权交易与策略执行', en: 'Professional options trading and strategy execution' },
        icon: CalendarSync,
        href: '#',
      },
    ],
  },
  {
    key: 'crypto',
    label: { zh: '加密货币', en: 'Crypto' },
    items: [
      {
        id: 'spot',
        title: { zh: '现货&杠杆', en: 'Spot & Margin' },
        description: { zh: '轻松交易加密货币', en: 'Trade crypto with ease' },
        icon: Scale,
        href: '/trade/BTCUSDT',
      },
      {
        id: 'futures',
        title: { zh: '合约', en: 'Futures' },
        description: { zh: '永续及交割合约，杠杆灵活可调', en: 'Perpetual and delivery futures with flexible leverage' },
        icon: ScrollText,
        href: '/futures/BTCUSDT',
      },
      {
        id: 'crypto-options',
        title: { zh: '期权', en: 'Options' },
        description: { zh: '多策略期权交易', en: 'Multi-strategy options trading' },
        icon: CalendarCheck,
        href: '/options/BTC-USDT',
      },
      {
        id: 'tradfi',
        title: { zh: 'TradFi', en: 'TradFi' },
        description: {
          zh: '使用加密货币交易股票、ETF 和大宗商品',
          en: 'Trade stocks, ETFs and commodities with crypto',
        },
        icon: ChartLine,
        href: '#',
      },
      {
        id: 'strategy-copy',
        title: { zh: '策略&跟单', en: 'Strategies & Copy Trading' },
        description: {
          zh: '自动化交易策略或跟随顶级交易员',
          en: 'Automate strategies or follow top traders',
        },
        icon: Bot,
        href: '#',
      },
    ],
  },
  {
    key: 'wealth',
    label: { zh: '财富', en: 'Wealth' },
    items: [
      {
        id: 'overview',
        title: { zh: '财富总览', en: 'Wealth Overview' },
        description: { zh: '智汇财富，高效增值', en: 'Smart wealth, efficient growth' },
        icon: Presentation,
        href: '#',
      },
      {
        id: 'fixed',
        title: { zh: '定期理财', en: 'Fixed-Term Savings' },
        description: { zh: '锁定收益，同时释放保证金价值', en: 'Lock in yield while unlocking margin value' },
        icon: PiggyBank,
        href: '#',
      },
      {
        id: 'dual',
        title: { zh: '双币投资', en: 'Dual Investment' },
        description: { zh: '低买高卖，坐享丰厚收益', en: 'Buy low, sell high, earn generous returns' },
        icon: Blend,
        href: '#',
      },
      {
        id: 'private',
        title: { zh: '私行顶奢', en: 'Private Banking Elite' },
        description: {
          zh: '私行特供 · 全球稀缺资产；老钱严选 · 长期配置必备',
          en: 'Private-bank exclusive global scarce assets, curated for long-term allocation',
        },
        icon: Gem,
        href: '#',
      },
      {
        id: 'strategies',
        title: { zh: '独家策略', en: 'Exclusive Strategies' },
        description: {
          zh: '平台精选 · 独家策略产品；家办孵化 · 捕捉超额收益',
          en: 'Curated exclusive strategies, family-office incubated to capture alpha',
        },
        icon: Target,
        href: '#',
      },
      {
        id: 'yield-stable',
        title: { zh: '生息稳定币', en: 'Yield Stablecoins' },
        description: { zh: '持币即生息', en: 'Earn yield just by holding' },
        icon: Coins,
        href: '#',
      },
      {
        id: 'cash',
        title: { zh: '现金宝', en: 'Cash Vault' },
        description: { zh: '闲置资产自动生息，保证金灵活可用', en: 'Idle assets earn automatically, margin stays flexible' },
        icon: Wallet,
        href: '#',
      },
    ],
  },
  {
    key: 'about',
    label: { zh: '关于我们', en: 'About' },
    items: [
      {
        id: 'about-oxxx',
        title: { zh: '关于 OXXX', en: 'About OXXX' },
        description: { zh: '了解我们的品牌故事与愿景', en: 'Discover our story and vision' },
        icon: Info,
        href: '/about',
      },
      {
        id: 'news',
        title: { zh: '新闻与洞察', en: 'News & Insights' },
        description: { zh: '最新市场动态与行业见解', en: 'Latest market updates and industry insights' },
        icon: Newspaper,
        href: '/about#news',
      },
    ],
  },
]
