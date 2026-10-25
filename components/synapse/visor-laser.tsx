'use client'

import { useEffect, useRef, type RefObject } from 'react'

const VIDEO_W = 1920
const VIDEO_H = 1080
const STEP = 0.25

// Visor position sampled from hero.mp4 every 0.25s, in native 1920x1080 video pixels.
const CENTER_X = [824, 831, 838, 850, 866, 885, 911, 936, 963, 992, 1019, 1044, 1062, 1081, 1082, 1085, 1092]
const CENTER_Y = [430, 430, 430, 426, 428, 426, 426, 426, 422, 418, 418, 414, 414, 410, 410, 410, 410]
const WIDTH = [344, 350, 356, 364, 372, 378, 382, 384, 382, 376, 366, 352, 340, 330, 324, 322, 320]
const ROTATE_Y = [16, 14, 12, 10, 8, 6, 3, 0, -2, -5, -8, -11, -14, -16, -18, -19, -20]

const CANDLE_COUNT = 12
const CANDLE_MS = 600
const SCAN_MS = 2600
const UP_COLOR = '#ffd6ea'
const DOWN_COLOR = '#ff2e74'
const GLOW_COLOR = '#ff3d7f'

type Candle = { o: number; h: number; l: number; c: number }

function sample(track: number[], time: number) {
  const pos = Math.max(0, time / STEP)
  const i = Math.min(Math.floor(pos), track.length - 1)
  const j = Math.min(i + 1, track.length - 1)
  const f = pos - i
  return track[i] + (track[j] - track[i]) * Math.min(f, 1)
}

function nextCandle(prevClose: number): Candle {
  return { o: prevClose, h: prevClose, l: prevClose, c: prevClose }
}

function seedCandles() {
  const list: Candle[] = []
  let price = 100
  for (let i = 0; i < CANDLE_COUNT; i++) {
    const drift = (Math.random() - 0.42) * 6
    const c = price + drift
    const h = Math.max(price, c) + Math.random() * 2.5
    const l = Math.min(price, c) - Math.random() * 2.5
    list.push({ o: price, h, l, c })
    price = c
  }
  return list
}

