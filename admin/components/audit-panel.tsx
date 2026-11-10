'use client'

import { useState } from 'react'
import { ApiAlert } from '@/components/api-alert'
import { useApiData } from '@/components/use-api-data'
import { Button, Field, PageHeader, Pagination, TextField } from '@/components/ui/controls'
import { browserJson } from '@/lib/api/browser'
import { paths, withQuery } from '@/lib/api/paths'
import type { AuditEntry, Page } from '@/lib/api/types'
import { ROLE_LABEL, formatTime, toIso } from '@/lib/labels'

type Filters = { actorId: string; action: string; targetType: string; targetId: string; from: string; to: string }
const empty: Filters = { actorId: '', action: '', targetType: '', targetId: '', from: '', to: '' }

export function AuditPanel() {
  const [draft, setDraft] = useState<Filters>(empty)
  const [applied, setApplied] = useState<Filters>(empty)
  const [page, setPage] = useState(1)
  const key = withQuery(paths.audit, {
    actorId: applied.actorId,
    action: applied.action,
    targetType: applied.targetType,
    targetId: applied.targetId,
    from: toIso(applied.from),
    to: toIso(applied.to),
    page,
    pageSize: 20,
  })
  const state = useApiData<Page<AuditEntry>>(key, () => browserJson(key))

  return (
    <section>
      <PageHeader title="审计日志" description="登录、审核、导出和查询都会留下记录。证件号码不会写入日志。" />
      <div className="space-y-4">
        <ApiAlert error={state.error} />
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => {
          event.preventDefault()
          setPage(1)
          setApplied({ actorId: draft.actorId.trim(), action: draft.action.trim(), targetType: draft.targetType.trim(), targetId: draft.targetId.trim(), from: draft.from, to: draft.to })
        }}>
          <Field label="操作者 ID"><TextField value={draft.actorId} spellCheck={false} onChange={(event) => setDraft({ ...draft, actorId: event.target.value })} /></Field>
          <Field label="动作"><TextField value={draft.action} placeholder="例如 auth.mfa.success" spellCheck={false} onChange={(event) => setDraft({ ...draft, action: event.target.value })} /></Field>
          <Field label="对象类型"><TextField value={draft.targetType} placeholder="user、kyc、presale、admin" onChange={(event) => setDraft({ ...draft, targetType: event.target.value })} /></Field>
          <Field label="对象 ID"><TextField value={draft.targetId} spellCheck={false} onChange={(event) => setDraft({ ...draft, targetId: event.target.value })} /></Field>
          <Field label="开始时间"><TextField type="datetime-local" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /></Field>
          <Field label="结束时间"><TextField type="datetime-local" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></Field>
          <div className="flex items-end"><Button type="submit">查询</Button></div>
        </form>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-raised text-xs tracking-wide text-white/50"><tr>
              <th className="px-4 py-3 font-normal">时间</th>
              <th className="px-4 py-3 font-normal">操作者</th>
              <th className="px-4 py-3 font-normal">动作</th>
              <th className="px-4 py-3 font-normal">对象</th>
              <th className="px-4 py-3 font-normal">IP</th>
              <th className="px-4 py-3 font-normal">附加信息</th>
            </tr></thead>
            <tbody>
              {state.loading ? <tr><td colSpan={6} className="px-4 py-6 text-white/50">正在加载…</td></tr> : null}
              {!state.loading && state.data?.items.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-white/50">没有记录</td></tr> : null}
              {state.data?.items.map((row) => (
                <tr key={row.id} className="border-t border-line align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-white/70">{formatTime(row.createdAt)}</td>
                  <td className="px-4 py-3">{row.actor ? <><div>{row.actor.email}</div><div className="text-xs text-white/40">{ROLE_LABEL[row.actor.role]}</div></> : '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.action}</td>
                  <td className="px-4 py-3 text-xs text-white/70">{row.targetType ?? '—'}{row.targetId ? <div className="mt-1 break-all font-mono">{row.targetId}</div> : null}</td>
                  <td className="px-4 py-3 text-xs">{row.ip ?? '—'}</td>
                  <td className="px-4 py-3"><pre className="max-w-xs overflow-x-auto text-xs whitespace-pre-wrap text-white/55">{row.metadata == null ? '—' : JSON.stringify(row.metadata)}</pre></td>
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
