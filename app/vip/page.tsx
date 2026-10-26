import type { Metadata } from 'next'
import { VipView } from '@/components/vip/vip-view'

export const metadata: Metadata = {
  title: 'VIP 礼遇 | OXXX',
  description: 'OXXX VIP 专属礼遇：专属费率、一对一客户经理与优先通道，为专业交易者与机构打造。',
}

export default function VipPage() {
  return <VipView />
}
