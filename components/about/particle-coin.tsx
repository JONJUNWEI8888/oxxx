'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'

type OrbitParticle = { angle: number; speed: number; ring: number; size: number; jitter: number }
type NetNode = { x: number; y: number; vx: number; vy: number }
type Spark = { x: number; y: number; vy: number; drift: number; life: number; max: number; size: number }

const RINGS = [
  { radius: 0.46, count: 90 },
  { radius: 0.36, count: 60 },
]
const RING_TILT = (-14 * Math.PI) / 180
const NODE_COUNT = 34
const LINK_DISTANCE = 78
const SPARK_COUNT = 26

export function ParticleCoin() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const coinRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLCanvasElement>(null)
  const frontRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const coin = coinRef.current
    const back = backRef.current?.getContext('2d')
    const front = frontRef.current?.getContext('2d')
    if (!wrap || !coin || !back || !front) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const styles = getComputedStyle(document.documentElement)
    const accent = styles.getPropertyValue('--color-gold').trim() || '#e9a8d0'
    const light = styles.getPropertyValue('--color-foreground').trim() || '#f5f5f5'

    let width = 0
    let height = 0
    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      for (const ctx of [back, front]) {
        ctx.canvas.width = Math.round(width * dpr)
        ctx.canvas.height = Math.round(height * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }
    resize()

    const orbit: OrbitParticle[] = RINGS.flatMap((ring, ringIndex) =>
      Array.from({ length: ring.count }, () => ({
        angle: Math.random() * Math.PI * 2,
        speed: (0.0025 + Math.random() * 0.003) * (ringIndex === 0 ? 1 : -1.3),
        ring: ringIndex,
        size: 0.6 + Math.random() * 1.6,
        jitter: (Math.random() - 0.5) * 0.04,
      })),
    )

    const nodes: NetNode[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
    }))

    const makeSpark = (): Spark => ({
      x: width * (0.3 + Math.random() * 0.4),
      y: height * (0.62 + Math.random() * 0.2),
      vy: 0.3 + Math.random() * 0.6,
      drift: (Math.random() - 0.5) * 0.3,
      life: 0,
      max: 90 + Math.random() * 120,
      size: 0.6 + Math.random() * 1.4,
    })
    const sparks: Spark[] = Array.from({ length: SPARK_COUNT }, () => {
      const s = makeSpark()
      s.life = Math.random() * s.max
      return s
    })

    const ringPoint = (p: OrbitParticle) => {
      const cx = width / 2
      const cy = height * 0.48
      const r = RINGS[p.ring].radius + p.jitter
      const ex = Math.cos(p.angle) * width * r
      const ey = Math.sin(p.angle) * width * r * 0.26
      return {
        x: cx + ex * Math.cos(RING_TILT) - ey * Math.sin(RING_TILT),
        y: cy + ex * Math.sin(RING_TILT) + ey * Math.cos(RING_TILT),
        inFront: Math.sin(p.angle) > 0,
        depth: (Math.sin(p.angle) + 1) / 2,
      }
    }

    const dot = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, color: string) => {
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    let frame = 0
    let visible = true
    let raf = 0

    const draw = () => {
      frame++
      back.clearRect(0, 0, width, height)
      front.clearRect(0, 0, width, height)

      back.lineWidth = 0.6
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > width) n.vx *= -1
        if (n.y < 0 || n.y > height) n.vy *= -1
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.hypot(dx, dy)
          if (dist < LINK_DISTANCE) {
            back.globalAlpha = (1 - dist / LINK_DISTANCE) * 0.28
            back.strokeStyle = accent
            back.beginPath()
            back.moveTo(nodes[i].x, nodes[i].y)
            back.lineTo(nodes[j].x, nodes[j].y)
            back.stroke()
          }
        }
        const pulse = 0.35 + 0.35 * Math.sin(frame * 0.03 + i)
        dot(back, nodes[i].x, nodes[i].y, 1.1, pulse, accent)
      }

      for (const p of orbit) {
        p.angle += p.speed
        const pt = ringPoint(p)
        const ctx = pt.inFront ? front : back
        const alpha = 0.25 + pt.depth * 0.75
        const size = p.size * (0.6 + pt.depth * 0.7)
        if (pt.depth > 0.85 && p.size > 1.6) {
          ctx.shadowBlur = 10
          ctx.shadowColor = accent
        }
        dot(ctx, pt.x, pt.y, size, alpha, p.size > 1.8 ? light : accent)
        ctx.shadowBlur = 0
      }

      for (const s of sparks) {
        s.life++
        s.y -= s.vy
        s.x += s.drift + Math.sin((s.life + s.x) * 0.05) * 0.2
        const t = s.life / s.max
        dot(front, s.x, s.y, s.size, Math.sin(Math.PI * Math.min(t, 1)) * 0.9, t < 0.5 ? light : accent)
        if (s.life >= s.max) Object.assign(s, makeSpark())
      }

      front.globalAlpha = 1
      back.globalAlpha = 1
      if (visible) raf = requestAnimationFrame(draw)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = wrap.getBoundingClientRect()
      const px = (event.clientX - rect.left) / rect.width - 0.5
      const py = (event.clientY - rect.top) / rect.height - 0.5
      coin.style.setProperty('--tilt-x', `${(-py * 16).toFixed(2)}deg`)
      coin.style.setProperty('--tilt-y', `${(px * 22).toFixed(2)}deg`)
    }
    const onPointerLeave = () => {
      coin.style.setProperty('--tilt-x', '0deg')
      coin.style.setProperty('--tilt-y', '0deg')
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(wrap)

    let intersectionObserver: IntersectionObserver | undefined
    if (reduceMotion) {
      visible = false
      draw()
    } else {
      intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
        cancelAnimationFrame(raf)
        if (visible) raf = requestAnimationFrame(draw)
      })
      intersectionObserver.observe(wrap)
      wrap.addEventListener('pointermove', onPointerMove)
      wrap.addEventListener('pointerleave', onPointerLeave)
    }

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      intersectionObserver?.disconnect()
      wrap.removeEventListener('pointermove', onPointerMove)
      wrap.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative aspect-[1408/768] w-full [perspective:1000px]">
      <div aria-hidden="true" className="coin-halo pointer-events-none absolute inset-x-[28%] inset-y-[4%] rounded-full" />
      <canvas ref={backRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      <div ref={coinRef} className="coin-tilt absolute inset-0">
        <div className="coin-float relative size-full">
          <Image
            src="/images/about-coin.png"
            alt=""
            width={1408}
            height={768}
            priority
            className="coin-mask size-full object-contain"
          />
          <div
            aria-hidden="true"
            className="coin-scan pointer-events-none absolute bottom-[27%] left-[38%] right-[36%] top-[8%] overflow-hidden rounded-full"
          />
        </div>
      </div>
      <canvas ref={frontRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
    </div>
  )
}
