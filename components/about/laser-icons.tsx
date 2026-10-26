import { useId } from 'react'

type IconProps = { className?: string }

export function LaserEye({ className }: IconProps) {
  const clipId = useId()
  return (
    <svg viewBox="0 0 48 48" fill="none" className={`laser-icon ${className ?? ''}`} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <path d="M5 26 L17 15 H31 L43 26 L31 37 H17 Z" />
        </clipPath>
      </defs>
      <path
        className="laser-draw"
        pathLength={100}
        d="M5 26 L17 15 H31 L43 26 L31 37 H17 Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle className="laser-draw laser-draw-delay" pathLength={100} cx="24" cy="26" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <circle className="laser-pupil" cx="24" cy="26" r="4.2" stroke="var(--color-gold-light)" strokeWidth="1.8" />
      <g className="laser-wedge">
        <path
          d="M26 24 L28.5 8.5 A13 13 0 0 1 38.5 17.5 Z"
          fill="color-mix(in oklab, var(--color-gold-light) 18%, transparent)"
          stroke="var(--color-gold-light)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </g>
      <g clipPath={`url(#${clipId})`}>
        <rect className="laser-scan-bar" x="-6" y="12" width="3" height="28" fill="var(--color-gold-light)" />
      </g>
    </svg>
  )
}

export function LaserTarget({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={`laser-icon ${className ?? ''}`} aria-hidden="true">
      <circle className="laser-draw" pathLength={100} cx="22" cy="26" r="16" stroke="currentColor" strokeWidth="1.8" />
      <circle className="laser-draw laser-draw-delay" pathLength={100} cx="22" cy="26" r="10.5" stroke="currentColor" strokeWidth="1.8" />
      <circle className="laser-bull" cx="22" cy="26" r="5" stroke="var(--color-gold-light)" strokeWidth="1.8" />
      <circle className="laser-impact" cx="22" cy="26" r="5" stroke="var(--color-gold-light)" strokeWidth="1.2" />
      <g className="laser-arrow">
        <line x1="22" y1="26" x2="40" y2="8" stroke="var(--color-gold-light)" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M37 6.5 L41.5 6.5 L41.5 11 M39.5 3.5 L44.5 3.5 L44.5 8.5"
          stroke="var(--color-gold-light)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
