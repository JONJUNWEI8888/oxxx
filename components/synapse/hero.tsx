'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { ScrambleIn } from './scramble'

const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_083515_290e5a10-0b95-41af-a5e2-32b6389baa4d.mp4'

const SENSITIVITY = 0.8
const headingClass =
  'text-white font-light leading-[0.95] tracking-[-0.03em] text-[clamp(40px,10vw,100px)]'

function useMouseScrub() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let lastX: number | null = null
    let targetTime = 0
    let seeking = false

    const seekTo = () => {
      if (!video.duration) return
      seeking = true
      video.currentTime = targetTime
    }

    const onSeeked = () => {
      seeking = false
      if (Math.abs(video.currentTime - targetTime) > 0.01) seekTo()
    }

    const onMove = (e: MouseEvent) => {
      if (lastX === null) {
        lastX = e.clientX
        return
      }
      const delta = e.clientX - lastX
      lastX = e.clientX
      if (!video.duration) return
      const timeDelta = (delta / window.innerWidth) * video.duration * SENSITIVITY
      targetTime = Math.min(Math.max(targetTime + timeDelta, 0), video.duration - 0.05)
      if (!seeking) seekTo()
    }

    video.pause()
    video.currentTime = 0
    video.addEventListener('seeked', onSeeked)
    window.addEventListener('mousemove', onMove)
    return () => {
      video.removeEventListener('seeked', onSeeked)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return videoRef
}

export function Hero({ entranceComplete }: { entranceComplete: boolean }) {
  const videoRef = useMouseScrub()

  return (
    <section className="relative h-screen h-[100dvh] w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={HERO_VIDEO}
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 size-full object-cover"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: entranceComplete ? 1 : 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 flex size-full flex-col px-4 pb-8 pt-20 sm:px-6 sm:pb-12 sm:pt-24 md:px-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center opacity-10"
          style={{ transform: 'translateY(calc(-50% + 50px))' }}
        >
          <span
            className="select-none whitespace-nowrap font-display uppercase leading-none"
            style={{
              fontSize: 'clamp(120px, 30vw, 521px)',
              letterSpacing: '-4px',
              backgroundImage: 'radial-gradient(circle, rgba(142,127,148,0) 0%, #8E7F94 70%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Transcendence
          </span>
        </div>

        <div className="flex-1" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4">
            <h1 className={headingClass}>
              <ScrambleIn text="下一个" delay={200} triggered={entranceComplete} />
              <br />
              <ScrambleIn text="独角兽交易所" delay={500} triggered={entranceComplete} />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 25 }}
              animate={entranceComplete ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
              transition={{ duration: 0.9, ease: [0.215, 0.61, 0.355, 1], delay: 0.2 }}
              className="max-w-sm text-[13px] leading-relaxed text-white/60 sm:text-[15px]"
            >
              公牛代表力量，也代表坚定向前的姿态。对 OXXX
              而言，我们的目标是定义为下一代交易所UEX，迈向全景加密交易的新里程碑。
            </motion.p>
          </div>

          <h2 className={`${headingClass} text-left md:text-right`}>
            <ScrambleIn text="加密" delay={700} triggered={entranceComplete} />
            <br />
            <ScrambleIn text="革命" delay={1000} triggered={entranceComplete} />
          </h2>
        </div>
      </motion.div>
    </section>
  )
}
