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

export const IN_DEV: Text = { zh: '正在开发', en: 'In development' }

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
  icon: LucideIcon
  tags: BotFilter[]
  badge?: string
}

export const BOT_TOOLS: BotTool[] = [
  { id: 'spot-grid', name: { zh: '现货网格', en: 'Spot grid' }, tagline: { zh: '低买高卖，震荡向上行情', en: 'Buy low, sell high in rising ranges' }, icon: Grid3x3, tags: ['bull', 'range'] },
  { id: 'futures-grid', name: { zh: '合约网格', en: 'Futures grid' }, tagline: { zh: '循环套利，可加杠杆，牛熊皆宜', en: 'Loop arbitrage with leverage, any market' }, icon: Layers, tags: ['bull', 'bear', 'range'] },
  { id: 'coin-grid', name: { zh: '合约网格 (币本位)', en: 'Coin-margined grid' }, tagline: { zh: '循环套利，以币结算', en: 'Loop arbitrage, settled in coin' }, icon: Blocks, tags: ['bull', 'range'] },
  { id: 'portfolio', name: { zh: '智能组合', en: 'Smart portfolio' }, tagline: { zh: '多币组合，动态调仓', en: 'Multi-coin basket, auto rebalanced' }, icon: Shuffle, tags: ['bull'], badge: 'New' },
  { id: 'futures-martingale', name: { zh: '合约马丁格尔', en: 'Futures martingale' }, tagline: { zh: '高抛低吸，分批进场', en: 'Scale in on dips, exit on rallies' }, icon: TrendingDown, tags: ['bull', 'bear'] },
  { id: 'arbitrage', name: { zh: '智能套利', en: 'Smart arbitrage' }, tagline: { zh: '一键套利，智能对冲', en: 'One-click hedged arbitrage' }, icon: Scale, tags: ['range'], badge: 'TradFi' },
  { id: 'dip-buy', name: { zh: '抄底止盈策略', en: 'Buy the dip' }, tagline: { zh: '双币理财，买低卖高，循环套利', en: 'Dual-asset loops: buy low, sell high' }, icon: ArrowDownToLine, tags: ['range'] },
  { id: 'spot-martingale', name: { zh: '现货马丁格尔', en: 'Spot martingale' }, tagline: { zh: '信号触发，分批加仓', en: 'Signal-triggered scaling in' }, icon: Repeat, tags: ['bull'] },
  { id: 'dca', name: { zh: '定投策略', en: 'Recurring buy' }, tagline: { zh: '定期买入，摊平成本', en: 'Buy on schedule, average your cost' }, icon: CalendarClock, tags: ['bull'] },
  { id: 'signal', name: { zh: '信号策略', en: 'Signal bot' }, tagline: { zh: '全自动交易，高可靠低时延', en: 'Fully automated, low latency' }, icon: Radio, tags: ['bull', 'bear'] },
  { id: 'iceberg', name: { zh: '冰山策略', en: 'Iceberg' }, tagline: { zh: '大单拆分，定制挂单偏好', en: 'Split large orders into small ones' }, icon: Snowflake, tags: ['split'] },
  { id: 'twap', name: { zh: '时间加权策略', en: 'TWAP' }, tagline: { zh: '定时下单，减少滑点', en: 'Time-sliced orders, less slippage' }, icon: Clock, tags: ['split'] },
]

export type Risk = 'aggressive' | 'balanced' | 'steady'

export const RISK_LABELS: Record<Risk, Text> = {
  aggressive: { zh: '进取型', en: 'Aggressive' },
  balanced: { zh: '均衡型', en: 'Balanced' },
  steady: { zh: '稳健型', en: 'Steady' },
}

export type AssetBrand = { name: string; logo?: string; mark?: string }

export const ASSET_BRANDS: Record<string, AssetBrand> = {
  TSLA: { name: 'Tesla', logo: '/logos/tesla.svg' },
  HOOD: { name: 'Robinhood', logo: '/logos/robinhood.svg' },
  SPCX: { name: 'SpaceX', logo: '/logos/spacex.svg' },
  NVDA: { name: 'NVIDIA', logo: '/logos/nvidia.svg' },
  AAPL: { name: 'Apple', logo: '/logos/apple.svg' },
  GOOGL: { name: 'Alphabet', logo: '/logos/google.svg' },
  MCD: { name: "McDonald's", logo: '/logos/mcdonalds.svg' },
  ANTHROPIC: { name: 'Anthropic', logo: '/logos/anthropic.svg' },
  OPENAI: { name: 'OpenAI', logo: '/logos/openai.svg' },
  BTC: { name: 'Bitcoin', logo: '/logos/bitcoin.svg' },
  ETH: { name: 'Ethereum', logo: '/logos/ethereum.svg' },
  XAU: { name: 'Gold', mark: 'Au' },
  XAG: { name: 'Silver', mark: 'Ag' },
}

export type CuratedBot = {
  asset: keyof typeof ASSET_BRANDS
  pair: string
  side?: Text
  href?: string
}

export type CuratedTheme = {
  id: string
  title: Text
  subtitle: Text
  risk: Risk
  bots: CuratedBot[]
}

const LONG = { zh: '做多', en: 'Long' }
const SHORT = { zh: '做空', en: 'Short' }
const NEUTRAL = { zh: '中性', en: 'Neutral' }
const COIN_HEDGE = { zh: '币本位套保', en: 'Coin hedge' }

