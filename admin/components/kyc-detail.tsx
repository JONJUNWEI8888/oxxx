'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAdmin } from '@/components/admin-context'
import { ApiAlert, StatusNote } from '@/components/api-alert'
import { useApiData } from '@/components/use-api-data'
import { Button, PageHeader, StatusPill, TextArea } from '@/components/ui/controls'
import { browserJson } from '@/lib/api/browser'
import { ApiError } from '@/lib/api/errors'
import { kycActionPath, kycPath } from '@/lib/api/paths'
import type { KycDetail, KycSummary } from '@/lib/api/types'
import { DOCUMENT_LABEL, KYC_LEVEL_LABEL, KYC_STATUS_LABEL, ROLE_LABEL, formatTime } from '@/lib/labels'
import { can } from '@/lib/permissions'
import { safeHttpUrl } from '@/lib/safe-url'

export function KycDetail({ id }: { id: string }) {
  const admin = useAdmin()
  const state = useApiData<KycDetail>(id, () => browserJson(kycPath(id)))
  const [reason, setReason] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [pending, setPending] = useState(false)
  const application = state.data
  const canReview = can(admin.permissions, 'kyc.review') && application?.status === 'pending'

  async function review(action: 'approve' | 'reject') {
    setPending(true)
    setError(null)
    try {
      const next = await browserJson<KycSummary>(kycActionPath(id, action), {
        method: 'POST',
        body: action === 'reject' ? { reason: reason.trim() } : {},
      })
      if (application) state.setData({ ...application, ...next })
    } catch (reasonError) {
      setError(reasonError instanceof ApiError ? reasonError : new ApiError(503, 'backend_unavailable', 'down', 5))
    } finally {
      setPending(false)
    }
  }

  function openDocument(url: string) {
    const safe = safeHttpUrl(url)
    if (!safe) {
      setError(new ApiError(502, 'backend_unavailable', 'bad url', null))
      return
    }
    const link = document.createElement('a')
    link.href = safe
    link.target = '_blank'
    link.rel = 'noreferrer'
    link.click()
  }

  return (
    <section>
      <PageHeader title="KYC 详情" description={id} actions={<Link href="/kyc" className="text-sm text-gold-light">返回队列</Link>} />
      <div className="space-y-4">
        <ApiAlert error={state.error ?? error} />
        {state.loading ? <p className="text-sm text-white/50">正在加载…</p> : null}
        {application ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill value={application.status} label={KYC_STATUS_LABEL[application.status]} />
              <span className="text-sm text-white/60">{KYC_LEVEL_LABEL[application.level]}</span>
              <span className="text-sm text-white/40">{formatTime(application.submittedAt)}</span>
            </div>
            <div className="grid gap-4 rounded-xl border border-line bg-panel p-5 md:grid-cols-2">
              <Item label="姓名" value={application.personal.legalName} />
              <Item label="出生日期" value={application.personal.dateOfBirth} />
              <Item label="国家" value={application.personal.country} />
              <Item label="证件类型" value={DOCUMENT_LABEL[application.personal.documentType]} />
              <Item label="证件号码" value={application.personal.documentNumber} />
              <Item label="地址" value={application.personal.address || '—'} />
              <Item label="用户 ID" value={application.userId} />
              <Item label="审核人" value={application.reviewer?.email ?? '—'} />
              {application.rejectReason ? <Item label="拒绝原因" value={application.rejectReason} /> : null}
            </div>
            <div>
              <h2 className="text-sm text-white/70">证件</h2>
              {(application.documents ?? []).length === 0 ? <p className="mt-2 text-sm text-white/45">没有上传证件</p> : (
                <ul className="mt-2 space-y-2">
                  {application.documents.map((doc) => (
                    <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                      <span className="text-sm">{doc.fileName}</span>
                      <Button variant="ghost" className="h-9" disabled={!doc.download?.url} onClick={() => doc.download?.url && openDocument(doc.download.url)}>查看</Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {(application.history ?? []).length > 0 ? (
              <div>
                <h2 className="text-sm text-white/70">审核记录</h2>
                <ul className="mt-2 space-y-2 text-sm">
                  {application.history.map((event) => (
                    <li key={event.id} className="rounded-lg border border-line px-3 py-2">
                      <span className="font-mono text-xs">{event.action}</span>
                      <span className="ml-3 text-white/50">{formatTime(event.createdAt)}</span>
                      {event.actor ? <span className="ml-3 text-white/50">{event.actor.email} · {ROLE_LABEL[event.actor.role]}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {canReview ? (
              <form className="space-y-3 rounded-xl border border-line p-5" onSubmit={(event) => { event.preventDefault(); void review('reject') }}>
                <h2 className="text-sm">审核</h2>
                <TextArea aria-label="拒绝原因" placeholder="拒绝原因，至少 2 个字" value={reason} onChange={(event) => setReason(event.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button disabled={pending} onClick={() => void review('approve')}>通过</Button>
                  <Button type="submit" variant="danger" disabled={pending || reason.trim().length < 2}>拒绝</Button>
                </div>
              </form>
            ) : <StatusNote>{can(admin.permissions, 'kyc.review') ? '该申请已经审核过。' : '当前角色不能审核 KYC。'}</StatusNote>}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-white/45">{label}</p><p className="mt-2 text-sm break-all">{value}</p></div>
}
