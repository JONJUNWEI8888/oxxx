'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import QRCode from 'qrcode'
import { useState } from 'react'
import { ApiAlert, StatusNote } from '@/components/api-alert'
import { Button, Field, TextField } from '@/components/ui/controls'
import { browserJson } from '@/lib/api/browser'
import { ApiError } from '@/lib/api/errors'
import { paths } from '@/lib/api/paths'
import type { InviteStart } from '@/lib/api/types'
import { ROLE_LABEL } from '@/lib/labels'

export function InvitePanel() {
  const params = useSearchParams()
  const token = params.get('token')?.trim() ?? ''
  const [started, setStarted] = useState<InviteStart | null>(null)
  const [qr, setQr] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  async function openInvite() {
    setPending(true)
    setError(null)
    try {
      const next = await browserJson<InviteStart>(paths.inviteStart, { method: 'POST', body: { token } })
      setStarted({ email: next.email, role: next.role, secret: next.secret, otpauthUrl: next.otpauthUrl })
      setQr(await QRCode.toDataURL(next.otpauthUrl, { margin: 1, width: 240, errorCorrectionLevel: 'M' }))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError(503, 'backend_unavailable', 'down', 5))
    } finally {
      setPending(false)
    }
  }

  async function redeem(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await browserJson(paths.inviteRedeem, { method: 'POST', body: { token, password, code } })
      setPassword('')
      setDone(true)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError(503, 'backend_unavailable', 'down', 5))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="admin-backdrop flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-panel px-6 py-8">
        <span className="logo-glow"><span className="logo-wordmark font-display text-3xl tracking-[0.08em]">OXXX</span></span>
        <h1 className="mt-6 font-display text-3xl tracking-wide">绑定验证器</h1>
        <p className="mt-2 text-sm leading-6 text-white/55">邀请链接只使用一次。设置至少 12 位密码，并用验证器扫描二维码后填写动态码。</p>
        <div className="mt-6 space-y-4">
          <ApiAlert error={error} />
          {token.length < 20 ? <ApiAlert error={new ApiError(410, 'invite_invalid', 'missing', null)} /> : null}
          {done ? <StatusNote>绑定完成。<Link href="/login" className="ml-2 underline">前往登录</Link></StatusNote> : null}
          {!started && !done ? <Button disabled={pending || token.length < 20} onClick={() => void openInvite()}>{pending ? '正在打开…' : '打开邀请'}</Button> : null}
          {started && !done ? (
            <form className="space-y-4" onSubmit={(event) => void redeem(event)}>
              <p className="text-sm text-white/70">{started.email}<span className="ml-2 text-gold">{ROLE_LABEL[started.role]}</span></p>
              {qr ? <img src={qr} alt="验证器二维码" width={240} height={240} className="rounded-lg bg-white p-2" /> : null}
              <Field label="手动输入密钥" hint="验证器无法扫码时使用"><TextField readOnly value={started.secret} spellCheck={false} /></Field>
              <Field label="密码" hint="至少 12 位"><TextField type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
              <Field label="动态码"><TextField inputMode="numeric" autoComplete="one-time-code" maxLength={6} required spellCheck={false} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></Field>
              <Button type="submit" disabled={pending || password.length < 12 || code.length !== 6}>{pending ? '正在绑定…' : '完成绑定'}</Button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
