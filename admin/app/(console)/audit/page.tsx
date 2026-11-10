import type { Metadata } from 'next'
import { AuditPanel } from '@/components/audit-panel'

export const metadata: Metadata = { title: '审计日志' }

export default function AuditPage() {
  return <AuditPanel />
}
