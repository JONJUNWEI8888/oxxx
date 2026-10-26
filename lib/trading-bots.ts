import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownToLine,
  Blocks,
  CalendarClock,
  Clock,
  Grid3x3,
  Layers,
  Radio,
  Repeat,
  Scale,
  Shuffle,
  Snowflake,
  TrendingDown,
} from 'lucide-react'

type Text = { zh: string; en: string }

export type BotFilter = 'all' | 'bull' | 'bear' | 'split' | 'range'

export const BOT_FILTERS: { id: BotFilter; label: Text }[] = [
  { id: 'all', label: { zh: '全部', en: 'All' } },
  { id: 'bull', label: { zh: '看涨', en: 'Bullish' } },
  { id: 'bear', label: { zh: '看跌', en: 'Bearish' } },
  { id: 'split', label: { zh: '大单拆分', en: 'Order splitting' } },
  { id: 'range', label: { zh: '震荡', en: 'Ranging' } },
]

export type BotTool = {
  id: string
  name: Text
  tagline: Text
  users: number
  icon: LucideIcon
  tags: BotFilter[]
  badge?: string
}

export const BOT_TOOLS: BotTool[] = [
  { id: 'spot-grid', name: { zh: '现货网格', en: 'Spot grid' }, tagline: { zh: '低买高卖，震荡向上行情', en: 'Buy low, sell high in rising ranges' }, users: 696410, icon: Grid3x3, tags: ['bull', 'range'] },
  { id: 'futures-grid', name: { zh: '合约网格', en: 'Futures grid' }, tagline: { zh: '循环套利，可加杠杆，牛熊皆宜', en: 'Loop arbitrage with leverage, any market' }, users: 653472, icon: Layers, tags: ['bull', 'bear', 'range'] },
  { id: 'coin-grid', name: { zh: '合约网格 (币本位)', en: 'Coin-margined grid' }, tagline: { zh: '循环套利，可加杠杆，牛熊皆宜', en: 'Loop arbitrage, settled in coin' }, users: 653472, icon: Blocks, tags: ['bull', 'range'] },
  { id: 'portfolio', name: { zh: '智能组合', en: 'Smart portfolio' }, tagline: { zh: '多币组合，动态调仓', en: 'Multi-coin basket, auto rebalanced' }, users: 39603, icon: Shuffle, tags: ['bull'], badge: 'New' },
  { id: 'futures-martingale', name: { zh: '合约马丁格尔', en: 'Futures martingale' }, tagline: { zh: '高抛低吸，分批进场', en: 'Scale in on dips, exit on rallies' }, users: 434640, icon: TrendingDown, tags: ['bull', 'bear'] },
  { id: 'arbitrage', name: { zh: '智能套利', en: 'Smart arbitrage' }, tagline: { zh: '一键套利，智能对冲', en: 'One-click hedged arbitrage' }, users: 48409, icon: Scale, tags: ['range'], badge: 'TradFi' },
  { id: 'dip-buy', name: { zh: '抄底止盈策略', en: 'Buy the dip' }, tagline: { zh: '双币理财，买低卖高，循环套利', en: 'Dual-asset loops: buy low, sell high' }, users: 35368, icon: ArrowDownToLine, tags: ['range'] },
  { id: 'spot-martingale', name: { zh: '现货马丁格尔', en: 'Spot martingale' }, tagline: { zh: '信号触发，分批加仓', en: 'Signal-triggered scaling in' }, users: 186048, icon: Repeat, tags: ['bull'] },
  { id: 'dca', name: { zh: '定投策略', en: 'Recurring buy' }, tagline: { zh: '定期买入，摊平成本', en: 'Buy on schedule, average your cost' }, users: 139543, icon: CalendarClock, tags: ['bull'] },
  { id: 'signal', name: { zh: '信号策略', en: 'Signal bot' }, tagline: { zh: '全自动交易，高可靠低时延', en: 'Fully automated, low latency' }, users: 75858, icon: Radio, tags: ['bull', 'bear'] },
  { id: 'iceberg', name: { zh: '冰山策略', en: 'Iceberg' }, tagline: { zh: '大单拆分，定制挂单偏好', en: 'Split large orders into small ones' }, users: 21135, icon: Snowflake, tags: ['split'] },
  { id: 'twap', name: { zh: '时间加权策略', en: 'TWAP' }, tagline: { zh: '定时下单，减少滑点', en: 'Time-sliced orders, less slippage' }, users: 15432, icon: Clock, tags: ['split'] },
]

