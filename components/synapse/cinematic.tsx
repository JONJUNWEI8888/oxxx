'use client'

import { motion, useMotionTemplate, useScroll, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { BgVideo } from './bg-video'

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_092455_089c54f8-3b03-4966-9df1-e9746063d0ef.mp4'

export function Cinematic() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 15, damping: 32, mass: 1.8 })
  const yScaleValue = useTransform(smooth, [0, 1], [60, -120])
  const opacity = useTransform(smooth, [0.3, 0.5], [0, 1])
  const transform = useMotionTemplate`rotateX(24deg) translateY(${yScaleValue}px) translateZ(15px)`

  return (
    <section
      id="about"
      ref={ref}
      className="relative flex h-screen h-[100dvh] w-full items-center justify-center overflow-hidden bg-black"
    >
      <BgVideo src={VIDEO} className="absolute inset-0 size-full" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[180px]"
        style={{ background: 'linear-gradient(to bottom, #010103, transparent)' }}
      />
      <div className="relative z-20 w-full max-w-5xl" style={{ perspective: '400px' }}>
        <motion.p
          style={{ transform, opacity }}
          className="select-none px-6 text-center font-sans text-[22px] font-normal leading-[1.35] tracking-[-0.02em] text-white sm:px-12 sm:text-[30px] md:text-[36px] lg:text-[42px]"
        >
          A neural-AI interface built on the architecture of the human nervous system. oxxx.io
          translates synaptic activity into computational intelligence. Every signal becomes
          measurable, structured, and visible. It continuously reconstructs internal state as a
          dynamic neural map. Biological noise is filtered into actionable cognitive patterns.
        </motion.p>
      </div>
    </section>
  )
}
