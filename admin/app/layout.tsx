import type { Metadata, Viewport } from 'next'
import { Anton_SC, Noto_Sans_SC, Space_Mono } from 'next/font/google'
import { headers } from 'next/headers'
import { connection } from 'next/server'
import './globals.css'

const notoSansSC = Noto_Sans_SC({ weight: ['400', '500'], preload: false, variable: '--font-noto-sc' })
const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-space-mono' })
const antonSC = Anton_SC({ subsets: ['latin'], weight: '400', variable: '--font-anton-sc' })

export const metadata: Metadata = {
  title: { default: 'OXXX 管理后台', template: '%s · OXXX 管理后台' },
  description: 'OXXX 交易所管理后台',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#000000' }

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Per-request nonce. Waiting on the request keeps pages dynamic so Next stamps
  // this nonce onto its inline bootstrap scripts.
  await connection()
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="zh-CN" className={`${spaceMono.variable} ${antonSC.variable} ${notoSansSC.variable}`} nonce={nonce}>
      <body>{children}</body>
    </html>
  )
}
