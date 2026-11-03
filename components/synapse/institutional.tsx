'use client'

import Image from 'next/image'
import { MotionConfig, motion } from 'framer-motion'
import { type Bi, useI18n } from '@/lib/i18n'

const CARDS: { id: string; title: Bi; body: Bi; image: string; alt: Bi }[] = [
  {
    id: 'accounts',
    title: { zh: '多层级子账户与精细化权限管控', en: 'Multi-Tier Sub-Accounts with Granular Permissions' },
    body: { zh: '主账户统一管理资金，子账户按团队与策略分配额度和权限。', en: 'Manage funds centrally while sub-accounts get limits and permissions by team and strategy.' },
    image: '/images/inst-accounts.png',
    alt: { zh: '金属银行建筑与环绕的资金流转箭头', en: 'Chrome bank building wrapped by fund-flow arrows' },
  },
  {
    id: 'api',
    title: { zh: '低延迟 API 与毫秒级撮合执行', en: 'Low-Latency API with Millisecond Execution' },
    body: { zh: 'REST 与 WebSocket 双通道接入，加密与美股代币一套接口直连。', en: 'REST and WebSocket access, one interface for both crypto and tokenized US stocks.' },
    image: '/images/inst-api.png',
    alt: { zh: '粉色连接环与环绕的加密及美股代币', en: 'Pink connector link surrounded by crypto and stock token coins' },
  },
  {
    id: 'liquidity',
    title: { zh: '聚合深度流动性与大宗 OTC 服务', en: 'Aggregated Deep Liquidity & Block OTC' },
    body: { zh: '多源深度汇聚，大额订单专属通道，降低冲击成本。', en: 'Multi-source depth and dedicated channels for large orders to reduce market impact.' },
    image: '/images/inst-liquidity.png',
    alt: { zh: 'K 线柱与承载币堆的平衡天平', en: 'Candlesticks above a balance holding a stack of coins' },
  },
]

export function Institutional() {
  const { t } = useI18n()
  return (
    <MotionConfig reducedMotion="user">
      <section
        id="institutional"
        aria-labelledby="institutional-heading"
        className="relative flex w-full flex-col items-center overflow-hidden bg-black px-6 py-24 sm:px-10 lg:px-20"
      >
        <motion.h2
          id="institutional-heading"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-gold-gradient max-w-4xl text-balance text-center text-[clamp(26px,4vw,48px)] font-bold leading-tight"
        >
          {t('为机构与专业交易者，打造高性能交易引擎', 'A High-Performance Trading Engine for Institutions and Professional Traders')}
        </motion.h2>

        <ul className="mt-14 grid w-full max-w-6xl grid-cols-1 gap-5 md:grid-cols-3">
          {CARDS.map((card, i) => (
            <motion.li
              key={card.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.8, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex min-h-[28rem] flex-col overflow-hidden rounded-3xl bg-white/[0.05] p-7 transition-colors duration-500 hover:bg-white/[0.07] lg:p-8"
            >
              <div className="relative z-10 flex flex-col gap-3">
                <h3 className="text-pretty text-[20px] font-bold leading-snug text-foreground lg:text-[22px]">{t(card.title)}</h3>
                <p className="text-pretty text-[14px] leading-relaxed text-foreground/50 transition-all duration-500 lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
                  {t(card.body)}
                </p>
              </div>

              <div className="relative mt-auto flex flex-1 items-end justify-center pt-6">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
                  className="relative aspect-[1408/768] w-[165%] max-w-none shrink-0 mix-blend-lighten"
                >
                  <Image
                    src={card.image}
                    alt={t(card.alt)}
                    fill
                    sizes="(min-width: 768px) 50vw, 160vw"
                    className="object-contain transition-transform duration-700 ease-out [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_70%)] group-hover:scale-105"
                  />
                </motion.div>
              </div>
            </motion.li>
          ))}
        </ul>
      </section>
    </MotionConfig>
  )
}
