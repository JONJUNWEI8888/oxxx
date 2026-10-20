import Image from 'next/image'
import { SynapseXLogo } from './logo'

export function Footer() {
  return (
    <footer className="flex min-h-[400px] flex-col overflow-hidden border-t border-gold/25 bg-black md:flex-row">
      <div className="relative h-[300px] w-full md:h-auto md:w-1/2">
        <Image
          src="/images/gold-bull-head.png"
          alt="金色华尔街公牛"
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex w-full flex-col justify-between p-10 sm:p-16 md:w-1/2">
        <div>
          <div className="mb-8 flex items-center gap-2.5">
            <SynapseXLogo className="size-[18px] text-gold" />
            <span className="text-[15px] font-medium tracking-tight text-gold-light">oxxx.io</span>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-foreground/50 sm:text-[15px]">
            The next evolution of human-machine interaction. Built for those who refuse to be
            limited by biology alone.
          </p>
        </div>
        <p className="mt-12 text-[12px] text-gold/50">
          {'\u00A9'} 2026 oxxx.io. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
