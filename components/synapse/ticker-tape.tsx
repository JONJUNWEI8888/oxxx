'use client'

import { useI18n } from '@/lib/i18n'
import { ParticleField } from './particle-field'

type Partner = {
  name: string
  icon?: { src: string; className: string }
  wordmark?: string
  wordmarkClassName?: string
}

const PARTNERS: Partner[] = [
  {
    name: 'Ethereum Foundation',
    icon: { src: '/partners/ethereum.svg', className: 'h-9 w-6' },
    wordmark: 'Ethereum Foundation',
    wordmarkClassName: 'font-sans font-semibold tracking-tight',
  },
  {
    name: 'Binance',
    icon: { src: '/partners/binance2.svg', className: 'size-8' },
    wordmark: 'BINANCE',
    wordmarkClassName: 'font-sans font-bold tracking-[0.18em]',
  },
  {
    name: 'Tether',
    icon: { src: '/partners/tether.svg', className: 'size-8' },
    wordmark: 'tether',
    wordmarkClassName: 'font-sans font-bold tracking-tight',
  },
  {
    name: 'AWS',
    icon: { src: '/partners/aws.svg', className: 'h-12 w-16' },
  },
  {
    name: 'MetaMask',
    icon: { src: '/partners/metamask.svg', className: 'size-9' },
    wordmark: 'METAMASK',
    wordmarkClassName: 'font-sans font-bold tracking-[0.14em]',
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
    <div className="flex shrink-0 items-center gap-3 text-foreground/60 transition-all duration-300 hover:text-foreground hover:drop-shadow-[0_0_14px_var(--primary)]">
      {partner.icon && (
        <span
          className={`block shrink-0 bg-current ${partner.icon.className}`}
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
  const { t } = useI18n()
  const loop = [...PARTNERS, ...PARTNERS]

  return (
    <section
      aria-labelledby="partners-title"
      className="relative isolate overflow-hidden bg-background py-20 md:py-28"
    >
      <ParticleField className="pointer-events-none absolute inset-0 -z-10 size-full text-primary" />

      <h2
        id="partners-title"
        className="text-balance text-center font-sans text-3xl font-bold text-foreground md:text-5xl"
      >
        {t('全球生态伙伴', 'Global Ecosystem Partners')}
      </h2>

      <ul className="sr-only">
        {PARTNERS.map((p) => (
          <li key={p.name}>{p.name}</li>
        ))}
      </ul>

      <div
        aria-hidden="true"
        className="group relative mt-14 overflow-hidden border-y border-primary/15 py-10 md:mt-20"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 w-40 animate-scan bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px animate-scan bg-primary/70 shadow-[0_0_16px_var(--primary)] [animation-delay:-0.4s]" />

        <div className="flex w-max animate-marquee items-center gap-20 pr-20 group-hover:[animation-play-state:paused] md:gap-28 md:pr-28">
          {loop.map((partner, i) => (
            <PartnerLogo key={`${partner.name}-${i}`} partner={partner} />
          ))}
        </div>
      </div>
    </section>
  )
}
