'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAdmin } from '@/components/admin-context'
import { ApiAlert, StatusNote } from '@/components/api-alert'
import { useApiData } from '@/components/use-api-data'
import { Button, Field, PageHeader, Pagination, SelectField, StatusPill, TextField } from '@/components/ui/controls'
import { browserJson } from '@/lib/api/browser'
import { ApiError } from '@/lib/api/errors'
import { paths, userActionPath, withQuery } from '@/lib/api/paths'
import type { ExchangeUser, KycStatus, Page, UserStatus } from '@/lib/api/types'
import { KYC_STATUS_LABEL, USER_STATUS_LABEL, formatTime, toIso } from '@/lib/labels'
import { can } from '@/lib/permissions'

export function UsersPanel() {
  const admin = useAdmin()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [applied, setApplied] = useState({ email: '', phone: '', createdFrom: '', createdTo: '' })
  const [status, setStatus] = useState<'' | UserStatus>('')
  const [kycStatus, setKycStatus] = useState<'' | KycStatus | 'none'>('')
  const [page, setPage] = useState(1)
  const [reason, setReason] = useState('')
  const [confirmBan, setConfirmBan] = useState<string | null>(null)
  const [actionError, setActionError] = useState<ApiError | null>(null)
  const key = withQuery(paths.users, {
    email: applied.email,
    phone: applied.phone,
    status,
    kycStatus,
    createdFrom: toIso(applied.createdFrom),
    createdTo: toIso(applied.createdTo),
    page,
    pageSize: 20,
  })
  const state = useApiData<Page<ExchangeUser>>(key, () => browserJson(key))

  async function changeStatus(id: string, action: 'freeze' | 'unfreeze' | 'ban') {
    if (action === 'ban' && confirmBan !== id) {
      setConfirmBan(id)
      return
    }
    setActionError(null)
    try {
      await browserJson(userActionPath(id, action), { method: 'POST', body: reason.trim() ? { reason: reason.trim() } : {} })
      setConfirmBan(null)
      state.reload()
    } catch (reasonError) {
      setActionError(reasonError instanceof ApiError ? reasonError : new ApiError(503, 'backend_unavailable', 'down', 5))
    }
  }

  return (
    <section>
      <PageHeader title="用户" description="邮箱和手机号是精确匹配。客服看到的是接口打码后的值。" />
      <div className="space-y-4">
        {admin.role === 'support' ? <StatusNote>当前是客服角色。邮箱和手机号由接口打码后返回，页面不会再还原。</StatusNote> : null}
        <ApiAlert error={state.error ?? actionError} />
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setPage(1); setApplied({ email: email.trim(), phone: phone.trim(), createdFrom, createdTo }) }}>
          <Field label="邮箱" hint="精确匹配，不区分大小写"><TextField value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Field label="手机号" hint="与入库字符串一致"><TextField value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
          <Field label="状态">
            <SelectField value={status} onChange={(event) => { setStatus(event.target.value as '' | UserStatus); setPage(1) }}>
              <option value="">全部</option>
              <option value="active">正常</option>
              <option value="frozen">已冻结</option>
              <option value="banned">已封禁</option>
            </SelectField>
          </Field>
          <Field label="KYC">
            <SelectField value={kycStatus} onChange={(event) => { setKycStatus(event.target.value as '' | KycStatus | 'none'); setPage(1) }}>
              <option value="">全部</option>
              <option value="none">未提交</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </SelectField>
          </Field>
          <Field label="注册自"><TextField type="datetime-local" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} /></Field>
          <Field label="注册至"><TextField type="datetime-local" value={createdTo} onChange={(event) => setCreatedTo(event.target.value)} /></Field>
          <div className="flex items-end"><Button type="submit">查询</Button></div>
          <div className="md:col-span-2">
            <Field label="操作原因" hint="冻结、解冻、封禁时写入审计日志，可以留空"><TextField value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
          </div>
        </form>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-raised text-xs tracking-wide text-white/50">
              <tr>
                <th className="px-4 py-3 font-normal">邮箱</th>
                <th className="px-4 py-3 font-normal">手机</th>
                <th className="px-4 py-3 font-normal">状态</th>
                <th className="px-4 py-3 font-normal">KYC</th>
                <th className="px-4 py-3 font-normal">注册时间</th>
                <th className="px-4 py-3 font-normal">操作</th>
              </tr>
            </thead>
            <tbody>
              {state.loading ? <tr><td className="px-4 py-6 text-white/50" colSpan={6}>正在加载…</td></tr> : null}
              {!state.loading && state.data?.items.length === 0 ? <tr><td className="px-4 py-6 text-white/50" colSpan={6}>没有记录</td></tr> : null}
              {state.data?.items.map((user) => (
                <tr key={user.id} className="border-t border-line">
                  <td className="px-4 py-3"><Link href={`/users/${user.id}`} className="text-gold-light">{user.email}</Link></td>
                  <td className="px-4 py-3 text-white/80">{user.phone ?? '—'}</td>
                  <td className="px-4 py-3"><StatusPill value={user.status} label={USER_STATUS_LABEL[user.status]} /></td>
                  <td className="px-4 py-3 text-white/60">{user.kyc ? KYC_STATUS_LABEL[user.kyc.status] : '未提交'}</td>
                  <td className="px-4 py-3 text-white/60">{formatTime(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {can(admin.permissions, 'users.freeze') && user.status === 'active' ? <Button variant="quiet" onClick={() => void changeStatus(user.id, 'freeze')}>冻结</Button> : null}
                      {can(admin.permissions, 'users.unfreeze') && user.status === 'frozen' ? <Button variant="quiet" onClick={() => void changeStatus(user.id, 'unfreeze')}>解冻</Button> : null}
                      {can(admin.permissions, 'users.ban') && user.status !== 'banned' ? <Button variant="quiet" onClick={() => void changeStatus(user.id, 'ban')}>{confirmBan === user.id ? '确认封禁' : '封禁'}</Button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {state.data ? <Pagination page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onPage={setPage} /> : null}
      </div>
    </section>
  )
}
