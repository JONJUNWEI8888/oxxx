import { NextResponse } from 'next/server'
import { PRESALE } from '@/lib/presale'

const RPC_URLS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed1.ninicoin.io',
]

const BALANCE_OF_SELECTOR = '0x70a08231'

async function readUsdtBalance(): Promise<bigint> {
  const data =
    BALANCE_OF_SELECTOR + PRESALE.address.toLowerCase().replace('0x', '').padStart(64, '0')

  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{ to: PRESALE.usdtContract, data }, 'latest'],
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      })
      const json = (await res.json()) as { result?: string }
      if (json.result) return BigInt(json.result)
    } catch {
      continue
    }
  }
  throw new Error('All BSC RPC endpoints failed')
}

export async function GET() {
  try {
    const raw = await readUsdtBalance()
    const unit = BigInt('1000000000000000000')
    const whole = raw / unit
    const fraction = Number(raw % unit) / 1e18
    const raised = Number(whole) + fraction

    return NextResponse.json(
      { raised, updatedAt: Date.now() },
      { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=30' } },
    )
  } catch {
    return NextResponse.json({ error: 'Unable to read on-chain balance' }, { status: 502 })
  }
}
