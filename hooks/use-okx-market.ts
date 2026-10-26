'use client'

import { useEffect, useRef, useState } from 'react'
import { type Candle, type Interval, MARKETS, MARKET_LIST, type MarketSymbol, OKX_BARS, type TradeMode, okxInstId } from '@/lib/markets'

const PUBLIC_WS = 'wss://ws.okx.com:8443/ws/v5/public'
const BUSINESS_WS = 'wss://ws.okx.com:8443/ws/v5/business'
const FLUSH_MS = 200
const PING_MS = 20000
const MAX_TRADES = 40
const BOOK_DEPTH = 20

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

type OkxArg = { channel: string; instId: string }
type OkxPush = { arg?: OkxArg; action?: 'snapshot' | 'update'; data?: Record<string, unknown>[] | unknown[][] }

function openSocket(url: string, args: OkxArg[], onPush: (msg: OkxPush) => void, onStatus: (s: ConnectionStatus) => void) {
  let ws: WebSocket | null = null
  let disposed = false
  let attempt = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let pingTimer: ReturnType<typeof setInterval> | undefined

  const connect = () => {
    onStatus(attempt === 0 ? 'connecting' : 'reconnecting')
    ws = new WebSocket(url)
    ws.onopen = () => {
      attempt = 0
      onStatus('open')
      ws?.send(JSON.stringify({ op: 'subscribe', args }))
      // OKX drops idle connections after 30s without traffic.
      pingTimer = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send('ping'), PING_MS)
    }
    ws.onmessage = (event) => {
      if (event.data === 'pong') return
      try {
        const msg = JSON.parse(event.data as string) as OkxPush
        if (msg.arg && msg.data) onPush(msg)
      } catch {
        // Ignore malformed frames.
      }
    }
    ws.onerror = () => ws?.close()
    ws.onclose = () => {
      clearInterval(pingTimer)
      if (disposed) return
      onStatus('reconnecting')
      retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 15000))
    }
  }

  connect()

  return () => {
    disposed = true
    clearTimeout(retryTimer)
    clearInterval(pingTimer)
    if (ws) {
      ws.onclose = null
      ws.close()
    }
  }
}

type BookSide = Map<string, number>

function applyLevels(side: BookSide, rows: string[][], sizeMultiplier: number) {
  for (const [price, size] of rows) {
    const qty = Number(size) * sizeMultiplier
    if (qty > 0) side.set(price, qty)
    else side.delete(price)
  }
}

function topLevels(side: BookSide, descending: boolean): BookLevel[] {
  return Array.from(side, ([price, qty]) => ({ price: Number(price), qty }))
    .sort((a, b) => (descending ? b.price - a.price : a.price - b.price))
    .slice(0, BOOK_DEPTH)
}

const symbolByInstId = (mode: TradeMode) => new Map(MARKET_LIST.map((m) => [okxInstId(m, mode), m.symbol as MarketSymbol]))

export function useOkxMarket(symbol: MarketSymbol, interval: Interval, mode: TradeMode) {
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

    const market = MARKETS[symbol]
    const instId = okxInstId(market, mode)
    const sizeMultiplier = mode === 'swap' ? market.ctVal : 1
    const instMap = symbolByInstId(mode)
    const bids: BookSide = new Map()
    const asks: BookSide = new Map()

    const args: OkxArg[] = [
      ...MARKET_LIST.map((m) => ({ channel: 'tickers', instId: okxInstId(m, mode) })),
      { channel: 'trades', instId },
      { channel: 'books', instId },
    ]
    if (mode === 'swap') {
      args.push(
        { channel: 'mark-price', instId },
        { channel: 'funding-rate', instId },
        { channel: 'index-tickers', instId: okxInstId(market, 'spot') },
      )
    }

    const updateMark = (patch: Partial<MarkInfo>) => {
      const prev = store.current.mark ?? { markPrice: Number.NaN, indexPrice: Number.NaN, fundingRate: Number.NaN, nextFundingTime: Number.NaN }
      store.current = { ...store.current, mark: { ...prev, ...patch } }
    }

    const close = openSocket(
      PUBLIC_WS,
      args,
      ({ arg, action, data }) => {
        if (!arg || !data) return
        const rows = data as Record<string, string>[]
        const cur = store.current

        switch (arg.channel) {
          case 'tickers': {
            const row = rows[0]
            const sym = instMap.get(row.instId)
            if (!sym) return
            const last = Number(row.last)
            const open = Number(row.open24h)
            const change = last - open
            const baseVolume = mode === 'swap' ? Number(row.volCcy24h) : Number(row.vol24h)
            const quoteVolume = mode === 'swap' ? baseVolume * last : Number(row.volCcy24h)
            store.current = {
              ...cur,
              tickers: {
                ...cur.tickers,
                [sym]: {
                  last,
                  change,
                  changePct: open ? (change / open) * 100 : 0,
                  high: Number(row.high24h),
                  low: Number(row.low24h),
                  volume: baseVolume,
                  quoteVolume,
                },
              },
            }
            break
          }
          case 'trades': {
            let { lastPrice, direction, trades } = cur
            for (const row of rows) {
              const price = Number(row.px)
              if (lastPrice !== null && price !== lastPrice) direction = price > lastPrice ? 'up' : 'down'
              lastPrice = price
              trades = [
                { id: Number(row.tradeId), price, qty: Number(row.sz) * sizeMultiplier, time: Number(row.ts), buyerMaker: row.side === 'sell' },
                ...trades,
              ]
            }
            store.current = { ...cur, lastPrice, direction, trades: trades.slice(0, MAX_TRADES) }
            break
          }
          case 'books': {
            const book = data[0] as unknown as { bids: string[][]; asks: string[][] }
            if (action === 'snapshot') {
              bids.clear()
              asks.clear()
            }
            applyLevels(bids, book.bids, sizeMultiplier)
            applyLevels(asks, book.asks, sizeMultiplier)
            store.current = { ...cur, bids: topLevels(bids, true), asks: topLevels(asks, false) }
            break
          }
          case 'mark-price':
            updateMark({ markPrice: Number(rows[0].markPx) })
            break
          case 'index-tickers':
            updateMark({ indexPrice: Number(rows[0].idxPx) })
            break
          case 'funding-rate':
            updateMark({ fundingRate: Number(rows[0].fundingRate), nextFundingTime: Number(rows[0].fundingTime) })
            break
          default:
            return
        }
        dirtyRef.current = true
      },
      (status) => {
        store.current = { ...store.current, status }
        dirtyRef.current = true
      },
    )

    return close
  }, [symbol, mode])

  useEffect(() => {
    const store = storeRef
    const market = MARKETS[symbol]
    const volumeIndex = mode === 'swap' ? 6 : 5
    return openSocket(
      BUSINESS_WS,
      [{ channel: `candle${OKX_BARS[interval]}`, instId: okxInstId(market, mode) }],
      ({ data }) => {
        const row = (data as string[][] | undefined)?.[0]
        if (!row) return
        store.current = {
          ...store.current,
          candle: {
            symbol,
            interval,
            time: Number(row[0]),
            open: Number(row[1]),
            high: Number(row[2]),
            low: Number(row[3]),
            close: Number(row[4]),
            volume: Number(row[volumeIndex]),
          },
        }
        dirtyRef.current = true
      },
      () => {},
    )
  }, [symbol, interval, mode])

  return snapshot
}
