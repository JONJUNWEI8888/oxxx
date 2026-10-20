'use client'

import { useEffect, useState } from 'react'
import { Architecture } from './architecture'
import { Cinematic } from './cinematic'
import { Footer } from './footer'
import { Hero } from './hero'
import { Metrics } from './metrics'
import { Navbar } from './navbar'
import { Technology } from './technology'

export function Landing() {
  const [entranceComplete, setEntranceComplete] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setEntranceComplete(true), 800)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="bg-black text-white"
      style={{ fontFamily: 'var(--font-space-mono), "Space Mono", monospace' }}
    >
      <Navbar visible={entranceComplete} />
      <main>
        <Hero entranceComplete={entranceComplete} />
        <Cinematic />
        <Metrics />
        <Technology />
        <Architecture />
      </main>
      <Footer />
    </div>
  )
}
