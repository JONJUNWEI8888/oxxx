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

function sample(track: number[], time: number) {
  const pos = Math.max(0, time / STEP)
  const i = Math.min(Math.floor(pos), track.length - 1)
  const j = Math.min(i + 1, track.length - 1)
  const f = pos - i
  return track[i] + (track[j] - track[i]) * Math.min(f, 1)
}

export function VisorLaser({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const anchor = anchorRef.current
    const video = videoRef.current
    if (!anchor || !video) return

    let frame = 0
    let lastKey = ''

    const tick = () => {
      frame = requestAnimationFrame(tick)
      const w = video.clientWidth
      const h = video.clientHeight
      const t = video.currentTime
      const key = `${w}|${h}|${t.toFixed(3)}`
      if (key === lastKey) return
      lastKey = key

      const scale = Math.max(w / VIDEO_W, h / VIDEO_H)
      const offX = (w - VIDEO_W * scale) / 2
      const offY = (h - VIDEO_H * scale) / 2
      const x = offX + sample(CENTER_X, t) * scale
      const y = offY + sample(CENTER_Y, t) * scale
      const visorW = sample(WIDTH, t) * scale

      anchor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) perspective(600px) rotateY(${sample(ROTATE_Y, t)}deg)`
      anchor.style.fontSize = `${visorW * 0.105}px`
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [videoRef])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      <div ref={anchorRef} className="visor-laser absolute left-0 top-0 will-change-transform">
        <span className="visor-laser-text">OXXX.IO</span>
        <span className="visor-laser-beam" />
      </div>
    </div>
  )
}
