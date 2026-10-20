const ITEMS = ['BTC', 'ETH', 'BNB', 'USDT', 'OX', '美股代币化', 'UEX', '华尔街公牛', 'oxxx.io']

export function TickerTape() {
  const loop = [...ITEMS, ...ITEMS]
  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden border-y border-gold/25 bg-gold-deep py-3"
    >
      <div className="flex w-max animate-marquee gap-10">
        {loop.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="flex items-center gap-2 text-[13px] uppercase tracking-[0.25em] text-gold-light/80"
          >
            <span className="text-gold">{'▲'}</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
