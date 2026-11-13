import type { Metadata } from 'next'
import { AdminsPanel } from '@/components/admins-panel'

export const metadata: Metadata = { title: '管理员' }

export default function AdminsPage() {
  return <AdminsPanel />
}
