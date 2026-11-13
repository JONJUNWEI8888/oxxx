import type { Metadata } from 'next'
import { LoginPanel } from '@/components/login-panel'

export const metadata: Metadata = { title: '登录' }

export default function LoginPage() {
  return <LoginPanel />
}
