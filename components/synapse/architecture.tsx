'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export function Architecture() {
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
          className="flex w-full flex-col gap-8 md:w-1/2"
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
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="w-full md:w-1/2"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/images/bull-pedestal.png"
              alt="金色玻璃质感公牛伫立在刻有K线与比特币图案的金属方块上"
              width={1408}
              height={768}
              className="h-auto w-full"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
