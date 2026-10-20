'use client'

import Image from 'next/image'
import { useState } from 'react'
import { PRESALE } from '@/lib/presale'

export function PresaleQr() {
  const [copied, setCopied] = useState(false)
  const [amount, setAmount] = useState('1000')

  const usdt = Number(amount)
  const ox = Number.isFinite(usdt) && usdt > 0 ? usdt / PRESALE.priceUsdt : 0

  async function copy() {
    try {
      await navigator.clipboard.writeText(PRESALE.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] uppercase tracking-[0.2em] text-white/40">唯一指定私募地址</p>
          <p className="text-pretty text-[14px] leading-relaxed text-white/60">
            仅支持 BSC 链 USDT (BEP-20)，请勿转入其他链或其他币种。
          </p>
        </div>
        <div className="self-start overflow-hidden rounded-lg bg-white p-2">
          <Image
            src="/images/usdt-qr.jpg"
            alt="OX 私募 USDT (BSC) 收款二维码"
            width={160}
            height={160}
            className="size-36 sm:size-40"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
        <code className="break-all font-mono text-[14px] leading-relaxed text-white">
          {PRESALE.address}
        </code>
        <button
          type="button"
          onClick={copy}
          className="self-start rounded-full border border-white/20 px-5 py-2 text-[14px] text-white transition-colors hover:bg-white/10"
        >
          {copied ? '已复制' : '复制地址'}
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? '地址已复制' : ''}
        </span>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
        <label htmlFor="usdt-amount" className="text-[13px] uppercase tracking-[0.2em] text-white/40">
          认购计算
        </label>
        <div className="flex items-center gap-3">
          <input
            id="usdt-amount"
            type="number"
            inputMode="decimal"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full min-w-0 border-b border-white/20 bg-transparent py-2 text-[20px] font-light text-white outline-none focus:border-white"
          />
          <span className="text-[14px] text-white/40">USDT</span>
        </div>
        <p className="text-[14px] text-white/60">
          {'≈ '}
          <span className="text-white">{ox.toLocaleString('en-US')}</span>
          {' OX · 1 USDT = 1 OX'}
        </p>
      </div>
    </div>
  )
}
