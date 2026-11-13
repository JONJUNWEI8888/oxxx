import type { Metadata } from 'next'
import { Suspense } from 'react'
import { InvitePanel } from '@/components/invite-panel'

export const metadata: Metadata = {
  title: '绑定验证器',
  referrer: 'no-referrer',
}

export default function InvitePage() {
  return (
    <Suspense fallback={<p className="admin-backdrop grid min-h-screen place-items-center text-sm text-white/60">正在打开邀请…</p>}>
      <InvitePanel />
    </Suspense>
  )
}
