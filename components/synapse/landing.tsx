'use client'

import { useEffect, useState } from 'react'
import { Architecture } from './architecture'
import { Cinematic } from './cinematic'
import { Footer } from './footer'
import { Hero } from './hero'
import { Institutional } from './institutional'
import { LiveMarkets } from './live-markets'
import { Metrics } from './metrics'
import { Navbar } from './navbar'
import { Security } from './security'
import { Technology } from './technology'
import { TickerTape } from './ticker-tape'

export function Landing() {
  const [entranceComplete, setEntranceComplete] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setEntranceComplete(true), 800)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="bg-black text-white"
      style={{
        fontFamily:
          'var(--font-space-mono), "Space Mono", var(--font-noto-sc), "PingFang SC", "Microsoft YaHei", monospace',
      }}
    >
      <Navbar visible={entranceComplete} />
      <main>
        <Hero entranceComplete={entranceComplete} />
        <TickerTape />
        <Cinematic />
        <Metrics />
        <TickerTape />
        <Technology />
        <Architecture />
        <Security />
        <Institutional />
        <LiveMarkets />
      </main>
      <Footer />
    </div>
  )
}
