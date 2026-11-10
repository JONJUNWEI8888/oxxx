'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ApiAlert } from '@/components/api-alert'
import { useApiData } from '@/components/use-api-data'
import { PageHeader, Pagination } from '@/components/ui/controls'
import { browserJson } from '@/lib/api/browser'
import { subscriberTransfersPath, withQuery } from '@/lib/api/paths'
import type { TransferPage } from '@/lib/api/types'
import { formatTime, formatUsdt } from '@/lib/labels'

export function SubscriberTransfers({ address }: { address: string }) {
  const [page, setPage] = useState(1)
  const [includePending, setIncludePending] = useState(false)
  const key = withQuery(subscriberTransfersPath(address), { includePending, page, pageSize: 20 })
  const state = useApiData<TransferPage>(key, () => browserJson(key))
  return (
    <section>
      <PageHeader title="认购明细" description={address} actions={<Link href="/presale" className="text-sm text-gold-light">返回</Link>} />
      <div className="space-y-4">
        <ApiAlert error={state.error} />
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={includePending} onChange={(event) => { setIncludePending(event.target.checked); setPage(1) }} />
          包含未确认转账
        </label>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-raised text-xs text-white/50"><tr>
              <th className="px-4 py-3 font-normal">时间</th>
              <th className="px-4 py-3 font-normal">金额</th>
              <th className="px-4 py-3 font-normal">交易</th>
              <th className="px-4 py-3 font-normal">确认数</th>
            </tr></thead>
            <tbody>
              {state.loading ? <tr><td colSpan={4} className="px-4 py-6 text-white/50">正在加载…</td></tr> : null}
              {!state.loading && state.data?.items.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-white/50">没有记录</td></tr> : null}
              {state.data?.items.map((row) => (
                <tr key={`${row.txHash}-${row.logIndex}`} className="border-t border-line">
                  <td className="px-4 py-3">{formatTime(row.blockTime)}</td>
                  <td className="px-4 py-3">{formatUsdt(row.amount)}{row.pending ? ' · 未确认' : ''}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.txHash}</td>
                  <td className="px-4 py-3">{row.confirmations}</td>
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
