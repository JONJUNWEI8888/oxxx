import {
  Blend,
  CalendarCheck,
  CalendarClock,
  CalendarSync,
  CircleDollarSign,
  Coins,
  Gem,
  Info,
  MessagesSquare,
  Newspaper,
  PiggyBank,
  Presentation,
  Scale,
  ScrollText,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  title: string
  description: string
  icon: LucideIcon
  href: string
}

export type NavGroup = {
  key: string
  label: string
  href?: string
  items?: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  { key: 'market', label: '市场', href: '#' },
  {
    key: 'securities',
    label: '证券',
    items: [
      { title: '股票 / ETF', description: '美股、港股及 ETF 专业交易', icon: CircleDollarSign, href: '#' },
      { title: '美股期权', description: '专业期权交易与策略执行', icon: CalendarSync, href: '#' },
    ],
  },
  {
    key: 'crypto',
    label: '加密货币',
    items: [
      { title: '现货&杠杆', description: '轻松交易加密货币', icon: Scale, href: '#' },
      { title: '合约', description: '永续及交割合约，杠杆灵活可调', icon: ScrollText, href: '#' },
      { title: '期权', description: '多策略期权交易', icon: CalendarCheck, href: '#' },
      { title: '现货 RFQ', description: '大宗现货询价交易', icon: MessagesSquare, href: '#' },
      { title: '期权 RFQ', description: '大宗期权询价交易', icon: CalendarClock, href: '#' },
    ],
  },
  {
    key: 'wealth',
    label: '财富',
    items: [
      { title: '财富总览', description: '智汇财富，高效增值', icon: Presentation, href: '#' },
      { title: '定期理财', description: '锁定收益，同时释放保证金价值', icon: PiggyBank, href: '#' },
      { title: '双币投资', description: '低买高卖，坐享丰厚收益', icon: Blend, href: '#' },
      {
        title: '私行顶奢',
        description: '私行特供 · 全球稀缺资产；老钱严选 · 长期配置必备',
        icon: Gem,
        href: '#',
      },
      {
        title: '独家策略',
        description: '平台精选 · 独家策略产品；家办孵化 · 捕捉超额收益',
        icon: Target,
        href: '#',
      },
      { title: '生息稳定币', description: '持币即生息', icon: Coins, href: '#' },
      { title: '现金宝', description: '闲置资产自动生息，保证金灵活可用', icon: Wallet, href: '#' },
    ],
  },
  {
    key: 'about',
    label: '关于我们',
    items: [
      { title: '关于 OXXX', description: '了解我们的品牌故事与愿景', icon: Info, href: '#' },
      { title: '新闻与洞察', description: '最新市场动态与行业见解', icon: Newspaper, href: '#' },
    ],
  },
]
