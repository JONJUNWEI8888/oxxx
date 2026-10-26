'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { LaserEye, LaserTarget } from './laser-icons'
import Image from 'next/image'
import Link from 'next/link'
import type { Bi } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n'
import { ParticleCoin } from './particle-coin'
import { PhoneShowcase } from './phone-showcase'
import { ValueOrb } from './value-orb'

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: 'easeOut' },
} as const

function SectionTitle({ children, underline = false }: { children: React.ReactNode; underline?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-balance font-display text-4xl leading-tight tracking-wide text-foreground md:text-5xl">
        {children}
      </h2>
      {underline && <span aria-hidden="true" className="h-1 w-24 rounded-full bg-gradient-to-r from-gold to-gold-light" />}
    </div>
  )
}

const PILLARS: { letter: string; name: string; zh: string; body: Bi }[] = [
  {
    letter: 'O',
    name: 'One',
    zh: '统一',
    body: { zh: '一个账户体系，统一管理资产、资金与风险。', en: 'One account to manage assets, funds and risk.' },
  },
  {
    letter: 'X',
    name: 'eXchange',
    zh: '交易',
    body: { zh: '以证券交易为核心，连接全球投资机会。', en: 'Securities trading at the core, connected to global opportunities.' },
  },
  {
    letter: 'XX',
    name: 'Cross-Asset',
    zh: '跨资产',
    body: { zh: '打破资产边界，释放跨市场资金效率与策略空间。', en: 'Break asset boundaries and unlock cross-market capital efficiency.' },
  },
]

