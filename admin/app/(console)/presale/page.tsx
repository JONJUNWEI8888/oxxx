import type { Metadata } from 'next'
import { PresalePanel } from '@/components/presale-panel'

export const metadata: Metadata = { title: '认购记录' }

export default function PresalePage() {
  return <PresalePanel />
}
