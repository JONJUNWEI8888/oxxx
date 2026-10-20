import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Anton_SC, Noto_Sans_SC, Space_Mono } from 'next/font/google'
import './globals.css'

const notoSansSC = Noto_Sans_SC({
  weight: ['300', '400'],
  preload: false,
  variable: '--font-noto-sc',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-space-mono',
})

const antonSC = Anton_SC({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton-sc',
})

export const metadata: Metadata = {
  title: 'oxxx.io — 下一个独角兽交易所',
  description:
    '公牛代表力量，也代表坚定向前的姿态。对 OXXX 而言，我们的目标是定义为下一代交易所UEX，迈向全景加密交易的新里程碑。',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${spaceMono.variable} ${antonSC.variable} ${notoSansSC.variable} bg-background`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
