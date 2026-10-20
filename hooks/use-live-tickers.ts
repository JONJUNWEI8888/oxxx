'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { ALL_SYMBOLS, type Ticker } from '@/lib/markets'

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<{ tickers: Ticker[] }>)

type MiniTicker = { s: string; c: string; o: string }

const STREAM_URL = `wss://data-stream.binance.vision/stream?streams=${ALL_SYMBOLS.map(
  (s) => `${s.toLowerCase()}@miniTicker`,
).join('/')}`

export function useLiveTickers() {
  const { data } = useSWR('/api/tickers', fetcher, { refreshInterval: 20000 })
  const [live, setLive] = useState<Record<string, Ticker>>({})
  const pending = useRef<Record<string, Ticker>>({})

  useEffect(() => {
    let ws: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let closed = false

    const connect = () => {
      ws = new WebSocket(STREAM_URL)
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data) as { data?: MiniTicker }
        const t = msg.data
        if (!t) return
        const price = Number(t.c)
        const open = Number(t.o)
        pending.current[t.s] = {
          symbol: t.s,
          price,
          changePercent: open ? ((price - open) / open) * 100 : 0,
        }
      }
      ws.onclose = () => {
        if (!closed) retry = setTimeout(connect, 3000)
      }
    }
    connect()

    const flush = setInterval(() => {
      const batch = pending.current
      if (Object.keys(batch).length === 0) return
      pending.current = {}
      setLive((prev) => ({ ...prev, ...batch }))
    }, 1000)

    return () => {
      closed = true
      clearTimeout(retry)
      clearInterval(flush)
      ws?.close()
    }
  }, [])

  return useMemo(() => {
    const map: Record<string, Ticker> = {}
    for (const t of data?.tickers ?? []) map[t.symbol] = t
    return { ...map, ...live }
  }, [data, live])
}
