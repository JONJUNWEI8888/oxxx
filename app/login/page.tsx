import type { Metadata } from 'next'
import { LoginView } from '@/components/auth/login-view'

export const metadata: Metadata = {
  title: '登录 | OXXX',
  description: '登录 OXXX，为专业级投资者打造的加密友好型交易平台。',
}

export default function LoginPage() {
  return <LoginView />
}
