'use client'

import { motion } from 'framer-motion'
import { Bitcoin, DollarSign, Gem, Landmark, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { SynapseXLogo } from './logo'

function Coin({ icon: Icon, size = 'size-12', label }: { icon?: LucideIcon; size?: string; label?: string }) {
  return (
    <div
      className={`${size} flex items-center justify-center rounded-full border-2 border-gold/60 bg-gradient-to-br from-white/25 via-white/5 to-black shadow-[0_0_18px_-4px_var(--color-gold)]`}
    >
      {Icon ? (
        <Icon className="size-1/2 text-gold-light" strokeWidth={2} aria-hidden="true" />
      ) : (
        <SynapseXLogo className="size-1/2 text-gold-light" />
      )}
      {label ? <span className="sr-only">{label}</span> : null}
    </div>
  )
}

function SpinningLogoCoin({ size = 'size-16' }: { size?: string }) {
  return (
    <div style={{ perspective: 500 }}>
      <motion.div
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Coin size={size} label="oxxx.io" />
        </motion.div>
      </motion.div>
    </div>
  )
}

function AccountsArt() {
  return (
    <div className="relative flex size-56 items-center justify-center">
      <motion.div
        aria-hidden="true"
        className="absolute inset-4 rounded-full border-[6px] border-gold/50 border-t-transparent border-l-transparent"
        style={{ rotateX: 65 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute inset-10 rounded-full border-[5px] border-foreground/25 border-b-transparent border-r-transparent"
        style={{ rotateX: 65 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative flex size-24 items-center justify-center rounded-2xl border border-gold/40 bg-gradient-to-b from-white/15 to-black"
      >
        <Landmark className="size-12 text-foreground/80" strokeWidth={1.5} aria-hidden="true" />
      </motion.div>
      <motion.div
        className="absolute left-2 top-4"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <SpinningLogoCoin size="size-14" />
      </motion.div>
      <motion.div
        className="absolute bottom-4 right-6"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <Coin icon={DollarSign} label="稳定币" />
      </motion.div>
      <motion.div
        className="absolute right-2 top-1/3"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <Coin icon={Gem} size="size-10" label="数字资产" />
      </motion.div>
    </div>
  )
}

const ORBIT_ICONS: LucideIcon[] = [Bitcoin, DollarSign, Gem, Landmark, Bitcoin, DollarSign, Gem, Landmark]

function ApiArt() {
  return (
    <div className="relative flex size-56 items-center justify-center">
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
      >
        {ORBIT_ICONS.map((icon, i) => {
          const angle = (i / ORBIT_ICONS.length) * Math.PI * 2
          const r = 92
          return (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{ x: Math.cos(angle) * r - 18, y: Math.sin(angle) * r - 18 }}
              animate={{ rotate: -360, opacity: [0.55, 1, 0.55] }}
              transition={{
                rotate: { duration: 18, repeat: Infinity, ease: 'linear' },
                opacity: { duration: 2, repeat: Infinity, delay: i * 0.25 },
              }}
            >
              <Coin icon={icon} size="size-9" />
            </motion.div>
          )
        })}
      </motion.div>

      <div className="relative flex h-16 w-32 -rotate-12 items-center rounded-full border-[6px] border-gold bg-black/60 p-1.5 shadow-[0_0_30px_-4px_var(--color-gold)]">
        <motion.div
          animate={{ x: [0, 52, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <SynapseXLogo className="size-6 text-black" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

const CANDLES = [
  { h: [44, 70, 44], up: true },
  { h: [60, 38, 60], up: false },
  { h: [36, 64, 36], up: true },
  { h: [52, 80, 52], up: true },
]

function LiquidityArt() {
  return (
    <div className="relative flex size-56 flex-col items-center justify-end gap-3 pb-4">
      <div className="flex h-28 items-end gap-4" aria-hidden="true">
        {CANDLES.map((c, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="h-3 w-px bg-foreground/40" />
            <motion.div
              animate={{ height: c.h }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
              className={`w-4 rounded-sm ${c.up ? 'bg-gold' : 'bg-foreground/40'}`}
            />
            <div className="h-3 w-px bg-foreground/40" />
          </div>
        ))}
      </div>

      <motion.div
        animate={{ rotate: [-8, 6, -8] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative h-2 w-44 origin-center rounded-full bg-gradient-to-r from-foreground/30 via-foreground/60 to-foreground/30"
      >
        <div className="absolute -top-14 right-2 flex flex-col-reverse items-center">
          {[0, 1, 2].map((n) => (
            <motion.div
              key={n}
              className="-mt-2 h-3 w-12 rounded-full border border-gold/60 bg-gradient-to-b from-gold-light/70 to-gold/40"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: [0, 1, 1, 0], y: [-20, 0, 0, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, delay: n * 0.5, times: [0, 0.2, 0.85, 1] }}
            />
          ))}
        </div>
      </motion.div>
      <div className="h-6 w-10 bg-gradient-to-b from-foreground/40 to-transparent [clip-path:polygon(50%_0,100%_100%,0_100%)]" />

      <motion.div
        className="absolute left-2 top-2"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <SpinningLogoCoin size="size-14" />
      </motion.div>
      <motion.div
        className="absolute right-4 top-8"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      >
        <Coin icon={Bitcoin} size="size-11" label="比特币" />
      </motion.div>
    </div>
  )
}

const CARDS: { title: string; body: string; art: ReactNode }[] = [
  {
    title: '多层级子账户与精细化权限管控',
    body: '主账户统一管理资金，子账户按团队与策略分配额度和权限。',
    art: <AccountsArt />,
  },
  {
    title: '低延迟 API 与毫秒级撮合执行',
    body: 'REST 与 WebSocket 双通道接入，加密与美股代币一套接口直连。',
    art: <ApiArt />,
  },
  {
    title: '聚合深度流动性与大宗 OTC 服务',
    body: '多源深度汇聚，大额订单专属通道，降低冲击成本。',
    art: <LiquidityArt />,
  },
]

export function Institutional() {
  return (
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
        transition={{ duration: 0.9 }}
        className="text-gold-gradient max-w-4xl text-balance text-center text-[clamp(26px,4vw,48px)] font-bold leading-tight"
      >
        为机构与专业交易者，打造高性能交易引擎
      </motion.h2>

      <ul className="mt-14 grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
        {CARDS.map((card, i) => (
          <motion.li
            key={card.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: i * 0.15 }}
            whileHover={{ y: -6 }}
            className="group flex min-h-[26rem] flex-col justify-between gap-6 rounded-3xl border border-gold/10 bg-white/[0.04] p-7 transition-colors hover:border-gold/35"
          >
            <div className="flex flex-col gap-3">
              <h3 className="text-pretty text-[20px] font-bold leading-snug text-foreground">{card.title}</h3>
              <p className="text-pretty text-[14px] leading-relaxed text-foreground/50">{card.body}</p>
            </div>
            <div className="flex justify-center">{card.art}</div>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
