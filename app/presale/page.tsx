import type { Metadata } from 'next'
import { MySubscription } from '@/components/presale/my-subscription'

export const metadata: Metadata = {
  title: '我的认购 | OXXX',
  description: '按钱包地址查询您自己的 OX 私募认购记录和合计。',
}

export default function PresaleLookupPage() {
  return <MySubscription />
}
