'use client'

import { useRef } from 'react'
import { FOOTER_TRACK, VisorLaser } from './visor-laser'

export function FooterLlama({ src, className = '' }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div className={className}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover"
      />
      <VisorLaser videoRef={videoRef} track={FOOTER_TRACK} />
    </div>
  )
}
