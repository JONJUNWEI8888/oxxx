'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAdmin } from '@/components/admin-context'
import { ApiAlert, StatusNote } from '@/components/api-alert'
import { useApiData } from '@/components/use-api-data'
import { Button, PageHeader, StatusPill, TextField } from '@/components/ui/controls'
import { browserJson } from '@/lib/api/browser'
import { ApiError } from '@/lib/api/errors'
import { userActionPath, userPath } from '@/lib/api/paths'
import type { ExchangeUser } from '@/lib/api/types'
import { KYC_LEVEL_LABEL, KYC_STATUS_LABEL, USER_STATUS_LABEL, formatTime } from '@/lib/labels'
import { can } from '@/lib/permissions'

export function UserDetail({ id }: { id: string }) {
  const admin = useAdmin()
  const state = useApiData<ExchangeUser>(id, () => browserJson(userPath(id)))
  const [reason, setReason] = useState('')
  const [confirmBan, setConfirmBan] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const user = state.data

  async function changeStatus(action: 'freeze' | 'unfreeze' | 'ban') {
    if (action === 'ban' && !confirmBan) {
      setConfirmBan(true)
      return
    }
    setError(null)
    try {
      const next = await browserJson<ExchangeUser>(userActionPath(id, action), { method: 'POST', body: reason.trim() ? { reason: reason.trim() } : {} })
      setConfirmBan(false)
      state.setData({ ...next, kyc: user?.kyc ?? next.kyc ?? null })
    } catch (reasonError) {
      setError(reasonError instanceof ApiError ? reasonError : new ApiError(503, 'backend_unavailable', 'down', 5))
    }
  }

  return (
    <section>
      <PageHeader title="用户详情" description={id} actions={<Link href="/users" className="text-sm text-gold-light">返回列表</Link>} />
      <div className="space-y-4">
        {admin.role === 'support' ? <StatusNote>客服看到的邮箱和手机号是接口返回的打码值。</StatusNote> : null}
        <ApiAlert error={state.error ?? error} />
        {state.loading ? <p className="text-sm text-white/50">正在加载…</p> : null}
        {user ? (
          <div className="grid gap-4 rounded-xl border border-line bg-panel p-5 md:grid-cols-2">
            <Info label="邮箱" value={user.email} />
            <Info label="手机" value={user.phone ?? '—'} />
            <div><p className="text-xs text-white/45">状态</p><div className="mt-2"><StatusPill value={user.status} label={USER_STATUS_LABEL[user.status]} /></div></div>
            <Info label="最近登录" value={formatTime(user.lastLoginAt)} />
            <Info label="注册时间" value={formatTime(user.createdAt)} />
            <div>
              <p className="text-xs text-white/45">最近 KYC</p>
              <p className="mt-2 text-sm">{user.kyc ? `${KYC_LEVEL_LABEL[user.kyc.level]} · ${KYC_STATUS_LABEL[user.kyc.status]}` : '无'}</p>
              {user.kyc && can(admin.permissions, 'kyc.read') ? <Link href={`/kyc/${user.kyc.id}`} className="mt-1 inline-block text-sm text-gold-light">打开申请</Link> : null}
            </div>
            <div className="md:col-span-2"><label className="flex flex-col gap-2 text-xs text-white/60">操作原因<TextField value={reason} onChange={(event) => setReason(event.target.value)} /></label></div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              {can(admin.permissions, 'users.freeze') && user.status === 'active' ? <Button variant="ghost" onClick={() => void changeStatus('freeze')}>冻结</Button> : null}
              {can(admin.permissions, 'users.unfreeze') && user.status === 'frozen' ? <Button variant="ghost" onClick={() => void changeStatus('unfreeze')}>解冻</Button> : null}
              {can(admin.permissions, 'users.ban') && user.status !== 'banned' ? <Button variant="danger" onClick={() => void changeStatus('ban')}>{confirmBan ? '确认封禁' : '封禁'}</Button> : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-white/45">{label}</p><p className="mt-2 text-sm break-all">{value}</p></div>
}