export const CURATED_THEMES: CuratedTheme[] = [
  {
    id: 'us-stock-grid',
    title: { zh: '美股代币合约网格', en: 'US stock token futures grid' },
    subtitle: { zh: '拓展美股多元资产配置，用网格全天候赚取利润', en: 'Diversify into US equities and let a grid work around the clock' },
    risk: 'aggressive',
    bots: [
      { asset: 'TSLA', pair: 'TSLA/USDT', href: '/trade/XTSLAUSDT' },
      { asset: 'HOOD', pair: 'HOOD/USDT' },
      { asset: 'SPCX', pair: 'SPCX/USDT' },
    ],
  },
  {
    id: 'coin-hedge',
    title: { zh: '币本位套保网格', en: 'Coin-margined hedge grid' },
    subtitle: { zh: '为现货加把锁，对冲下跌风险，震荡也能赚', en: 'Lock in your spot, hedge downside, earn in ranges' },
    risk: 'steady',
    bots: [
      { asset: 'BTC', pair: 'BTC', side: COIN_HEDGE, href: '/futures/BTCUSDT' },
      { asset: 'ETH', pair: 'ETH', side: COIN_HEDGE, href: '/futures/ETHUSDT' },
    ],
  },
  {
    id: 'stock-spot-grid',
    title: { zh: '股票代币现货网格', en: 'Stock token spot grid' },
    subtitle: { zh: '锚定股票代币波动特性，网格自动捕捉每一次起落', en: 'Tuned to stock token volatility, catching every swing' },
    risk: 'steady',
    bots: [
      { asset: 'NVDA', pair: 'xNVDA/USDT', href: '/trade/XNVDAUSDT' },
      { asset: 'AAPL', pair: 'xAAPL/USDT', href: '/trade/XAAPLUSDT' },
      { asset: 'GOOGL', pair: 'xGOOGL/USDT', href: '/trade/XGOOGLUSDT' },
      { asset: 'MCD', pair: 'xMCD/USDT', href: '/trade/XMCDUSDT' },
    ],
  },
  {
    id: 'pre-ipo',
    title: { zh: 'Pre-IPO 合约网格', en: 'Pre-IPO futures grid' },
    subtitle: { zh: '布局明日独角兽，网格策略捕捉上市前波动', en: 'Position for tomorrow’s unicorns before they list' },
    risk: 'aggressive',
    bots: [
      { asset: 'ANTHROPIC', pair: 'ANTHROPIC-USDT', side: LONG },
      { asset: 'OPENAI', pair: 'OPENAI-USDT', side: LONG },
      { asset: 'ANTHROPIC', pair: 'ANTHROPIC-USDT', side: SHORT },
    ],
  },
  {
    id: 'metals',
    title: { zh: '贵金属合约网格', en: 'Precious metals futures grid' },
    subtitle: { zh: '把握贵金属周期，多空震荡都能赚', en: 'Ride metal cycles — long, short or sideways' },
    risk: 'aggressive',
    bots: [
      { asset: 'XAG', pair: 'XAG-USDT', side: LONG },
      { asset: 'XAU', pair: 'XAU-USDT', side: LONG },
      { asset: 'XAU', pair: 'XAU-USDT', side: SHORT },
      { asset: 'XAU', pair: 'XAU-USDT', side: NEUTRAL },
    ],
  },
]

export type CopyStyle = { id: string; title: Text; desc: Text }

export const SPOT_COPY_STYLES: CopyStyle[] = [
  { id: 'spot-grid', title: { zh: '网格型带单员', en: 'Grid leaders' }, desc: { zh: '以现货网格为主，适合震荡行情', en: 'Spot-grid focused, built for ranging markets' } },
  { id: 'spot-trend', title: { zh: '趋势型带单员', en: 'Trend leaders' }, desc: { zh: '顺势建仓，捕捉主升浪', en: 'Ride the trend and catch major moves' } },
  { id: 'spot-value', title: { zh: '价值型带单员', en: 'Value leaders' }, desc: { zh: '长期持有优质资产', en: 'Long-term holds of quality assets' } },
  { id: 'spot-stock', title: { zh: '美股代币带单员', en: 'Stock token leaders' }, desc: { zh: '专注 xAAPL、xNVDA 等股票代币', en: 'Focused on xAAPL, xNVDA and other stock tokens' } },
]

export const SWAP_COPY_STYLES: CopyStyle[] = [
  { id: 'swap-trend', title: { zh: '趋势型带单员', en: 'Trend leaders' }, desc: { zh: '杠杆顺势，严格止损', en: 'Leveraged trend trading with tight stops' } },
  { id: 'swap-scalp', title: { zh: '短线型带单员', en: 'Scalpers' }, desc: { zh: '高频进出，日内交易', en: 'High-frequency intraday trading' } },
  { id: 'swap-funding', title: { zh: '套利型带单员', en: 'Arbitrage leaders' }, desc: { zh: '资金费率与跨期套利', en: 'Funding-rate and calendar arbitrage' } },
  { id: 'swap-hedge', title: { zh: '对冲型带单员', en: 'Hedge leaders' }, desc: { zh: '多空对冲，控制回撤', en: 'Long/short hedging to limit drawdowns' } },
]
