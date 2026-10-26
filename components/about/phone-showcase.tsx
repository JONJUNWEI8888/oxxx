'use client'

import { animate, motion, useAnimationFrame, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Rotate3d } from 'lucide-react'
import Image from 'next/image'
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

const EDGE_LAYERS = 12
const DEPTH_STEP = 1.1
const PHONE_RADIUS = 'rounded-[15.8%/7.7%]'

type Props = {
  label: string
  hint: string
}

export function PhoneShowcase({ label, hint }: Props) {
  const reduceMotion = useReducedMotion()
  const swayY = useMotionValue(0)
  const swayX = useMotionValue(0)
  const dragY = useMotionValue(0)
  const dragX = useMotionValue(0)
  const drag = useRef<{ x: number; y: number; rotY: number; rotX: number } | null>(null)

  const rotateY = useTransform(() => swayY.get() + dragY.get())
  const rotateX = useTransform(() => swayX.get() + dragX.get())
  const sheenPosition = useTransform(rotateY, (v) => `${50 - ((((v % 360) + 540) % 360) - 180) * 0.6}% 0%`)
  const shadowScale = useTransform(rotateY, (v) => 0.75 + Math.abs(Math.cos((v * Math.PI) / 180)) * 0.25)

  useAnimationFrame((t) => {
    if (reduceMotion) return
    const idle = drag.current ? 0.35 : 1
    swayY.set(Math.sin(t / 1900) * 22 * idle)
    swayX.set(Math.sin(t / 2700) * 6 * idle + 4)
  })

  const settle = () => {
    const target = Math.round(dragY.get() / 360) * 360
    animate(dragY, target, {
      type: 'spring',
      stiffness: 60,
      damping: 14,
      onComplete: () => dragY.set(0),
    })
    animate(dragX, 0, { type: 'spring', stiffness: 80, damping: 14 })
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragY.stop()
    dragX.stop()
    drag.current = { x: e.clientX, y: e.clientY, rotY: dragY.get(), rotX: dragX.get() }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    dragY.set(drag.current.rotY + dx * 0.6)
    dragX.set(Math.max(-28, Math.min(28, drag.current.rotX - dy * 0.3)))
  }

  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    settle()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const step = e.key === 'ArrowLeft' ? -45 : 45
    animate(dragY, dragY.get() + step, {
      type: 'spring',
      stiffness: 70,
      damping: 15,
      onComplete: () => {
        if (Math.abs(dragY.get()) >= 360) dragY.set(dragY.get() % 360)
      },
    })
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex w-full justify-center [perspective:1400px]">
        <div aria-hidden="true" className="phone-halo pointer-events-none absolute inset-x-0 top-1/2 mx-auto aspect-square w-[130%] max-w-md -translate-y-1/2" />

        <motion.div
          role="img"
          aria-label={label}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          style={{ rotateY, rotateX, transformStyle: 'preserve-3d' }}
          className="relative aspect-[696/1433] w-52 cursor-grab touch-pan-y select-none rounded-[2.5rem] outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-8 focus-visible:ring-offset-background sm:w-60"
        >
          {Array.from({ length: EDGE_LAYERS }, (_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={`phone-edge absolute inset-0 ${PHONE_RADIUS}`}
              style={{ transform: `translateZ(${-(i + 1) * DEPTH_STEP}px)` }}
            />
          ))}

          <div
            aria-hidden="true"
            className={`phone-back absolute inset-0 flex flex-col items-center justify-center gap-3 ${PHONE_RADIUS}`}
            style={{ transform: `translateZ(${-(EDGE_LAYERS + 1) * DEPTH_STEP}px) rotateY(180deg)`, backfaceVisibility: 'hidden' }}
          >
            <span className="phone-camera absolute left-[9%] top-[5%] size-[30%] rounded-[28%]" />
            <span className="font-display text-3xl tracking-[0.3em] text-gold">OXXX</span>
          </div>

          <div
            className={`absolute inset-0 overflow-hidden ${PHONE_RADIUS}`}
            style={{ transform: 'translateZ(0.5px)', backfaceVisibility: 'hidden' }}
          >
            <Image
              src="/images/about/phone-depth.png"
              alt=""
              fill
              sizes="(min-width: 640px) 240px, 208px"
              draggable={false}
              className="pointer-events-none object-cover"
            />
            <motion.div
              aria-hidden="true"
              className="phone-sheen pointer-events-none absolute inset-0"
              style={{ backgroundPosition: sheenPosition }}
            />
          </div>
        </motion.div>

        <motion.div
          aria-hidden="true"
          style={{ scaleX: shadowScale }}
          className="phone-floor pointer-events-none absolute -bottom-8 left-1/2 h-6 w-48 -translate-x-1/2 rounded-full"
        />
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm text-foreground/50">
        <Rotate3d className="size-4 text-gold" aria-hidden="true" />
        {hint}
      </p>
    </div>
  )
}
