'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { useI18n } from '@/lib/i18n'
import { PRESALE } from '@/lib/presale'

export function PresaleQr() {
  const { t } = useI18n()
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
          <p className="text-[13px] uppercase tracking-[0.2em] text-gold">{t('唯一指定私募地址', 'Official Presale Address')}</p>
          <p className="text-pretty text-[14px] leading-relaxed text-white/60">
            {t('仅支持 BSC 链 USDT (BEP-20)，请勿转入其他链或其他币种。', 'Only USDT on BSC (BEP-20) is supported. Do not send from other chains or other tokens.')}
          </p>
        </div>
        <div className="self-start overflow-hidden rounded-lg bg-white p-2 ring-1 ring-gold ring-offset-4 ring-offset-gold-deep">
          <QRCodeSVG
            value={PRESALE.address}
            size={160}
            level="H"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#111111"
            title={t('OX 私募 USDT (BSC) 收款二维码', 'OX presale USDT (BSC) payment QR code')}
            className="size-36 sm:size-40"
            role="img"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-gold/20 pt-6">
        <code className="break-all font-mono text-[14px] leading-relaxed text-gold-light">
          {PRESALE.address}
        </code>
        <button
          type="button"
          onClick={copy}
          className="self-start rounded-full border border-gold bg-gold px-5 py-2 text-[14px] text-black transition-colors hover:bg-gold-light"
        >
          {copied ? t('已复制', 'Copied') : t('复制地址', 'Copy Address')}
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? t('地址已复制', 'Address copied') : ''}
        </span>
      </div>

      <div className="flex flex-col gap-3 border-t border-gold/20 pt-6">
        <label htmlFor="usdt-amount" className="text-[13px] uppercase tracking-[0.2em] text-gold">
          {t('认购计算', 'Purchase Calculator')}
        </label>
        <div className="flex items-center gap-3">
          <input
            id="usdt-amount"
            type="number"
            inputMode="decimal"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full min-w-0 border-b border-gold/30 bg-transparent py-2 text-[20px] font-light text-white outline-none focus:border-gold"
          />
          <span className="text-[14px] text-white/40">USDT</span>
        </div>
        <p className="text-[14px] text-white/60">
          {'≈ '}
          <span className="text-gold-light">{ox.toLocaleString('en-US')}</span>
          {' OX · 1 USDT = 1 OX'}
        </p>
      </div>
    </div>
  )
}
