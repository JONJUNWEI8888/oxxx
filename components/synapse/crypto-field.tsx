'use client'

import { useEffect, useRef } from 'react'

const SYMBOLS = ['₿', 'Ξ', '₮', 'OX', 'BNB', '$']
const GOLD = '#d4af37'
const GOLD_LIGHT = '#f5d98b'
const GOLD_DARK = '#4a360c'
const CANDLE_GAP = 16

type Coin = {
  x: number
  y: number
  r: number
  vy: number
  vx: number
  rot: number
  vr: number
  sym: string
  alpha: number
}

type Candle = { o: number; c: number; hi: number; lo: number }

type Props = {
  density?: number
  candles?: boolean
  className?: string
}

export function CryptoField({ density = 16, candles = true, className = '' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    let coins: Coin[] = []
    let series: Candle[] = []
    let offset = 0
    let raf = 0
    let running = false

    const makeCoin = (anywhere: boolean): Coin => {
      const r = 9 + Math.random() * 24
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + r * 2,
        r,
        vy: 0.15 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.12,
        rot: Math.random() * Math.PI * 2,
        vr: 0.006 + Math.random() * 0.014,
        sym: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        alpha: 0.2 + (r / 33) * 0.55,
      }
    }

    const nextCandle = (prev?: Candle): Candle => {
      const o = prev ? prev.c : 100
      const c = o + (Math.random() - 0.42) * 6
      return {
        o,
        c,
        hi: Math.max(o, c) + Math.random() * 3,
        lo: Math.min(o, c) - Math.random() * 3,
      }
    }

    const seedSeries = () => {
      const count = Math.ceil(w / CANDLE_GAP) + 2
      series = []
      for (let i = 0; i < count; i++) series.push(nextCandle(series[i - 1]))
    }

    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      coins = Array.from({ length: density }, () => makeCoin(true))
      if (candles) seedSeries()
    }

    const drawCandles = () => {
      const top = h * 0.55
      const bottom = h - 24
      const values = series.flatMap((s) => [s.hi, s.lo])
      const min = Math.min(...values)
      const max = Math.max(...values)
      const scale = (v: number) => bottom - ((v - min) / (max - min || 1)) * (bottom - top)

      ctx.save()
      ctx.globalAlpha = 0.22
      ctx.lineWidth = 1
      series.forEach((s, i) => {
        const x = i * CANDLE_GAP - offset
        const up = s.c >= s.o
        ctx.strokeStyle = up ? GOLD : GOLD_DARK
        ctx.beginPath()
        ctx.moveTo(x, scale(s.hi))
        ctx.lineTo(x, scale(s.lo))
        ctx.stroke()
        const y1 = scale(Math.max(s.o, s.c))
        const bodyH = Math.max(2, Math.abs(scale(s.o) - scale(s.c)))
        if (up) {
          ctx.fillStyle = GOLD
          ctx.fillRect(x - 4, y1, 8, bodyH)
        } else {
          ctx.strokeRect(x - 4, y1, 8, bodyH)
        }
      })

      ctx.globalAlpha = 0.5
      ctx.strokeStyle = GOLD_LIGHT
      ctx.lineWidth = 1.25
      ctx.beginPath()
      series.forEach((s, i) => {
        const x = i * CANDLE_GAP - offset
        const y = scale(s.c)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.restore()
    }

    const drawCoin = (coin: Coin) => {
      const flip = Math.cos(coin.rot)
      ctx.save()
      ctx.translate(coin.x, coin.y)
      ctx.scale(Math.max(Math.abs(flip), 0.08), 1)
      ctx.globalAlpha = coin.alpha

      const g = ctx.createRadialGradient(-coin.r * 0.35, -coin.r * 0.35, coin.r * 0.1, 0, 0, coin.r)
      g.addColorStop(0, '#fff4cc')
      g.addColorStop(0.45, GOLD)
      g.addColorStop(1, GOLD_DARK)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, coin.r, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(255, 236, 170, 0.55)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(0, 0, coin.r * 0.78, 0, Math.PI * 2)
      ctx.stroke()

      if (Math.abs(flip) > 0.35) {
        const size = coin.sym.length > 1 ? coin.r * 0.55 : coin.r * 0.95
        ctx.fillStyle = '#2b1f06'
        ctx.font = `700 ${size}px "Space Mono", monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(coin.sym, 0, coin.r * 0.05)
      }
      ctx.restore()
    }

    const frame = () => {
      ctx.clearRect(0, 0, w, h)
      if (candles) {
        offset += 0.35
        if (offset >= CANDLE_GAP) {
          offset -= CANDLE_GAP
          series.shift()
          series.push(nextCandle(series[series.length - 1]))
        }
        drawCandles()
      }
      coins.forEach((coin, i) => {
        coin.y -= coin.vy
        coin.x += coin.vx
        coin.rot += coin.vr
        if (coin.y < -coin.r * 2) coins[i] = makeCoin(false)
        drawCoin(coin)
      })
      if (running) raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (running || reduceMotion) return
      running = true
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    resize()
    frame()

    const ro = new ResizeObserver(() => {
      resize()
      if (!running) frame()
    })
    ro.observe(canvas)

    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()))
    io.observe(canvas)

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
    }
  }, [density, candles])

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none ${className}`} />
}
