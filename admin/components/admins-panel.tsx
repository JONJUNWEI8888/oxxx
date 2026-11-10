'use client'

import { useState } from 'react'
import { useAdmin } from '@/components/admin-context'
import { ApiAlert, StatusNote } from '@/components/api-alert'
import { useApiData } from '@/components/use-api-data'
import { Button, Field, PageHeader, Pagination, SelectField, StatusPill, TextField } from '@/components/ui/controls'
import { browserJson } from '@/lib/api/browser'
import { ApiError } from '@/lib/api/errors'
import { adminDisablePath, adminPath, paths, withQuery } from '@/lib/api/paths'
import type { AdminAccount, AdminRole, InviteResult, Page } from '@/lib/api/types'
import { ROLE_LABEL, formatTime } from '@/lib/labels'
import { can } from '@/lib/permissions'

export function AdminsPanel() {
  const admin = useAdmin()
  const [role, setRole] = useState<'' | AdminRole>('')
  const [status, setStatus] = useState<'' | 'active' | 'disabled'>('')
  const [page, setPage] = useState(1)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<AdminRole>('support')
  const [invite, setInvite] = useState<InviteResult | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [reason, setReason] = useState('')
  const key = withQuery(paths.admins, { role, status, page, pageSize: 20 })
  const state = useApiData<Page<AdminAccount>>(key, () => browserJson(key))
  const link = invite ? `${window.location.origin}/invite?token=${invite.token}` : ''

  async function createInvite(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const created = await browserJson<InviteResult>(paths.adminInvites, { method: 'POST', body: { email, role: inviteRole } })
      setInvite({ token: created.token, email: created.email, role: created.role, expiresInSec: created.expiresInSec })
      setEmail('')
    } catch (reasonError) {
      setError(reasonError instanceof ApiError ? reasonError : new ApiError(503, 'backend_unavailable', 'down', 5))
    }
  }

  async function changeRole(id: string, nextRole: AdminRole) {
    setError(null)
    try {
      await browserJson(adminPath(id), { method: 'PATCH', body: { role: nextRole } })
      state.reload()
    } catch (reasonError) {
      setError(reasonError instanceof ApiError ? reasonError : new ApiError(503, 'backend_unavailable', 'down', 5))
    }
  }

  async function disable(id: string) {
    setError(null)
    try {
      await browserJson(adminDisablePath(id), { method: 'POST', body: reason.trim() ? { reason: reason.trim() } : {} })
      state.reload()
    } catch (reasonError) {
      setError(reasonError instanceof ApiError ? reasonError : new ApiError(503, 'backend_unavailable', 'down', 5))
    }
  }

  return (
    <section>
      <PageHeader title="管理员" description="超级管理员可以邀请、调整角色和禁用账号。会话由接口作废。" />
      <div className="space-y-6">
        <ApiAlert error={state.error ?? error} />
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="角色">
            <SelectField value={role} onChange={(event) => { setRole(event.target.value as '' | AdminRole); setPage(1) }}>
              <option value="">全部</option>
              <option value="super_admin">超级管理员</option>
              <option value="kyc_reviewer">KYC 审核员</option>
              <option value="support">客服</option>
            </SelectField>
          </Field>
          <Field label="状态">
            <SelectField value={status} onChange={(event) => { setStatus(event.target.value as '' | 'active' | 'disabled'); setPage(1) }}>
              <option value="">全部</option>
              <option value="active">启用</option>
              <option value="disabled">已禁用</option>
            </SelectField>
          </Field>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-raised text-xs text-white/50"><tr>
              <th className="px-4 py-3 font-normal">邮箱</th>
              <th className="px-4 py-3 font-normal">角色</th>
              <th className="px-4 py-3 font-normal">状态</th>
              <th className="px-4 py-3 font-normal">最近登录</th>
              <th className="px-4 py-3 font-normal">操作</th>
            </tr></thead>
            <tbody>
              {state.loading ? <tr><td colSpan={5} className="px-4 py-6 text-white/50">正在加载…</td></tr> : null}
              {!state.loading && state.data?.items.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-white/50">没有记录</td></tr> : null}
              {state.data?.items.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{ROLE_LABEL[row.role]}</td>
                  <td className="px-4 py-3"><StatusPill value={row.status === 'active' ? 'active' : 'banned'} label={row.status === 'active' ? '启用' : '已禁用'} /></td>
                  <td className="px-4 py-3 text-white/60">{formatTime(row.lastLoginAt)}</td>
                  <td className="px-4 py-3">
                    {can(admin.permissions, 'admins.update') && row.id !== admin.id && row.status === 'active' ? (
                      <div className="flex flex-wrap gap-2">
                        <SelectField className="h-9 w-36" value={row.role} aria-label={`调整 ${row.email} 的角色`} onChange={(event) => void changeRole(row.id, event.target.value as AdminRole)}>
                          <option value="super_admin">超级管理员</option>
                          <option value="kyc_reviewer">KYC 审核员</option>
                          <option value="support">客服</option>
                        </SelectField>
                        <Button variant="danger" className="h-9" onClick={() => void disable(row.id)}>禁用</Button>
                      </div>
                    ) : <span className="text-white/40">{row.id === admin.id ? '当前账号' : '—'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {state.data ? <Pagination page={state.data.page} pageSize={state.data.pageSize} total={state.data.total} onPage={setPage} /> : null}
        {can(admin.permissions, 'admins.invite') ? (
          <form className="max-w-xl space-y-4" onSubmit={(event) => void createInvite(event)}>
            <h2 className="text-sm text-white/70">邀请新管理员</h2>
            <Field label="邮箱"><TextField type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
            <Field label="角色">
              <SelectField value={inviteRole} onChange={(event) => setInviteRole(event.target.value as AdminRole)}>
                <option value="support">客服</option>
                <option value="kyc_reviewer">KYC 审核员</option>
                <option value="super_admin">超级管理员</option>
              </SelectField>
            </Field>
            <Field label="禁用原因" hint="禁用时写入审计，可以留空"><TextField value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
            <Button type="submit">创建邀请</Button>
          </form>
        ) : null}
        {invite ? (
          <div className="max-w-xl space-y-3 rounded-xl border border-gold/30 bg-gold/5 p-4">
            <StatusNote>邀请链接只在这次响应里出现，24 小时内有效。</StatusNote>
            <TextField readOnly value={link} aria-label="邀请链接" spellCheck={false} />
          </div>
        ) : null}
      </div>
    </section>
  )
}
