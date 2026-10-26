import type { Metadata } from 'next'
import { TradfiView } from '@/components/tradfi/tradfi-view'

export const metadata: Metadata = {
  title: 'TradFi 代币化股票 | OXXX',
  description: '使用 USDT 7×24 小时交易苹果、英伟达、谷歌、特斯拉、麦当劳等代币化美股。',
}

export default function TradfiPage() {
  return <TradfiView />
}
