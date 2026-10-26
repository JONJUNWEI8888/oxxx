'use client'

import { useRef, type CSSProperties } from 'react'

const FACES = ['btc', 'eth', 'usdt', 'bnb'] as const

function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = seeded(7)
const between = (min: number, max: number) => +(min + rand() * (max - min)).toFixed(2)

const COIN_COUNT = 22
const COINS = Array.from({ length: COIN_COUNT }, (_, i) => ({
  face: FACES[i % FACES.length],
  angle: +((i / COIN_COUNT) * 360 + between(-7, 7)).toFixed(2),
  radius: between(33, 43),
  scatter: between(2, 6),
  depth: between(-90, 90),
  size: between(13, 19),
  rx: between(-55, 55),
  ry: between(-60, 60),
  wobble: between(18, 40),
  spin: between(5, 9),
  drift: between(4, 7),
  delay: between(-9, 0),
}))

const SPARKS = Array.from({ length: 26 }, () => ({
  x: between(6, 94),
  y: between(6, 94),
  z: between(-120, 120),
  size: between(2, 5),
  delay: between(-4, 0),
  dur: between(2.4, 4.6),
}))

export function CoinOrbit({ className = '' }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null)

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    const el = stageRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--orbit-rx', `${(14 - py * 18).toFixed(2)}deg`)
    el.style.setProperty('--orbit-ry', `${(px * 24).toFixed(2)}deg`)
  }

  const handleLeave = () => {
    stageRef.current?.style.removeProperty('--orbit-rx')
    stageRef.current?.style.removeProperty('--orbit-ry')
  }

  return (
    <div
      ref={stageRef}
      aria-hidden="true"
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`orbit-stage relative aspect-square w-full select-none ${className}`}
    >
      <div className="orbit-glow pointer-events-none absolute inset-[22%] rounded-full" />
      <div className="orbit-tilt absolute inset-0">
        <div className="orbit-ring absolute inset-0">
          {COINS.map((c, i) => (
            <div key={i} className="orbit-slot" style={{ transform: `rotate(${c.angle}deg)` }}>
              <div
                className="orbit-drift"
                style={
                  {
                    '--r': c.radius,
                    '--scatter': c.scatter,
                    '--z': `${c.depth}px`,
                    animationDuration: `${c.drift}s`,
                    animationDelay: `${c.delay}s`,
                  } as CSSProperties
                }
              >
                <div className="orbit-upright" style={{ transform: `rotate(${-c.angle}deg)` }}>
                  <div
                    className="orbit-coin"
                    style={
                      {
                        '--s': c.size,
                        '--rx': `${c.rx}deg`,
                        '--ry': `${c.ry}deg`,
                        '--wobble': `${c.wobble}deg`,
                        animationDuration: `${c.spin}s`,
                        animationDelay: `${c.delay}s`,
                      } as CSSProperties
                    }
                  >
                    <img src={`/images/orbit/coin-${c.face}.png?v=2`} alt="" draggable={false} className="orbit-coin-edge" />
                    <img src={`/images/orbit/coin-${c.face}.png?v=2`} alt="" draggable={false} className="orbit-coin-face" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="orbit-spark"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.size,
              height: s.size,
              transform: `translateZ(${s.z}px)`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
            }}
          />
        ))}
      </div>

      <div className="orbit-bull">
        <img src="/images/orbit/bull.png?v=2" alt="" draggable={false} className="size-full object-contain" />
      </div>
    </div>
  )
}
