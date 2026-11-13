'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ApiAlert } from '@/components/api-alert'
import { useApiData } from '@/components/use-api-data'
import { Button, Field, PageHeader, Pagination, SelectField, StatusPill } from '@/components/ui/controls'
import { browserJson } from '@/lib/api/browser'
import { paths, withQuery } from '@/lib/api/paths'
import type { KycLevel, KycStatus, KycSummary, Page } from '@/lib/api/types'
import { KYC_LEVEL_LABEL, KYC_STATUS_LABEL, formatTime } from '@/lib/labels'

export function KycQueue() {
  const [view, setView] = useState<'queue' | 'history'>('queue')
  const [status, setStatus] = useState<'' | KycStatus>('pending')
  const [level, setLevel] = useState<'' | KycLevel>('')
  const [page, setPage] = useState(1)
  const key = withQuery(view === 'queue' ? paths.kyc : paths.kycHistory, {
    status: view === 'history' && !status ? undefined : status,
    level: view === 'queue' ? level : undefined,
    page,
    pageSize: 20,
  })
  const state = useApiData<Page<KycSummary>>(key, () => browserJson(key))

  return (
    <section>
      <PageHeader title="KYC 审核" description="待审核申请按提交时间排列。通过或拒绝只对 pending 状态生效。" />
      <div className="space-y-4">
        <ApiAlert error={state.error} />
        <div className="flex gap-2">
          <Button variant={view === 'queue' ? 'primary' : 'ghost'} onClick={() => { setView('queue'); setPage(1) }}>待审队列</Button>
          <Button variant={view === 'history' ? 'primary' : 'ghost'} onClick={() => { setView('history'); setStatus(''); setPage(1) }}>已审核</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="状态">
            <SelectField value={status} onChange={(event) => { setStatus(event.target.value as '' | KycStatus); setPage(1) }}>
              <option value="">全部</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
            </SelectField>
          </Field>
          {view === 'queue' ? (
            <Field label="等级">
              <SelectField value={level} onChange={(event) => { setLevel(event.target.value as '' | KycLevel); setPage(1) }}>
                <option value="">全部</option>
                <option value="basic">基础</option>
                <option value="advanced">进阶</option>
                <option value="enhanced">增强</option>
              </SelectField>
            </Field>
          ) : null}
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-raised text-xs tracking-wide text-white/50">
              <tr>
                <th className="px-4 py-3 font-normal">提交时间</th>
                <th className="px-4 py-3 font-normal">等级</th>
                <th className="px-4 py-3 font-normal">状态</th>
                <th className="px-4 py-3 font-normal">用户</th>
                <th className="px-4 py-3 font-normal">拒绝原因</th>
              </tr>
            </thead>
            <tbody>
              {state.loading ? <tr><td colSpan={5} className="px-4 py-6 text-white/50">正在加载…</td></tr> : null}
              {!state.loading && state.data?.items.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-white/50">没有记录</td></tr> : null}
              {state.data?.items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="px-4 py-3"><Link href={`/kyc/${item.id}`} className="text-gold-light">{formatTime(item.submittedAt)}</Link></td>
                  <td className="px-4 py-3">{KYC_LEVEL_LABEL[item.level]}</td>
                  <td className="px-4 py-3"><StatusPill value={item.status} label={KYC_STATUS_LABEL[item.status]} /></td>
                  <td className="px-4 py-3 font-mono text-xs text-white/70">{item.userId}</td>
                  <td className="px-4 py-3 text-white/60">{item.rejectReason ?? '—'}</td>
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
