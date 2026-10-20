import Image from 'next/image'
import { SynapseXLogo } from './logo'

const LINK_GROUPS = [
  { title: '产品', links: [{ label: '加密行情', href: '#markets' }, { label: '美股代币化', href: '#platform' }, { label: 'OX 私募', href: '#presale' }] },
  { title: '关于', links: [{ label: '关于 oxxx.io', href: '#about' }, { label: '代币信息', href: '#about' }, { label: '交易数据', href: '#metrics' }] },
  { title: '支持', links: [{ label: '私募地址', href: '#presale' }, { label: 'BSC 网络', href: '#presale' }, { label: '返回顶部', href: '#top' }] },
]

export function Footer() {
  return (
    <footer className="relative flex min-h-[480px] flex-col overflow-hidden border-t border-gold/25 bg-black md:flex-row">
      <div className="relative h-[320px] w-full md:h-auto md:w-1/2">
        <Image
          src="/images/gold-bull-head.png"
          alt="金色华尔街公牛"
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-r from-transparent to-black md:block" />
      </div>
      <div className="relative flex w-full flex-col justify-between gap-12 p-10 sm:p-16 md:w-1/2">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-2.5">
            <SynapseXLogo className="size-[18px] text-gold" />
            <span className="text-[15px] font-medium tracking-tight text-gold-light">oxxx.io</span>
          </div>
          <p className="max-w-sm text-pretty text-[14px] leading-relaxed text-foreground/60 sm:text-[15px]">
            公牛代表力量，也代表坚定向前的姿态。oxxx.io 致力于成为下一代交易所 UEX，迈向全景加密交易的新里程碑。
          </p>
          <nav aria-label="页脚导航" className="grid grid-cols-3 gap-6 border-t border-gold/15 pt-8">
            {LINK_GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-3">
                <h3 className="text-[12px] uppercase tracking-[0.25em] text-gold">{group.title}</h3>
                <ul className="flex flex-col gap-2">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text-[13px] text-foreground/55 transition-colors hover:text-gold-light">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-4">
          <p aria-hidden="true" className="font-display text-[64px] leading-none text-gold-gradient sm:text-[88px]">
            OXXX
          </p>
          <p className="text-[12px] text-gold/50">{'\u00A9'} 2026 oxxx.io. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
