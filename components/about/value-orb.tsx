'use client'

import Image from 'next/image'
import { useEffect, useRef, type CSSProperties } from 'react'

type Point3 = { x: number; y: number; z: number; size: number; bright: boolean }
type RingParticle = { angle: number; speed: number; radius: number; size: number }
type Spark = { x: number; y: number; vy: number; life: number; max: number; size: number }

const SPHERE_COUNT = 140
const RING_COUNT = 70
const SPARK_COUNT = 14

function fibonacciSphere(count: number): Point3[] {
  const golden = Math.PI * (3 - Math.sqrt(5))
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    return {
      x: Math.cos(theta) * r,
      y,
      z: Math.sin(theta) * r,
      size: 0.5 + Math.random() * 1.1,
      bright: Math.random() < 0.12,
    }
  })
}

export function ValueOrb({ src, ringTilt = -18, delay = 0 }: { src: string; ringTilt?: number; delay?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLCanvasElement>(null)
  const frontRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const icon = iconRef.current
    const back = backRef.current?.getContext('2d')
    const front = frontRef.current?.getContext('2d')
    if (!wrap || !icon || !back || !front) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const styles = getComputedStyle(document.documentElement)
    const accent = styles.getPropertyValue('--color-gold').trim() || '#e9a8d0'
    const light = styles.getPropertyValue('--color-foreground').trim() || '#f5f5f5'

    let size = 0
    const resize = () => {
      size = wrap.getBoundingClientRect().width
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      for (const ctx of [back, front]) {
        ctx.canvas.width = Math.round(size * dpr)
        ctx.canvas.height = Math.round(size * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }
    resize()

    const sphere = fibonacciSphere(SPHERE_COUNT)
    const ring: RingParticle[] = Array.from({ length: RING_COUNT }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.006 + Math.random() * 0.006,
      radius: 0.44 + (Math.random() - 0.5) * 0.04,
      size: 0.6 + Math.random() * 1.5,
    }))
    const makeSpark = (): Spark => ({
      x: size * (0.3 + Math.random() * 0.4),
      y: size * (0.7 + Math.random() * 0.15),
      vy: 0.25 + Math.random() * 0.5,
      life: 0,
      max: 80 + Math.random() * 100,
      size: 0.6 + Math.random() * 1.2,
    })
    const sparks = Array.from({ length: SPARK_COUNT }, () => {
      const s = makeSpark()
      s.life = Math.random() * s.max
      return s
    })

    const tilt = (ringTilt * Math.PI) / 180
    let rotY = Math.random() * Math.PI * 2
    let pointerX = 0
    let pointerY = 0
    let raf = 0
    let visible = true

    const dot = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, color: string, glow = 0) => {
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      ctx.shadowBlur = glow
      ctx.shadowColor = color
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const draw = () => {
      back.clearRect(0, 0, size, size)
      front.clearRect(0, 0, size, size)
      const cx = size / 2
      const cy = size / 2
      const radius = size * 0.4
      const focal = size * 1.6

      rotY += 0.004
      const ry = rotY + pointerX * 0.6
      const rx = -0.35 + pointerY * 0.5
      const cosY = Math.cos(ry)
      const sinY = Math.sin(ry)
      const cosX = Math.cos(rx)
      const sinX = Math.sin(rx)

      for (const p of sphere) {
        const x1 = p.x * cosY - p.z * sinY
        const z1 = p.x * sinY + p.z * cosY
        const y2 = p.y * cosX - z1 * sinX
        const z2 = p.y * sinX + z1 * cosX
        const scale = focal / (focal - z2 * radius)
        const depth = (z2 + 1) / 2
        const ctx = z2 > 0.15 ? front : back
        dot(
          ctx,
          cx + x1 * radius * scale,
          cy + y2 * radius * scale,
          p.size * scale * (0.5 + depth * 0.6),
          0.12 + depth * (p.bright ? 0.85 : 0.5),
          p.bright ? light : accent,
          p.bright && depth > 0.7 ? 8 : 0,
        )
      }

      for (const p of ring) {
        p.angle += p.speed
        const ex = Math.cos(p.angle) * size * p.radius
        const ey = Math.sin(p.angle) * size * p.radius * 0.24
        const x = cx + ex * Math.cos(tilt) - ey * Math.sin(tilt)
        const y = cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)
        const depth = (Math.sin(p.angle) + 1) / 2
        const isHead = p.size > 1.9
        dot(
          Math.sin(p.angle) > 0 ? front : back,
          x,
          y,
          p.size * (0.6 + depth * 0.7),
          0.2 + depth * 0.8,
          isHead ? light : accent,
          isHead && depth > 0.6 ? 12 : 0,
        )
      }

      for (const s of sparks) {
        s.life++
        s.y -= s.vy
        s.x += Math.sin((s.life + s.x) * 0.06) * 0.25
        const t = s.life / s.max
        dot(front, s.x, s.y, s.size, Math.sin(Math.PI * Math.min(t, 1)) * 0.85, t < 0.5 ? light : accent)
        if (s.life >= s.max) Object.assign(s, makeSpark())
      }

      back.globalAlpha = 1
      front.globalAlpha = 1
      back.shadowBlur = 0
      front.shadowBlur = 0
      if (visible) raf = requestAnimationFrame(draw)
    }

    const onPointerMove = (event: PointerEvent) => {
      const rect = wrap.getBoundingClientRect()
      pointerX = (event.clientX - rect.left) / rect.width - 0.5
      pointerY = (event.clientY - rect.top) / rect.height - 0.5
      icon.style.setProperty('--tilt-x', `${(-pointerY * 24).toFixed(2)}deg`)
      icon.style.setProperty('--tilt-y', `${(pointerX * 30).toFixed(2)}deg`)
    }
    const onPointerLeave = () => {
      pointerX = 0
      pointerY = 0
      icon.style.setProperty('--tilt-x', '0deg')
      icon.style.setProperty('--tilt-y', '0deg')
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(wrap)
    const hoverTarget = wrap.closest('li') ?? wrap

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
      hoverTarget.addEventListener('pointermove', onPointerMove as EventListener)
      hoverTarget.addEventListener('pointerleave', onPointerLeave)
    }

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      intersectionObserver?.disconnect()
      hoverTarget.removeEventListener('pointermove', onPointerMove as EventListener)
      hoverTarget.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [ringTilt])

  return (
    <div
      ref={wrapRef}
      className="relative aspect-square w-full max-w-[300px] [perspective:900px]"
      style={{ '--orb-delay': `${delay}s` } as CSSProperties}
    >
      <div aria-hidden="true" className="value-halo pointer-events-none absolute inset-[14%] rounded-full" />
      <canvas ref={backRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
      <div ref={iconRef} className="value-tilt absolute -inset-[8%]">
        <div className="value-spin relative size-full">
          <Image src={src} alt="" width={512} height={512} className="value-mask size-full object-contain" />
          <div
            aria-hidden="true"
            className="value-shine pointer-events-none absolute inset-0"
            style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})` } as CSSProperties}
          />
        </div>
      </div>
      <canvas ref={frontRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />
    </div>
  )
}