function drawChart(ctx: CanvasRenderingContext2D, w: number, h: number, candles: Candle[], now: number, animate: boolean) {
  ctx.clearRect(0, 0, w, h)

  let min = Infinity
  let max = -Infinity
  for (const k of candles) {
    if (k.l < min) min = k.l
    if (k.h > max) max = k.h
  }
  const pad = (max - min) * 0.08 || 1
  min -= pad
  max += pad
  const y = (v: number) => h - ((v - min) / (max - min)) * h

  const slot = w / CANDLE_COUNT
  const body = Math.max(3, slot * 0.58)
  const line = Math.max(1.2, w / 170)
  const flicker = animate && Math.random() < 0.04 ? 0.55 : 1

  ctx.lineCap = 'round'
  ctx.globalAlpha = flicker

  for (let pass = 0; pass < 2; pass++) {
    const glow = pass === 0
    ctx.shadowColor = GLOW_COLOR
    ctx.shadowBlur = glow ? line * 9 : line * 2.5

    candles.forEach((k, i) => {
      const up = k.c >= k.o
      const cx = slot * i + slot / 2
      const top = y(Math.max(k.o, k.c))
      const bottom = y(Math.min(k.o, k.c))
      const color = glow ? (up ? GLOW_COLOR : DOWN_COLOR) : up ? UP_COLOR : DOWN_COLOR

      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = glow ? line * 1.6 : line

      ctx.beginPath()
      ctx.moveTo(cx, y(k.h))
      ctx.lineTo(cx, y(k.l))
      ctx.stroke()

      const bh = Math.max(line * 1.5, bottom - top)
      if (up) {
        ctx.fillRect(cx - body / 2, top, body, bh)
      } else {
        ctx.strokeRect(cx - body / 2, top, body, bh)
      }
    })
  }

  const last = candles[candles.length - 1]
  const lastY = y(last.c)
  const lastUp = last.c >= last.o
  ctx.shadowBlur = line * 6
  ctx.shadowColor = GLOW_COLOR
  ctx.strokeStyle = lastUp ? UP_COLOR : DOWN_COLOR
  ctx.lineWidth = line * 0.7
  ctx.setLineDash([line * 3, line * 3])
  ctx.lineDashOffset = animate ? -now / 40 : 0
  ctx.beginPath()
  ctx.moveTo(0, lastY)
  ctx.lineTo(w, lastY)
  ctx.stroke()
  ctx.setLineDash([])

  const pulse = animate ? 0.6 + 0.4 * Math.sin(now / 90) : 1
  ctx.fillStyle = '#fff'
  ctx.shadowBlur = line * 10 * pulse
  ctx.beginPath()
  ctx.arc(slot * (CANDLE_COUNT - 1) + slot / 2, lastY, line * 1.6 * pulse + line, 0, Math.PI * 2)
  ctx.fill()

  if (animate) {
    const scanX = ((now % SCAN_MS) / SCAN_MS) * w * 1.3 - w * 0.15
    const trail = w * 0.06
    const grad = ctx.createLinearGradient(scanX - trail, 0, scanX, 0)
    grad.addColorStop(0, 'rgba(255,61,127,0)')
    grad.addColorStop(1, 'rgba(255,61,127,0.14)')
    ctx.shadowBlur = 0
    ctx.fillStyle = grad
    ctx.fillRect(scanX - trail, 0, trail, h)
    ctx.fillStyle = '#fff'
    ctx.shadowColor = GLOW_COLOR
    ctx.shadowBlur = line * 8
    ctx.fillRect(scanX, 0, line * 0.8, h)
  }

  ctx.globalAlpha = 1
  ctx.shadowBlur = 0
}

export function VisorLaser({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const anchor = anchorRef.current
    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas?.getContext('2d')
    if (!anchor || !canvas || !video || !ctx) return

    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const candles = seedCandles()
    candles.push(nextCandle(candles[candles.length - 1].c))
    candles.shift()

    let frame = 0
    let lastKey = ''
    let lastSize = ''
    let lastCandleAt = performance.now()
    let chartW = 0
    let chartH = 0

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const w = video.clientWidth
      const h = video.clientHeight
      const t = video.currentTime
      const key = `${w}|${h}|${t.toFixed(3)}`

      if (key !== lastKey) {
        lastKey = key
        const scale = Math.max(w / VIDEO_W, h / VIDEO_H)
        const offX = (w - VIDEO_W * scale) / 2
        const offY = (h - VIDEO_H * scale) / 2
        const x = offX + sample(CENTER_X, t) * scale
        const y = offY + sample(CENTER_Y, t) * scale
        const visorW = sample(WIDTH, t) * scale

        chartW = Math.round(visorW * 0.72)
        chartH = Math.round(visorW * 0.24)
        const size = `${chartW}x${chartH}`
        if (size !== lastSize) {
          lastSize = size
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          canvas.width = chartW * dpr
          canvas.height = chartH * dpr
          canvas.style.width = `${chartW}px`
          canvas.style.height = `${chartH}px`
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }

        anchor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) perspective(600px) rotateY(${sample(ROTATE_Y, t)}deg)`
      }

      if (animate) {
        const live = candles[candles.length - 1]
        live.c += (Math.random() - 0.48) * 1.1
        if (live.c > live.h) live.h = live.c
        if (live.c < live.l) live.l = live.c

        if (now - lastCandleAt > CANDLE_MS) {
          lastCandleAt = now
          candles.push(nextCandle(live.c))
          candles.shift()
        }
      }

      if (chartW > 0) drawChart(ctx, chartW, chartH, candles, now, animate)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [videoRef])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      <div ref={anchorRef} className="visor-laser absolute left-0 top-0 will-change-transform">
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  )
}
