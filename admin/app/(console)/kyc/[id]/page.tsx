import type { Metadata } from 'next'
import { KycDetail } from '@/components/kyc-detail'

export const metadata: Metadata = { title: 'KYC 详情' }

export default async function KycDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <KycDetail id={id} />
}
