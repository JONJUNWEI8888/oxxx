import { BgVideo } from './bg-video'
import { SynapseXLogo } from './logo'

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_080203_fd7f4f85-3a86-4837-8192-85e7bfe68e75.mp4'

const LINK_GROUPS = [
  { title: '产品', links: [{ label: '加密行情', href: '#markets' }, { label: '美股代币化', href: '#platform' }, { label: 'OX 私募', href: '#presale' }] },
  { title: '关于', links: [{ label: '关于 oxxx.io', href: '#about' }, { label: '代币信息', href: '#about' }, { label: '交易数据', href: '#metrics' }] },
  { title: '支持', links: [{ label: '私募地址', href: '#presale' }, { label: 'BSC 网络', href: '#presale' }, { label: '返回顶部', href: '#top' }] },
]

const DISCLAIMER =
  '本网站仅供一般信息用途，不构成出售要约或认购任何数字资产、证券或投资产品的邀约，亦不构成投资、金融、法律、税务或其他专业建议。投资数字资产涉及极高风险。衍生品或其他杠杆产品亦涉及很高交易风险，可能导致全部本金，甚至更多的损失。您确认您具备相应的财务能力、风险承受力、投资者成熟度以及数字资产和证券交易的投资知识与经验，并接受在本平台交易的风险。您对自己的投资行为承担全部责任，并应咨询独立的专业顾问。我们不对本网站所载信息的准确性、完整性或适用性作出任何明示或暗示的陈述、保证或担保；oxxx.io 保留对本网站所有内容的最终解释权。'

export function Footer() {
  return (
    <footer className="relative flex flex-col overflow-hidden border-t border-gold/25 bg-black">
      <div className="relative flex min-h-[480px] flex-col md:flex-row">
      <div className="relative h-[320px] w-full md:h-auto md:w-1/2">
        <BgVideo src={VIDEO} className="absolute inset-0 size-full" />
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
      </div>
      <section aria-labelledby="disclaimer-title" className="relative border-t border-gold/15 px-6 py-10 sm:px-16">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <h2 id="disclaimer-title" className="text-[12px] uppercase tracking-[0.25em] text-gold/70">
            免责声明
          </h2>
          <p className="text-pretty text-[14px] leading-relaxed text-foreground/45">
            {DISCLAIMER}
          </p>
        </div>
      </section>
    </footer>
  )
}
