import type { Metadata } from 'next'
import { KycQueue } from '@/components/kyc-queue'

export const metadata: Metadata = { title: 'KYC 审核' }

export default function KycPage() {
  return <KycQueue />
}