export function AboutHero() {
  const { t, isEn } = useI18n()
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-36 sm:px-6 md:px-8 lg:pt-44">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,color-mix(in_oklab,var(--color-gold)_16%,transparent),transparent_60%)]"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-16">
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-between">
          <motion.div {...reveal} className="flex max-w-2xl flex-col gap-6">
            <h1 className="font-display text-6xl leading-none tracking-wide text-foreground md:text-7xl">
              {t('关于', 'About')}{' '}
              <span aria-hidden="true" className="logo-glow inline-flex">
                <span className="logo-wordmark">OXXX</span>
              </span>
              <span className="sr-only">OXXX</span>
            </h1>
            <p className="text-pretty text-xl font-bold leading-relaxed text-gold md:text-2xl">
              {t('下一代金融服务平台，连接数字资产与传统金融市场', 'The next-generation financial platform connecting digital assets and traditional markets')}
            </p>
            <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-foreground/65">
              <p className="text-pretty">
                {t(
                  'OXXX 是面向全球专业级投资者的加密友好型证券平台，提供统一市场交易服务，在同一平台打通加密资产与真实股票交易。',
                  'OXXX is a crypto-friendly securities platform for professional investors worldwide, offering unified-market trading that brings crypto assets and real equities onto one platform.',
                )}
              </p>
              <p className="text-pretty">
                {t(
                  '平台围绕跨市场交易、资金高效调度与一体化资产配置而构建，帮助投资者更高效地执行多资产策略，把握数字金融与传统金融加速融合下的市场机会。',
                  'Built around cross-market trading, efficient capital deployment and integrated allocation, OXXX helps investors execute multi-asset strategies as digital and traditional finance converge.',
                )}
              </p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="w-full max-w-sm lg:max-w-md"
          >
            <ParticleCoin />
          </motion.div>
        </div>

        <ul className="grid gap-4 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <motion.li
              key={p.letter}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.1 }}
              className="group flex items-center gap-5 rounded-2xl border border-line bg-panel/80 p-6 backdrop-blur transition-colors hover:border-gold/40"
            >
              <span
                aria-hidden="true"
                style={{ animationDelay: `${i * 1.2}s` }}
                className="laser-tile flex size-16 shrink-0 items-center justify-center rounded-xl"
              >
                <span className="logo-glow relative grid place-items-center font-display text-4xl leading-none tracking-wider">
                  <span className="chrome-text col-start-1 row-start-1">{p.letter}</span>
                  <span className="laser-glyph-stroke col-start-1 row-start-1">{p.letter}</span>
                </span>
                <span className="laser-beam pointer-events-none absolute inset-0" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="flex items-baseline gap-2.5">
                  <span className="chrome-text font-display text-2xl leading-none tracking-wider">{p.name}</span>
                  {!isEn && (
                    <>
                      <span aria-hidden="true" className="h-4 w-px self-center bg-gold/50" />
                      <span className="text-lg font-black tracking-widest text-gold-light">{p.zh}</span>
                    </>
                  )}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/55">{t(p.body.zh, p.body.en)}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function BrandStory() {
  const { t } = useI18n()
  const paragraphs: Bi[] = [
    {
      zh: '传统金融与数字资产的边界正在加速瓦解。当下投资者——尤其是数字资产原生代——早已不再局限于单一的市场赛道。他们的资产配置同时横跨全球股票、ETF、期权与加密货币。',
      en: 'The boundary between traditional finance and digital assets is dissolving. Today’s investors — especially crypto natives — no longer stay in a single lane; their portfolios span global equities, ETFs, options and crypto.',
    },
    {
      zh: '然而，连接这两大市场的基础设施依然彼此割裂。分散的账户体系、割裂的资金路径与相互独立的风险管理机制，增加了跨市场投资的摩擦，也限制了资金效率与投资灵活性。',
      en: 'Yet the infrastructure connecting these markets remains fragmented. Scattered accounts, disconnected funding rails and siloed risk management add friction and limit capital efficiency and flexibility.',
    },
    { zh: 'OXXX 由此而生。', en: 'That is why OXXX exists.' },
    {
      zh: '作为一家加密友好型证券平台，OXXX 致力于搭建连接传统金融与数字资产的桥梁。我们通过统一账户架构，将跨市场划转与跨资产保证金机制深度融合，释放更高效率，让专业级投资者能够在一个平台高效交易证券、调配资金、管理风险并执行跨市场策略。',
      en: 'As a crypto-friendly securities platform, OXXX bridges traditional finance and digital assets. Our unified account architecture fuses cross-market transfers with cross-asset margin, so professional investors can trade securities, move capital, manage risk and run cross-market strategies on one platform.',
    },
  ]
  const cards = [
    {
      icon: LaserEye,
      title: { zh: '愿景', en: 'Vision' },
      body: { zh: '成为连接数字资产与传统金融市场的下一代全球交易基础设施。', en: 'To become the next-generation global trading infrastructure connecting digital assets and traditional markets.' },
    },
    {
      icon: LaserTarget,
      title: { zh: '使命', en: 'Mission' },
      body: {
        zh: '通过统一市场交易平台连接数字资产与传统金融市场，为专业级投资者提供更高效、更可信赖的跨市场交易与资产配置能力。',
        en: 'To connect digital assets and traditional markets through a unified trading platform, giving professional investors more efficient, trustworthy cross-market trading and allocation.',
      },
    },
  ]
  return (
    <section className="px-4 py-20 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <motion.div {...reveal} className="flex flex-col gap-10">
          <SectionTitle underline>{t('品牌故事', 'Our Story')}</SectionTitle>
          <div className="flex flex-col gap-5 text-[15px] leading-relaxed text-foreground/65 md:text-base">
            {paragraphs.map((p, i) => (
              <p key={i} className={i === 2 ? 'font-bold text-gold-light' : 'text-pretty'}>
                {t(p.zh, p.en)}
              </p>
            ))}
          </div>
        </motion.div>
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map(({ icon: Icon, title, body }, i) => (
            <motion.article
              key={title.en}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.1 }}
              className="flex gap-6 rounded-2xl bg-raised p-8"
            >
              <span className="laser-badge relative flex size-20 shrink-0 items-center justify-center rounded-full text-gold">
                <span className="laser-badge-orbit pointer-events-none absolute inset-0 rounded-full" aria-hidden="true" />
                <Icon className="relative size-12" />
              </span>
              <div className="flex flex-col gap-3">
                <h3 className="font-display text-3xl tracking-wide text-gold">{t(title.zh, title.en)}</h3>
                <p className="text-pretty leading-relaxed text-foreground/60">{t(body.zh, body.en)}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

const VALUES: { title: Bi; image: string }[] = [
  { title: { zh: '以用户场景为中心', en: 'User scenarios first' }, image: '/images/value-user-clear.png' },
  { title: { zh: '以资本效率为核心', en: 'Capital efficiency at the core' }, image: '/images/value-efficiency-clear.png' },
  { title: { zh: '以安全风控为底线', en: 'Security as the baseline' }, image: '/images/value-security-clear.png' },
]

export function Values() {
  const { t } = useI18n()
  return (
    <section className="px-4 py-20 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <motion.div {...reveal}>
          <SectionTitle>{t('我们的价值观', 'Our Values')}</SectionTitle>
        </motion.div>
        <ul className="grid gap-6 md:grid-cols-3">
          {VALUES.map((v, i) => (
            <motion.li
              key={v.image}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.1 }}
              className="group flex flex-col items-center gap-6 rounded-3xl bg-raised px-6 pb-6 pt-10 transition-colors hover:bg-raised/70"
            >
              <h3 className="text-center text-xl font-bold text-foreground">{t(v.title.zh, v.title.en)}</h3>
              <ValueOrb src={v.image} ringTilt={[-18, 14, -8][i]} delay={i * -1.4} />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const SERVICES: { title: Bi; body: Bi; href: string }[] = [
  {
    title: { zh: '证券交易', en: 'Securities Trading' },
    body: {
      zh: '支持美股、港股、ETF 与美股期权交易，并针对不同市场提供多种订单类型、交易时段及融资融券交易能力，支持 App / API 交易。',
      en: 'Trade US & HK stocks, ETFs and US options with multiple order types, extended sessions and margin, via App or API.',
    },
    href: '#',
  },
  {
    title: { zh: '加密资产交易', en: 'Crypto Trading' },
    body: {
      zh: '覆盖现货、杠杆、永续合约、交割合约、期权及大宗询价 (RFQ)，支持从专业级交易者到机构级的多层交易需求。',
      en: 'Spot, margin, perpetuals, delivery futures, options and block RFQ — from professional traders to institutions.',
    },
    href: '/trade/BTCUSDT',
  },
  {
    title: { zh: '资金与财富管理', en: 'Funds & Wealth' },
    body: {
      zh: '通过统一账户体系连接证券与数字资产，提供跨市场资金划转、统一保证金及多元理财服务，满足专业级投资者的资金调配与收益管理需求。',
      en: 'One account connecting securities and digital assets, with cross-market transfers, unified margin and diversified wealth products.',
    },
    href: '#',
  },
]

export function Services() {
  const { t } = useI18n()
  return (
    <section className="px-4 py-20 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:gap-20">
        <motion.div {...reveal} className="flex flex-col gap-16 lg:w-1/3">
          <SectionTitle>{t('我们的服务', 'Our Services')}</SectionTitle>
          <PhoneShowcase
            label={t('OXXX App 深度摆盘界面：英伟达 (NVDA) 买卖盘', 'OXXX app order book view for NVIDIA (NVDA)')}
            hint={t('拖动旋转手机', 'Drag to rotate')}
          />
        </motion.div>
        <ul className="flex flex-1 flex-col border-t border-line">
          {SERVICES.map((s, i) => (
            <motion.li
              key={s.title.en}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.1 }}
              className="flex lg:flex-1"
            >
              <Link
                href={s.href}
                className="group flex flex-1 items-center gap-6 border-b border-line py-8 focus-visible:outline-none"
              >
                <div className="flex flex-1 flex-col gap-3">
                  <h3 className="font-display text-2xl tracking-wide text-gold md:text-3xl">{t(s.title.zh, s.title.en)}</h3>
                  <p className="text-pretty leading-relaxed text-foreground/60">{t(s.body.zh, s.body.en)}</p>
                </div>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-foreground/30 text-foreground transition-colors group-hover:border-gold group-hover:bg-gold group-hover:text-gold-deep group-focus-visible:border-gold">
                  <ArrowRight className="size-5" aria-hidden="true" />
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const NEWS: { tag: Bi; title: Bi; excerpt: Bi; cover: string; headline: Bi; date: string }[] = [
  {
    tag: { zh: 'OXXX 指南', en: 'OXXX Guide' },
    title: { zh: '从 CEX + 传统券商，到 ALL IN OXXX', en: 'From CEX + traditional broker to ALL IN OXXX' },
    excerpt: {
      zh: '告别分账户带来的资金、执行与风险三类成本。OXXX 围绕账户、资金、工具、风险四层重构，让加密资产与真实股票在同一框架下双向提升资金效率。',
      en: 'Cut the capital, execution and risk costs of split accounts. OXXX rebuilds accounts, funding, tools and risk so crypto and real stocks share one capital-efficient framework.',
    },
    cover: '/images/news/all-in.png',
    headline: { zh: '一个账户，ALL IN 币股', en: 'One account, ALL IN' },
    date: '2026.07',
  },
  {
    tag: { zh: 'OXXX 指南', en: 'OXXX Guide' },
    title: { zh: '从 USDT 到美股：OXXX 统一市场交易指南', en: 'From USDT to US stocks: the OXXX unified trading guide' },
    excerpt: {
      zh: '四个步骤：兑换划转、借贷划转或授信形成美股购买力；App + API 交易美股、ETF 与期权；“股转币”释放统一保证金；理财资产生息交易两不误。',
      en: 'Four steps: turn USDT or BTC into US buying power, trade stocks, ETFs and options via App + API, tokenize holdings into unified margin, and keep earning yield while trading.',
    },
    cover: '/images/news/usdt-us.png',
    headline: { zh: '持 U 直通美股', en: 'USDT to US stocks' },
    date: '2026.07',
  },
  {
    tag: { zh: 'OXXX 指南', en: 'OXXX Guide' },
    title: { zh: 'OXXX 港股灰度上线：持 U 即买港股，币股互通再进一步', en: 'HK stocks now in beta on OXXX: buy HK stocks with USDT' },
    excerpt: {
      zh: '支持港股正股及 ETF、融资融券与沽空，14 种订单类型。USDT、BTC、ETH 均可快速形成港股购买力，港股持仓也可反向抵押获得加密购买力。',
      en: 'Trade HK stocks and ETFs with margin and short selling across 14 order types. USDT, BTC and ETH become HK buying power, and HK holdings can back crypto trades.',
    },
    cover: '/images/news/hk-stocks.png',
    headline: { zh: '港股 × 加密 双向互通', en: 'HK stocks × crypto' },
    date: '2026.10',
  },
]

export function News() {
  const { t } = useI18n()
  return (
    <section id="news" className="scroll-mt-24 px-4 py-20 sm:px-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <motion.div {...reveal} className="flex flex-col gap-4">
          <SectionTitle>{t('新闻与洞察', 'News & Insights')}</SectionTitle>
          <p className="text-pretty leading-relaxed text-foreground/60">
            {t('理解市场结构的变化，发现跨市场的下一个机会。', 'Understand shifting market structure and find the next cross-market opportunity.')}
          </p>
        </motion.div>
        <ul className="grid gap-6 md:grid-cols-3">
          {NEWS.map((n, i) => (
            <motion.li key={n.cover} {...reveal} transition={{ ...reveal.transition, delay: i * 0.1 }}>
              <a href="#" className="group flex h-full flex-col overflow-hidden rounded-2xl bg-raised focus-visible:outline-2 focus-visible:outline-gold">
                <div className="relative flex aspect-[16/10] flex-col justify-between overflow-hidden bg-background p-5">
                  <Image
                    src={n.cover}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
                  <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/80 to-transparent" />
                  <span className="relative z-10 font-display text-2xl leading-none tracking-[0.04em] text-foreground">OXXX</span>
                  <span className="relative z-10 max-w-[70%] text-pretty font-display text-xl leading-tight text-foreground">
                    {t(n.headline.zh, n.headline.en)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="w-fit rounded-md bg-gold/15 px-2.5 py-1 text-xs text-gold">{t(n.tag.zh, n.tag.en)}</span>
                    <time className="font-mono text-xs text-foreground/45">{n.date}</time>
                  </div>
                  <h3 className="line-clamp-2 text-pretty text-lg font-bold leading-snug text-foreground">{t(n.title.zh, n.title.en)}</h3>
                  <div className="mt-auto flex items-end gap-4">
                    <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-foreground/55">{t(n.excerpt.zh, n.excerpt.en)}</p>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-foreground/30 transition-colors group-hover:border-gold group-hover:bg-gold group-hover:text-gold-deep">
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </a>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function JoinCta() {
  const { t } = useI18n()
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-gold/35 via-gold-deep to-background px-4 py-20 sm:px-6 md:px-8">
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 lg:flex-row lg:justify-between">
        <motion.div {...reveal} className="flex max-w-xl flex-col gap-6">
          <h2 className="text-balance font-display text-4xl leading-tight tracking-wide text-foreground md:text-5xl">
            {t('即刻开启', 'Start your')}
            <br />
            {t('您的统一市场交易之旅', 'unified trading journey')}
          </h2>
          <p className="text-pretty text-lg leading-relaxed text-foreground/75">
            {t('在一个平台中连接多元市场与资金效率工具，让交易更轻松、更高效。', 'Connect diverse markets and capital-efficiency tools on one platform for easier, more efficient trading.')}
          </p>
          <Link
            href="/register"
            className="mt-4 flex h-12 w-fit items-center gap-2 rounded-xl border border-foreground/70 px-10 font-bold text-foreground transition-colors hover:border-gold hover:bg-gold hover:text-gold-deep"
          >
            {t('加入我们', 'Join us')}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </motion.div>
        <Image
          src="/images/login-coins.png"
          alt=""
          width={1024}
          height={1024}
          className="h-auto w-full max-w-sm object-contain mix-blend-lighten"
        />
      </div>
    </section>
  )
}
