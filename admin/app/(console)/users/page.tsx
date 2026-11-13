import type { Metadata } from 'next'
import { UsersPanel } from '@/components/users-panel'

export const metadata: Metadata = { title: '用户' }

export default function UsersPage() {
  return <UsersPanel />
}
