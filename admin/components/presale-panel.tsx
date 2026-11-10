'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAdmin } from '@/components/admin-context'
import { ApiAlert, StatusNote } from '@/components/api-alert'
import { useApiData } from '@/components/use-api-data'
import { Button, Field, PageHeader, Pagination, TextField } from '@/components/ui/controls'
import { browserJson, downloadCsv } from '@/lib/api/browser'
import { ApiError } from '@/lib/api/errors'
import { paths, withQuery } from '@/lib/api/paths'
import type { Page, PresaleSummary, Subscriber, TransferPage } from '@/lib/api/types'
import { formatTime, formatUsdt } from '@/lib/labels'
import { can } from '@/lib/permissions'

export function PresalePanel() {
  const admin = useAdmin()
  const summary = useApiData<PresaleSummary>('summary', () => browserJson(paths.presaleSummary))
  const [address, setAddress] = useState('')
  const [txHash, setTxHash] = useState('')
  const [includePending, setIncludePending] = useState(false)
  const [applied, setApplied] = useState({ address: '', txHash: '', includePending: false })
  const [page, setPage] = useState(1)
  const [transferPage, setTransferPage] = useState(1)
  const [exportError, setExportError] = useState<ApiError | null>(null)
  const subscriberKey = withQuery(paths.presaleSubscribers, { address: applied.address, includePending: applied.includePending, page, pageSize: 20 })
  const transferKey = withQuery(paths.presaleSubscriptions, { address: applied.address, txHash: applied.txHash, includePending: applied.includePending, page: transferPage, pageSize: 20 })
  const subscribers = useApiData<Page<Subscriber>>(subscriberKey, () => browserJson(subscriberKey))
  const transfers = useApiData<TransferPage>(transferKey, () => browserJson(transferKey))

  async function exportFile(path: string, filename: string) {
    setExportError(null)
    try {
      await downloadCsv(path, filename)
    } catch (reason) {
      setExportError(reason instanceof ApiError ? reason : new ApiError(503, 'backend_unavailable', 'down', 5))
    }
  }

  return (
    <section>
      <PageHeader
        title="认购记录"
        description="已确认转入按 15 个区块确认。未确认转账默认不进入合计，勾选后才会列出。"
        actions={can(admin.permissions, 'presale.export') ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => void exportFile(withQuery(paths.presaleSubscribersCsv, { address: applied.address, includePending: applied.includePending }), 'presale-subscribers.csv')}>导出认购人</Button>
            <Button variant="ghost" onClick={() => void exportFile(withQuery(paths.presaleSubscriptionsCsv, { address: applied.address, txHash: applied.txHash, includePending: applied.includePending }), 'presale-subscriptions.csv')}>导出转账</Button>
          </div>
        ) : null}
      />
      <div className="space-y-6">
        <ApiAlert error={summary.error ?? subscribers.error ?? transfers.error ?? exportError} />
        {summary.data ? (
          <div className="grid gap-3 md:grid-cols-2">
            <SummaryCard title="已确认" amount={summary.data.confirmed.totalUsdt} detail={`${summary.data.confirmed.txCount} 笔 · ${summary.data.confirmed.subscriberCount} 个地址`} />
            <SummaryCard title="未确认" amount={summary.data.pending.totalUsdt} detail={`${summary.data.pending.txCount} 笔 · ${summary.data.pending.subscriberCount} 个地址`} />
          </div>
        ) : null}
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setPage(1); setTransferPage(1); setApplied({ address: address.trim(), txHash: txHash.trim(), includePending }) }}>
          <Field label="钱包地址"><TextField value={address} spellCheck={false} placeholder="0x…" onChange={(event) => setAddress(event.target.value)} /></Field>
          <Field label="交易哈希"><TextField value={txHash} spellCheck={false} placeholder="0x…" onChange={(event) => setTxHash(event.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm text-white/70 md:col-span-2">
            <input type="checkbox" checked={includePending} onChange={(event) => setIncludePending(event.target.checked)} />
            包含未满 15 确认的转账
          </label>
          <div><Button type="submit">查询</Button></div>
        </form>
        <StatusNote>列表按钱包地址和交易哈希筛选。接口没有按时间过滤认购记录。</StatusNote>
        <div>
          <h2 className="mb-3 text-sm text-white/70">认购人</h2>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-raised text-xs text-white/50"><tr>
                <th className="px-4 py-3 font-normal">地址</th>
                <th className="px-4 py-3 font-normal">已确认</th>
                <th className="px-4 py-3 font-normal">笔数</th>
                <th className="px-4 py-3 font-normal">最近转入</th>
                <th className="px-4 py-3 font-normal">未确认</th>
              </tr></thead>
              <tbody>
                {subscribers.loading ? <tr><td colSpan={5} className="px-4 py-6 text-white/50">正在加载…</td></tr> : null}
                {!subscribers.loading && subscribers.data?.items.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-white/50">没有记录</td></tr> : null}
                {subscribers.data?.items.map((row) => (
                  <tr key={row.address} className="border-t border-line">
                    <td className="px-4 py-3 font-mono text-xs"><Link className="text-gold-light" href={`/presale/${row.address}`}>{short(row.address)}</Link></td>
                    <td className="px-4 py-3">{formatUsdt(row.totalUsdt)}</td>
                    <td className="px-4 py-3">{row.txCount}</td>
                    <td className="px-4 py-3 text-white/60">{formatTime(row.lastTransferAt)}</td>
                    <td className="px-4 py-3 text-white/60">{row.pendingTxCount > 0 ? `${row.pendingTxCount} 笔未确认` : '—'}{row.pendingOnly ? ' · 仅未确认' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {subscribers.data ? <Pagination page={subscribers.data.page} pageSize={subscribers.data.pageSize} total={subscribers.data.total} onPage={setPage} /> : null}
        </div>
        <div>
          <h2 className="mb-3 text-sm text-white/70">单笔转账</h2>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              <thead className="bg-raised text-xs text-white/50"><tr>
                <th className="px-4 py-3 font-normal">时间</th>
                <th className="px-4 py-3 font-normal">付款地址</th>
                <th className="px-4 py-3 font-normal">金额</th>
                <th className="px-4 py-3 font-normal">交易</th>
                <th className="px-4 py-3 font-normal">确认</th>
              </tr></thead>
              <tbody>
                {transfers.loading ? <tr><td colSpan={5} className="px-4 py-6 text-white/50">正在加载…</td></tr> : null}
                {!transfers.loading && transfers.data?.items.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-white/50">没有记录</td></tr> : null}
                {transfers.data?.items.map((row) => (
                  <tr key={`${row.txHash}-${row.logIndex}`} className="border-t border-line">
                    <td className="px-4 py-3 whitespace-nowrap text-white/70">{formatTime(row.blockTime)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{short(row.fromAddress)}</td>
                    <td className="px-4 py-3">{formatUsdt(row.amount)}{row.pending ? ' · 未确认' : ''}</td>
                    <td className="px-4 py-3 font-mono text-xs" title={row.txHash}>{short(row.txHash)}</td>
                    <td className="px-4 py-3">{row.confirmations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {transfers.data ? <Pagination page={transfers.data.page} pageSize={transfers.data.pageSize} total={transfers.data.total} onPage={setTransferPage} /> : null}
        </div>
      </div>
    </section>
  )
}

function SummaryCard({ title, amount, detail }: { title: string; amount: number; detail: string }) {
  return <div className="rounded-xl border border-line bg-panel p-4"><p className="text-xs text-white/45">{title}</p><p className="mt-2 font-display text-3xl">{formatUsdt(amount)}</p><p className="mt-1 text-xs text-white/50">{detail}</p></div>
}

function short(value: string): string {
  if (value.length <= 18) return value
  return `${value.slice(0, 8)}…${value.slice(-6)}`
}
