'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ApiAlert } from '@/components/api-alert'
import { Button, Field, TextField } from '@/components/ui/controls'
import { browserJson } from '@/lib/api/browser'
import { ApiError } from '@/lib/api/errors'
import { readLoginChallenge, readProfile } from '@/lib/api/parse'
import { paths } from '@/lib/api/paths'

export function LoginPanel() {
  const router = useRouter()
  const [step, setStep] = useState<'password' | 'mfa'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [mfaToken, setMfaToken] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [pending, setPending] = useState(false)

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const challenge = readLoginChallenge(await browserJson(paths.login, { method: 'POST', body: { email, password } }))
      setMfaToken(challenge.mfaToken)
      setPassword('')
      setStep('mfa')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError(503, 'backend_unavailable', 'down', 5))
    } finally {
      setPending(false)
    }
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      readProfile(await browserJson(paths.mfa, { method: 'POST', body: { mfaToken, code } }))
      setMfaToken('')
      router.replace('/users')
      router.refresh()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason : new ApiError(503, 'backend_unavailable', 'down', 5))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="admin-backdrop grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between border-r border-line px-12 py-10 lg:flex">
        <span className="logo-glow"><span className="logo-wordmark font-display text-4xl tracking-[0.08em]">OXXX</span></span>
        <div>
          <h1 className="font-display text-5xl leading-tight tracking-wide">管理后台</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/55">用户、KYC、预售认购与审计。登录需要密码和验证器动态码。</p>
        </div>
        <p className="text-xs text-white/35">admin.oxxx.io</p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-line bg-panel px-6 py-8">
          <p className="text-xs tracking-[0.2em] text-gold">OXXX ADMIN</p>
          <h2 className="mt-3 font-display text-3xl tracking-wide">{step === 'password' ? '登录' : '动态验证'}</h2>
          <div className="mt-6"><ApiAlert error={error} /></div>
          {step === 'password' ? (
            <form className="mt-6 space-y-4" onSubmit={(event) => void submitPassword(event)}>
              <Field label="邮箱"><TextField type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
              <Field label="密码"><TextField type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
              <Button type="submit" className="w-full" disabled={pending}>{pending ? '正在校验…' : '继续'}</Button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={(event) => void submitCode(event)}>
              <p className="text-sm text-white/60">输入验证器中的 6 位动态码。账号：{email}</p>
              <Field label="动态码">
                <TextField inputMode="numeric" autoComplete="one-time-code" maxLength={6} required spellCheck={false} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
              </Field>
              <Button type="submit" className="w-full" disabled={pending || code.length !== 6}>{pending ? '正在验证…' : '进入后台'}</Button>
              <Button variant="quiet" onClick={() => { setStep('password'); setCode(''); setMfaToken(''); setError(null) }}>返回密码</Button>
            </form>
          )}
          <p className="mt-8 text-sm text-white/45">收到邀请？<Link href="/invite" className="ml-2 text-gold-light">绑定验证器</Link></p>
        </div>
      </section>
    </div>
  )
}