export type Risk = 'aggressive' | 'balanced' | 'steady'

export const RISK_LABELS: Record<Risk, Text> = {
  aggressive: { zh: '进取型', en: 'Aggressive' },
  balanced: { zh: '均衡型', en: 'Balanced' },
  steady: { zh: '稳健型', en: 'Steady' },
}

export type CuratedBot = {
  pair: string
  side?: Text
  apr: number
  aum: number
  users: number
  href?: string
}

export type CuratedTheme = {
  id: string
  title: Text
  subtitle: Text
  risk: Risk
  users: number
  bots: CuratedBot[]
}

const LONG = { zh: '做多', en: 'Long' }
const SHORT = { zh: '做空', en: 'Short' }
const NEUTRAL = { zh: '中性', en: 'Neutral' }

export const CURATED_THEMES: CuratedTheme[] = [
  {
    id: 'us-stock-grid',
    title: { zh: '美股代币合约网格', en: 'US stock token futures grid' },
    subtitle: { zh: '拓展美股多元资产配置，用网格全天候赚取利润', en: 'Diversify into US equities and let a grid work around the clock' },
    risk: 'aggressive',
    users: 5405,
    bots: [
      { pair: 'TSLA/USDT', apr: 112.31, aum: 1859674.88, users: 1468, href: '/trade/XTSLAUSDT' },
      { pair: 'HOOD/USDT', apr: 248.64, aum: 314927.92, users: 207 },
      { pair: 'SPCX/USDT', apr: 5.25, aum: 1171950.73, users: 2755 },
    ],
  },
  {
    id: 'coin-hedge',
    title: { zh: '币本位套保网格', en: 'Coin-margined hedge grid' },
    subtitle: { zh: '为现货加把锁，对冲下跌风险，震荡也能赚', en: 'Lock in your spot, hedge downside, earn in ranges' },
    risk: 'steady',
    users: 381,
    bots: [
      { pair: 'BTC', side: { zh: '币本位套保', en: 'Coin hedge' }, apr: 25.34, aum: 1972037.17, users: 214, href: '/futures/BTCUSDT' },
      { pair: 'ETH', side: { zh: '币本位套保', en: 'Coin hedge' }, apr: 4.24, aum: 920610.65, users: 167, href: '/futures/ETHUSDT' },
    ],
  },
  {
    id: 'stock-spot-grid',
    title: { zh: '股票代币现货网格', en: 'Stock token spot grid' },
    subtitle: { zh: '锚定股票代币波动特性，网格自动捕捉每一次起落', en: 'Tuned to stock token volatility, catching every swing' },
    risk: 'steady',
    users: 3733,
    bots: [
      { pair: 'xNVDA/USDT', apr: 5.68, aum: 41131.36, users: 170, href: '/trade/XNVDAUSDT' },
      { pair: 'xAAPL/USDT', apr: 9.12, aum: 186402.5, users: 532, href: '/trade/XAAPLUSDT' },
      { pair: 'xGOOGL/USDT', apr: 14.37, aum: 97240.18, users: 288, href: '/trade/XGOOGLUSDT' },
      { pair: 'xMCD/USDT', apr: 6.83, aum: 52816.04, users: 141, href: '/trade/XMCDUSDT' },
    ],
  },
  {
    id: 'pre-ipo',
    title: { zh: 'Pre-IPO 合约网格', en: 'Pre-IPO futures grid' },
    subtitle: { zh: '布局明日独角兽，网格策略捕捉上市前波动', en: 'Position for tomorrow’s unicorns before they list' },
    risk: 'aggressive',
    users: 2668,
    bots: [
      { pair: 'ANTHROPIC-USDT', side: LONG, apr: 119.4, aum: 376335.21, users: 885 },
      { pair: 'OPENAI-USDT', side: LONG, apr: 1788.89, aum: 622688.25, users: 626 },
      { pair: 'ANTHROPIC-USDT', side: SHORT, apr: 592.25, aum: 125960.02, users: 1157 },
    ],
  },
  {
    id: 'metals',
    title: { zh: '贵金属合约网格', en: 'Precious metals futures grid' },
    subtitle: { zh: '把握贵金属周期，多空震荡都能赚', en: 'Ride metal cycles — long, short or sideways' },
    risk: 'aggressive',
    users: 7177,
    bots: [
      { pair: 'XAG-USDT', side: LONG, apr: 576.7, aum: 1717559.52, users: 3901 },
      { pair: 'XAU-USDT', side: LONG, apr: 49.33, aum: 1089506.16, users: 1136 },
      { pair: 'XAU-USDT', side: SHORT, apr: 46.59, aum: 766857.66, users: 734 },
      { pair: 'XAU-USDT', side: NEUTRAL, apr: 11.04, aum: 613157.01, users: 814 },
    ],
  },
]

