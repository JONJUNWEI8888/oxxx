import type { Metadata } from 'next'
import { SubscriberTransfers } from '@/components/subscriber-transfers'

export const metadata: Metadata = { title: '认购明细' }

export default async function SubscriberPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params
  return <SubscriberTransfers address={address} />
}
