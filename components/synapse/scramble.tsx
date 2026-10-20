'use client'

import { useEffect, useState } from 'react'

const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><'

const randomChar = () => CHARS[Math.floor(Math.random() * CHARS.length)]

export function ScrambleIn({
  text,
  delay,
  triggered,
}: {
  text: string
  delay: number
  triggered: boolean
}) {
  const [display, setDisplay] = useState<string | null>(null)

  useEffect(() => {
    if (!triggered) return
    let interval: ReturnType<typeof setInterval> | undefined
    const timeout = setTimeout(() => {
      let cursor = 0
      interval = setInterval(() => {
        cursor += 0.5
        const revealed = Math.floor(cursor)
        const next = text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' '
            if (i < revealed) return char
            if (i < revealed + 3) return randomChar()
            return ''
          })
          .join('')
        setDisplay(next)
        if (revealed >= text.length) {
          setDisplay(text)
          clearInterval(interval)
        }
      }, 25)
    }, delay)
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [text, delay, triggered])

  if (!triggered || display === null) return <span aria-label={text}>&nbsp;</span>
  return <span aria-label={text}>{display || '\u00A0'}</span>
}

export function ScrambleText({
  text,
  isHovered,
  className,
}: {
  text: string
  isHovered: boolean
  className?: string
}) {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    if (!isHovered) {
      setDisplay(text)
      return
    }
    let frame = 0
    const interval = setInterval(() => {
      frame += 1
      const revealed = Math.floor(frame / 4)
      setDisplay(
        text
          .split('')
          .map((char, i) => (char === ' ' ? ' ' : i < revealed ? char : randomChar()))
          .join(''),
      )
      if (revealed >= text.length) {
        setDisplay(text)
        clearInterval(interval)
      }
    }, 25)
    return () => clearInterval(interval)
  }, [isHovered, text])

  return (
    <span className={className} aria-label={text}>
      {display}
    </span>
  )
}
