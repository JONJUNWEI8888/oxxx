import type { Metadata } from 'next'
import { TradingBotView } from '@/components/trading-bot/trading-bot-view'

export const metadata: Metadata = {
  title: '策略交易 · 精选策略与跟单 | OXXX',
  description: '网格、马丁格尔、定投、套利等自动化交易策略，或一键跟随顶级交易员。',
}

export default function TradingBotPage() {
  return <TradingBotView />
}
