'use client'

import { useEffect, useRef, useState } from 'react'
import type { Candle, Interval, MarketSymbol } from '@/lib/markets'

const MARKET_WS = 'wss://fstream.binance.com/market/stream?streams='
const PUBLIC_WS = 'wss://fstream.binance.com/public/stream?streams='
const FLUSH_MS = 200
const MAX_TRADES = 40

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting'
export type BookLevel = { price: number; qty: number }
export type Trade = { id: number; price: number; qty: number; time: number; buyerMaker: boolean }
export type Ticker = {
  last: number
  change: number
  changePct: number
  high: number
  low: number
  volume: number
  quoteVolume: number
}
export type MarkInfo = { markPrice: number; indexPrice: number; fundingRate: number; nextFundingTime: number }
export type LiveCandle = Candle & { symbol: string; interval: string }

export type MarketSnapshot = {
  status: ConnectionStatus
  lastPrice: number | null
  direction: 'up' | 'down' | null
  tickers: Partial<Record<MarketSymbol, Ticker>>
  mark: MarkInfo | null
  bids: BookLevel[]
  asks: BookLevel[]
  trades: Trade[]
  candle: LiveCandle | null
}

function createEmpty(): MarketSnapshot {
  return {
    status: 'connecting',
    lastPrice: null,
    direction: null,
    tickers: {},
    mark: null,
    bids: [],
    asks: [],
    trades: [],
    candle: null,
  }
}

type StreamMessage = { stream: string; data: Record<string, unknown> & { e: string } }

function openSocket(url: string, onMessage: (msg: StreamMessage) => void, onStatus: (s: ConnectionStatus) => void) {
  let ws: WebSocket | null = null
  let disposed = false
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const connect = () => {
    onStatus(attempt === 0 ? 'connecting' : 'reconnecting')
    ws = new WebSocket(url)
    ws.onopen = () => {
      attempt = 0
      onStatus('open')
    }
    ws.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data as string) as StreamMessage)
      } catch {
        // Ignore malformed frames.
      }
    }
    ws.onerror = () => ws?.close()
    ws.onclose = () => {
      if (disposed) return
      onStatus('reconnecting')
      timer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 15000))
    }
  }

  connect()

  return () => {
    disposed = true
    clearTimeout(timer)
    if (ws) {
      ws.onclose = null
      ws.close()
    }
  }
}

const toLevels = (rows: unknown) =>
  (rows as [string, string][])
    .map(([price, qty]) => ({ price: Number(price), qty: Number(qty) }))
    .filter((level) => level.qty > 0)

export function useBinanceMarket(symbol: MarketSymbol, interval: Interval) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot>(createEmpty)
  const storeRef = useRef<MarketSnapshot>(createEmpty())
  const dirtyRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => {
      if (!dirtyRef.current) return
      dirtyRef.current = false
      setSnapshot({ ...storeRef.current })
    }, FLUSH_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const store = storeRef
    store.current = { ...createEmpty(), tickers: store.current.tickers, candle: store.current.candle }
    dirtyRef.current = true
    const s = symbol.toLowerCase()

    const closeMarket = openSocket(
      MARKET_WS + [`${s}@aggTrade`, `${s}@markPrice@1s`, 'btcusdt@ticker', 'ethusdt@ticker'].join('/'),
      ({ data }) => {
        const cur = store.current
        if (data.e === 'aggTrade') {
          const price = Number(data.p)
          const direction = cur.lastPrice === null || price === cur.lastPrice ? cur.direction : price > cur.lastPrice ? 'up' : 'down'
          const trade: Trade = {
            id: Number(data.a),
            price,
            qty: Number(data.q),
            time: Number(data.T),
            buyerMaker: Boolean(data.m),
          }
          store.current = { ...cur, lastPrice: price, direction, trades: [trade, ...cur.trades].slice(0, MAX_TRADES) }
        } else if (data.e === '24hrTicker') {
          const ticker: Ticker = {
            last: Number(data.c),
            change: Number(data.p),
            changePct: Number(data.P),
            high: Number(data.h),
            low: Number(data.l),
            volume: Number(data.v),
            quoteVolume: Number(data.q),
          }
          store.current = { ...cur, tickers: { ...cur.tickers, [data.s as MarketSymbol]: ticker } }
        } else if (data.e === 'markPriceUpdate') {
          store.current = {
            ...cur,
            mark: {
              markPrice: Number(data.p),
              indexPrice: Number(data.i),
              fundingRate: Number(data.r),
              nextFundingTime: Number(data.T),
            },
          }
        } else {
          return
        }
        dirtyRef.current = true
      },
      (status) => {
        store.current = { ...store.current, status }
        dirtyRef.current = true
      },
    )

    const closeDepth = openSocket(
      PUBLIC_WS + `${s}@depth20@500ms`,
      ({ data }) => {
        if (data.e !== 'depthUpdate') return
        store.current = { ...store.current, bids: toLevels(data.b), asks: toLevels(data.a) }
        dirtyRef.current = true
      },
      () => {},
    )

    return () => {
      closeMarket()
      closeDepth()
    }
  }, [symbol])

  useEffect(() => {
    const store = storeRef
    const closeKline = openSocket(
      MARKET_WS + `${symbol.toLowerCase()}@kline_${interval}`,
      ({ data }) => {
        if (data.e !== 'kline') return
        const k = data.k as Record<string, string | number>
        store.current = {
          ...store.current,
          candle: {
            symbol: String(k.s),
            interval: String(k.i),
            time: Number(k.t),
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
            volume: Number(k.v),
          },
        }
        dirtyRef.current = true
      },
      () => {},
    )
    return closeKline
  }, [symbol, interval])

  return snapshot
}
