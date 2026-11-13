'use client'

import { useState } from 'react'
import { Footer } from '@/components/synapse/footer'
import { Navbar } from '@/components/synapse/navbar'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { checkPresaleAddress, presaleChain } from '@/lib/presale-address'

type Contribution = {
  txHash: string
  logIndex: number
  amount: number
  blockTime: string
  confirmations: number
}

type LookupBody = {
  address: string
  total: number
  contributionCount: number
  truncated: boolean
  contributions: Contribution[]
}

type View =
  | { kind: 'idle' }
  | { kind: 'invalid' }
  | { kind: 'loading' }
  | { kind: 'retry' }
  | { kind: 'empty'; address: string }
  | { kind: 'result'; body: LookupBody }

function formatUsdt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

function shortHash(hash: string) {
  if (hash.length <= 18) return hash
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

function MySubscriptionForm() {
  const { t } = useI18n()
  const [address, setAddress] = useState('')
  const [view, setView] = useState<View>({ kind: 'idle' })
  const chain = presaleChain()

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const check = checkPresaleAddress(address)
    if (check !== 'ok') {
      setView({ kind: 'invalid' })
      return
    }
    const normalized = address.trim()
    setView({ kind: 'loading' })
    let res: Response
    try {
      res = await fetch(`/api/presale/subscribers/${encodeURIComponent(normalized)}`)
    } catch {
      setView({ kind: 'retry' })
      return
    }
    if (res.status === 429 || res.status === 503) {
      setView({ kind: 'retry' })
      return
    }
    if (!res.ok) {
      setView({ kind: 'retry' })
      return
    }
    const body = (await res.json()) as Partial<LookupBody>
    if (typeof body.total !== 'number' || typeof body.address !== 'string' || !Array.isArray(body.contributions)) {
      setView({ kind: 'retry' })
      return
    }
    if (body.total <= 0) {
      setView({ kind: 'empty', address: body.address })
      return
    }
    setView({
      kind: 'result',
      body: {
        address: body.address,
        total: body.total,
        contributionCount: typeof body.contributionCount === 'number' ? body.contributionCount : body.contributions.length,
        truncated: Boolean(body.truncated),
        contributions: body.contributions.filter(
          (row): row is Contribution =>
            typeof row?.txHash === 'string' &&
            typeof row.logIndex === 'number' &&
            typeof row.amount === 'number' &&
            typeof row.blockTime === 'string' &&
            typeof row.confirmations === 'number',
        ),
      },
    })
  }

  const invalidCopy =
    checkPresaleAddress(address) === 'wrong-chain'
      ? chain === 'evm'
        ? t('当前私募在 BSC，请输入 0x 开头的钱包地址。', 'This presale is on BSC. Enter a 0x wallet address.')
        : t('当前私募在 TRON，请输入 T 开头的钱包地址。', 'This presale is on TRON. Enter a T wallet address.')
      : chain === 'evm'
        ? t('请输入有效的 BSC 钱包地址。', 'Enter a valid BSC wallet address.')
        : t('请输入有效的 TRON 钱包地址。', 'Enter a valid TRON wallet address.')

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16 pt-28 sm:px-6 md:px-8">
      <div className="flex flex-col gap-3">
        <a href="/#presale" className="text-[13px] text-gold-light underline-offset-4 hover:underline">
          {t('返回私募', 'Back to the presale')}
        </a>
        <h1 className="text-[clamp(32px,6vw,52px)] font-light leading-none tracking-[-0.03em] text-white">
          {t('我的认购', 'My subscription')}
        </h1>
        <p className="max-w-xl text-pretty text-[14px] leading-relaxed text-white/60 sm:text-[15px]">
          {t(
            '输入您的钱包地址，查询该地址自己的认购记录和合计。不会显示其他地址的数据。',
            'Enter your wallet address to see only that address’s subscription records and total.',
          )}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-xl border border-gold/25 bg-gold-deep/50 p-4 sm:p-6">
        <label htmlFor="wallet-address" className="text-[13px] uppercase tracking-[0.2em] text-gold">
          {t('钱包地址', 'Wallet address')}
        </label>
        <input
          id="wallet-address"
          name="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={chain === 'evm' ? '0x…' : 'T…'}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-3 font-mono text-[14px] text-white outline-none focus:border-gold sm:text-[15px]"
        />
        <button
          type="submit"
          disabled={view.kind === 'loading'}
          className="h-11 w-full rounded-full bg-white text-[15px] font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {view.kind === 'loading' ? t('查询中', 'Looking up') : t('查询', 'Look up')}
        </button>
      </form>

      {view.kind === 'invalid' ? (
        <p role="alert" className="text-[14px] text-gold-light">
          {invalidCopy}
        </p>
      ) : null}
      {view.kind === 'retry' ? (
        <p role="alert" className="text-[14px] text-gold-light">
          {t('请稍后重试', 'Please try again shortly')}
        </p>
      ) : null}
      {view.kind === 'empty' ? (
        <p role="status" className="text-[15px] text-white/70">
          {t(`地址 ${view.address} 暂无认购记录。`, `No subscription records for ${view.address}.`)}
        </p>
      ) : null}
      {view.kind === 'result' ? <Result body={view.body} /> : null}
    </div>
  )
}

function Result({ body }: { body: LookupBody }) {
  const { t, lang } = useI18n()
  return (
    <section className="flex flex-col gap-4" aria-label={t('认购结果', 'Subscription result')}>
      <div className="flex flex-col gap-2">
        <p className="break-all font-mono text-[12px] text-white/45 sm:text-[13px]">{body.address}</p>
        <p className="text-[clamp(28px,6vw,44px)] font-light leading-none text-white">
          {formatUsdt(body.total)}
          <span className="ml-2 text-[14px] tracking-normal text-gold">USDT</span>
        </p>
        <p className="text-[13px] text-white/45">
          {t(`共 ${body.contributionCount} 笔已入账`, `${body.contributionCount} credited transfers`)}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {body.contributions.map((row) => (
          <li key={`${row.txHash}:${row.logIndex}`} className="rounded-lg border border-white/10 px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <span className="text-[16px] text-white">{formatUsdt(row.amount)} USDT</span>
              <time className="text-[13px] text-white/45" dateTime={row.blockTime}>
                {new Date(row.blockTime).toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN')}
              </time>
            </div>
            <p className="mt-2 break-all font-mono text-[12px] text-white/50" title={row.txHash}>
              {shortHash(row.txHash)}
              <span className="ml-3 font-sans text-white/35">
                {t(`${row.confirmations} 确认`, `${row.confirmations} confirmations`)}
              </span>
            </p>
          </li>
        ))}
      </ul>
      {body.truncated ? (
        <p className="text-[13px] text-white/45">
          {t('列表只显示最近的记录，上方合计包含该地址的全部已入账金额。', 'The list shows the latest records. The total above includes every credited transfer for this address.')}
        </p>
      ) : null}
    </section>
  )
}

export function MySubscription() {
  return (
    <I18nProvider title={{ zh: '我的认购 | OXXX', en: 'My subscription | OXXX' }}>
      <Navbar visible />
      <main className="min-h-screen bg-background text-foreground">
        <MySubscriptionForm />
      </main>
      <Footer />
    </I18nProvider>
  )
}
