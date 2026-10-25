import type { Metadata } from 'next'
import { WorldMonitorView } from '@/components/market/world-monitor-view'

export const metadata: Metadata = {
  title: '全球市场态势 | OXXX',
  description: 'OXXX 全球市场态势：冲突、天气、航运要道与经济中心实时地图。',
}

export default function MarketPage() {
  return <WorldMonitorView />
}
