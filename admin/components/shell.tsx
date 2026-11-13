'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AdminProvider } from '@/components/admin-context'
import { ApiAlert } from '@/components/api-alert'
import { Button } from '@/components/ui/controls'
import { browserJson } from '@/lib/api/browser'
import { ApiError } from '@/lib/api/errors'
import { readProfile } from '@/lib/api/parse'
import { paths } from '@/lib/api/paths'
import type { AdminProfile } from '@/lib/api/types'
import { ROLE_LABEL } from '@/lib/labels'
import { can, type Permission } from '@/lib/permissions'
import { cn } from '@/lib/utils'

const NAV: { href: string; label: string; permission: Permission }[] = [
  { href: '/users', label: '用户', permission: 'users.read' },
  { href: '/kyc', label: 'KYC 审核', permission: 'kyc.read' },
  { href: '/presale', label: '认购记录', permission: 'presale.read' },
  { href: '/audit', label: '审计日志', permission: 'audit.read' },
  { href: '/admins', label: '管理员', permission: 'admins.read' },
]

export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [open, setOpen] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const load = useCallback(async () => {
    setError(null)
    try {
      setAdmin(readProfile(await browserJson(paths.me)))
    } catch (reason) {
      const apiError = reason instanceof ApiError ? reason : new ApiError(503, 'backend_unavailable', 'down', 5)
      if (apiError.status === 401) {
        router.replace('/login')
        return
      }
      setError(apiError)
    }
  }, [router])

  useEffect(() => {
    void load()
  }, [load, attempt])

  if (!admin) {
    return (
      <div className="admin-backdrop grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-md space-y-4">
          {error ? <ApiAlert error={error} /> : <p className="text-sm text-white/60">正在验证登录…</p>}
          {error ? <Button variant="ghost" onClick={() => setAttempt((value) => value + 1)}>重新尝试</Button> : null}
        </div>
      </div>
    )
  }

  async function logout() {
    await browserJson(paths.logout, { method: 'POST', body: {} })
    router.replace('/login')
    router.refresh()
  }

  const items = NAV.filter((item) => can(admin.permissions, item.permission))

  return (
    <AdminProvider value={admin}>
      <div className="admin-backdrop min-h-screen md:grid md:grid-cols-[240px_1fr]">
        <aside className={cn('border-b border-line bg-panel/80 md:border-r md:border-b-0', open ? 'block' : 'hidden md:block')}>
          <div className="flex h-16 items-center px-5">
            <span className="logo-glow"><span className="logo-wordmark font-display text-2xl tracking-[0.08em]">OXXX</span></span>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-4 md:flex-col">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={cn('rounded-lg px-3 py-2 text-sm whitespace-nowrap', active ? 'bg-gold/15 text-gold-light' : 'text-white/70 hover:bg-white/5 hover:text-white')}>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>
        <div className="min-w-0">
          <header className="flex h-16 items-center justify-between gap-3 border-b border-line px-4 md:px-8">
            <button type="button" className="text-sm text-white/70 md:hidden" onClick={() => setOpen((value) => !value)}>菜单</button>
            <p className="truncate text-sm text-white/70">{admin.email}<span className="ml-2 text-gold">{ROLE_LABEL[admin.role]}</span></p>
            <Button variant="ghost" className="h-9" onClick={() => void logout()}>退出</Button>
          </header>
          <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </AdminProvider>
  )
}