export type LeadTrader = {
  name: string
  initials: string
  roi: number
  pnl: number
  winRate: number
  followers: number
  maxFollowers: number
  aum: number
  days: number
  curve: number[]
}

export const SPOT_LEADERS: LeadTrader[] = [
  { name: 'GridMonk', initials: 'GM', roi: 184.2, pnl: 92410.5, winRate: 78.4, followers: 412, maxFollowers: 500, aum: 1284000, days: 412, curve: [2, 4, 3, 6, 8, 7, 10, 12, 11, 15, 17, 19] },
  { name: '北岸量化', initials: '北', roi: 96.7, pnl: 41208.9, winRate: 71.2, followers: 300, maxFollowers: 300, aum: 860500, days: 268, curve: [3, 3, 5, 4, 6, 9, 8, 9, 11, 12, 12, 14] },
  { name: 'Satoshi_Lab', initials: 'SL', roi: 63.5, pnl: 18342.1, winRate: 66.9, followers: 187, maxFollowers: 400, aum: 412300, days: 190, curve: [5, 4, 6, 7, 6, 8, 9, 8, 10, 11, 10, 12] },
  { name: '慢就是快', initials: '慢', roi: 41.8, pnl: 12987.4, winRate: 82.6, followers: 96, maxFollowers: 200, aum: 238900, days: 533, curve: [4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10] },
]

export const SWAP_LEADERS: LeadTrader[] = [
  { name: 'DeltaHunter', initials: 'DH', roi: 412.6, pnl: 286103.2, winRate: 64.1, followers: 1000, maxFollowers: 1000, aum: 5120000, days: 351, curve: [2, 5, 4, 9, 7, 12, 15, 13, 18, 22, 20, 26] },
  { name: '趋势猎手', initials: '趋', roi: 238.9, pnl: 118420.7, winRate: 58.3, followers: 742, maxFollowers: 1000, aum: 2846000, days: 229, curve: [3, 2, 6, 5, 9, 8, 7, 12, 14, 13, 17, 19] },
  { name: 'FundingFarmer', initials: 'FF', roi: 87.4, pnl: 52918.3, winRate: 74.8, followers: 518, maxFollowers: 800, aum: 1932000, days: 610, curve: [4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 13] },
  { name: 'Moonwalk', initials: 'MW', roi: 59.1, pnl: 21874.6, winRate: 61.5, followers: 233, maxFollowers: 500, aum: 704800, days: 147, curve: [6, 5, 7, 6, 8, 7, 9, 10, 9, 11, 12, 12] },
]
