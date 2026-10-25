import type { Metadata } from 'next'
import { RegisterView } from '@/components/auth/register-view'

export const metadata: Metadata = {
  title: '注册 | OXXX',
  description: '注册 OXXX 个人或企业账户，开启专业级加密友好型证券交易。',
}

export default function RegisterPage() {
  return <RegisterView />
}
