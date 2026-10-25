'use client'

import { useI18n } from '@/lib/i18n'
import { FooterLlama } from './footer-llama'
import { SynapseXLogo } from './logo'

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_080203_fd7f4f85-3a86-4837-8192-85e7bfe68e75.mp4'

const LINK_GROUPS = [
  {
    id: 'product',
    title: { zh: '产品', en: 'Product' },
    links: [
      { id: 'markets', label: { zh: '加密行情', en: 'Crypto Markets' }, href: '#markets' },
      { id: 'tokenized', label: { zh: '美股代币化', en: 'Tokenized US Stocks' }, href: '#platform' },
      { id: 'presale', label: { zh: 'OX 私募', en: 'OX Private Sale' }, href: '#presale' },
    ],
  },
  {
    id: 'about',
    title: { zh: '关于', en: 'About' },
    links: [
      { id: 'about', label: { zh: '关于 oxxx.io', en: 'About oxxx.io' }, href: '#about' },
      { id: 'token', label: { zh: '代币信息', en: 'Token Info' }, href: '#about' },
      { id: 'metrics', label: { zh: '交易数据', en: 'Trading Data' }, href: '#metrics' },
    ],
  },
  {
    id: 'support',
    title: { zh: '支持', en: 'Support' },
    links: [
      { id: 'address', label: { zh: '私募地址', en: 'Presale Address' }, href: '#presale' },
      { id: 'bsc', label: { zh: 'BSC 网络', en: 'BSC Network' }, href: '#presale' },
      { id: 'top', label: { zh: '返回顶部', en: 'Back to Top' }, href: '#top' },
    ],
  },
]

const DISCLAIMER = {
  zh: '本网站仅供一般信息用途，不构成出售要约或认购任何数字资产、证券或投资产品的邀约，亦不构成投资、金融、法律、税务或其他专业建议。投资数字资产涉及极高风险。衍生品或其他杠杆产品亦涉及很高交易风险，可能导致全部本金，甚至更多的损失。您确认您具备相应的财务能力、风险承受力、投资者成熟度以及数字资产和证券交易的投资知识与经验，并接受在本平台交易的风险。您对自己的投资行为承担全部责任，并应咨询独立的专业顾问。我们不对本网站所载信息的准确性、完整性或适用性作出任何明示或暗示的陈述、保证或担保；oxxx.io 保留对本网站所有内容的最终解释权。',
  en: 'This website is for general information purposes only and does not constitute an offer to sell or a solicitation to subscribe for any digital asset, security or investment product, nor does it constitute investment, financial, legal, tax or other professional advice. Investing in digital assets involves extremely high risk. Derivatives and other leveraged products also carry high trading risk and may result in the loss of all of your principal or more. You confirm that you have the financial capacity, risk tolerance, investor sophistication, and the investment knowledge and experience in digital asset and securities trading appropriate to accept the risks of trading on this platform. You bear full responsibility for your investment decisions and should consult an independent professional adviser. We make no express or implied representation, warranty or guarantee as to the accuracy, completeness or suitability of the information on this website; oxxx.io reserves the right of final interpretation of all content on this website.',
}

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="relative flex flex-col overflow-hidden border-t border-gold/25 bg-black">
      <div className="relative flex min-h-[480px] flex-col md:flex-row">
      <div className="relative h-[320px] w-full md:h-auto md:w-1/2">
        <FooterLlama src={VIDEO} className="absolute inset-0 size-full" />
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-r from-transparent to-black md:block" />
      </div>
      <div className="relative flex w-full flex-col justify-between gap-12 p-10 sm:p-16 md:w-1/2">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-2.5">
            <SynapseXLogo className="size-[18px] text-gold" />
            <span className="text-[15px] font-medium tracking-tight text-gold-light">oxxx.io</span>
          </div>
          <p className="max-w-sm text-pretty text-[14px] leading-relaxed text-foreground/60 sm:text-[15px]">
            {t(
              '公牛代表力量，也代表坚定向前的姿态。oxxx.io 致力于成为下一代交易所 UEX，迈向全景加密交易的新里程碑。',
              'The bull stands for strength and unwavering forward momentum. oxxx.io is committed to becoming the next-generation exchange, UEX, reaching a new milestone in all-in-one crypto trading.',
            )}
          </p>
          <nav aria-label={t('页脚导航', 'Footer navigation')} className="grid grid-cols-3 gap-6 border-t border-gold/15 pt-8">
            {LINK_GROUPS.map((group) => (
              <div key={group.id} className="flex flex-col gap-3">
                <h3 className="text-[12px] uppercase tracking-[0.25em] text-gold">{t(group.title)}</h3>
                <ul className="flex flex-col gap-2">
                  {group.links.map((link) => (
                    <li key={link.id}>
                      <a href={link.href} className="text-[13px] text-foreground/55 transition-colors hover:text-gold-light">
                        {t(link.label)}
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
            {t('免责声明', 'Disclaimer')}
          </h2>
          <p className="text-pretty text-[14px] leading-relaxed text-foreground/45">
            {t(DISCLAIMER)}
          </p>
        </div>
      </section>
    </footer>
  )
}
