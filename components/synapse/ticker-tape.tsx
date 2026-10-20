type Partner = {
  name: string
  icon?: { src: string; className: string }
  wordmark?: string
  wordmarkClassName?: string
}

const PARTNERS: Partner[] = [
  {
    name: 'Binance',
    icon: { src: '/partners/binance2.svg', className: 'size-8' },
    wordmark: 'BINANCE',
    wordmarkClassName: 'font-sans font-bold tracking-[0.18em]',
  },
  {
    name: 'AWS',
    icon: { src: '/partners/aws.svg', className: 'h-12 w-16' },
  },
  {
    name: 'YZi Labs',
    wordmark: 'YZi Labs',
    wordmarkClassName: 'font-sans font-black tracking-tight',
  },
  {
    name: 'TRON',
    wordmark: 'TRON',
    wordmarkClassName: 'font-sans font-extrabold tracking-[0.3em]',
  },
  {
    name: 'Solana',
    icon: { src: '/partners/solana2.svg', className: 'size-7' },
    wordmark: 'SOLANA',
    wordmarkClassName: 'font-sans font-semibold tracking-[0.28em]',
  },
  {
    name: 'TOKEN2049',
    wordmark: 'TOKEN2049',
    wordmarkClassName: 'font-sans font-bold tracking-[0.08em]',
  },
]

function PartnerLogo({ partner }: { partner: Partner }) {
  return (
    <div className="flex shrink-0 items-center gap-3 text-foreground/70 transition-colors duration-300 hover:text-foreground">
      {partner.icon && (
        <span
          className={`block bg-current ${partner.icon.className}`}
          style={{
            maskImage: `url(${partner.icon.src})`,
            WebkitMaskImage: `url(${partner.icon.src})`,
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          }}
        />
      )}
      {partner.wordmark && (
        <span className={`whitespace-nowrap text-2xl md:text-3xl ${partner.wordmarkClassName ?? ''}`}>
          {partner.wordmark}
        </span>
      )}
    </div>
  )
}

export function TickerTape() {
  const loop = [...PARTNERS, ...PARTNERS]

  return (
    <section aria-labelledby="partners-title" className="relative bg-background py-20 md:py-28">
      <h2
        id="partners-title"
        className="text-balance text-center font-sans text-3xl font-bold text-foreground md:text-5xl"
      >
        全球生态伙伴
      </h2>

      <ul className="sr-only">
        {PARTNERS.map((p) => (
          <li key={p.name}>{p.name}</li>
        ))}
      </ul>

      <div
        aria-hidden="true"
        className="group relative mt-14 overflow-hidden md:mt-20"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
      >
        <div className="flex w-max animate-marquee items-center gap-20 pr-20 group-hover:[animation-play-state:paused] md:gap-28 md:pr-28">
          {loop.map((partner, i) => (
            <PartnerLogo key={`${partner.name}-${i}`} partner={partner} />
          ))}
        </div>
      </div>
    </section>
  )
}
