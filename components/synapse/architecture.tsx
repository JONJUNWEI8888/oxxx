'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const EDGE_FADE =
  'linear-gradient(to right, transparent 0%, #000 22%, #000 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 18%, #000 78%, transparent 100%)'

export function Architecture() {
  const reduceMotion = useReducedMotion()
  return (
    <section
      id="platform"
      className="relative flex min-h-screen w-full items-center overflow-hidden bg-black px-6 py-24 sm:px-10 lg:px-20"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 md:flex-row md:gap-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1 }}
          className="relative z-10 flex w-full flex-col gap-8 md:w-[42%] md:shrink-0"
        >
          <h2 className="text-gold-gradient text-balance text-[clamp(28px,4.2vw,52px)] font-bold leading-[1.3] tracking-[-0.01em]">
            专业交易平台：
            <br />
            美股代币化、加密现货与合约一站交易
          </h2>
          <p className="text-pretty text-[15px] leading-relaxed text-foreground/60 sm:text-[16px]">
            oxxx.io 以 UEX 全景交易为核心，将美股代币化资产与主流加密货币汇聚于同一账户。平台提供高速撮合引擎、多种订单类型与全天候交易时段，并开放
            App 与 API 接入，满足从入门交易到专业量化策略的全部需求。
          </p>
          <a
            href="#presale"
            className="group flex w-fit items-center gap-3 text-[15px] text-gold-light transition-colors hover:text-gold"
          >
            <span className="flex size-10 items-center justify-center rounded-lg border border-gold/50 transition-colors group-hover:border-gold group-hover:bg-gold/10">
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
            立即体验
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-[125%] max-w-none md:-mr-32 md:w-[72%] md:shrink-0 lg:-mr-48 lg:w-[78%]"
          style={{ perspective: 1200 }}
        >
          <motion.div
            animate={reduceMotion ? undefined : { scale: [1, 1.06, 1], y: [0, 6, 0], rotateX: [0, 3, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="origin-bottom"
            style={{
              maskImage: EDGE_FADE,
              WebkitMaskImage: EDGE_FADE,
              maskComposite: 'intersect',
              WebkitMaskComposite: 'source-in',
            }}
          >
            <Image
              src="/images/chrome-bull-charge.png"
              alt="镜面铬金属机甲公牛正面冲向镜头，粉色霓虹双眼，蹄下踏碎地面，比特币、以太坊、USDT、BNB、Solana 等加密货币四散飞溅"
              width={1408}
              height={768}
              priority
              className="h-auto w-full"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
