'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { DollarSign, type LucideIcon } from 'lucide-react'
import { type Bi, useI18n } from '@/lib/i18n'
import { SynapseXLogo } from './logo'

const SHIELD_PATH = 'M100 8 L184 38 L184 104 C184 158 148 196 100 214 C52 196 16 158 16 104 L16 38 Z'
const SHIELD_INNER = 'M100 26 L168 50 L168 104 C168 148 140 180 100 196 C60 180 32 148 32 104 L32 50 Z'

type Tile = {
  icon?: LucideIcon
  src?: string
  label: Bi
  size: string
  delay: number
  travelX: number
  dim?: boolean
}

const LEFT_TILES: Tile[] = [
  {
    src: '/logos/bitcoin.svg',
    label: { zh: '比特币', en: 'Bitcoin' },
    size: 'size-16 md:size-20',
    delay: 1.8,
    travelX: 112,
    dim: true,
  },
  {
    src: '/logos/nvidia.svg',
    label: { zh: '英伟达', en: 'NVIDIA' },
    size: 'size-20 md:size-24',
    delay: 0.9,
    travelX: 76,
  },
]

const RIGHT_TILES: Tile[] = [
  {
    icon: DollarSign,
    label: { zh: '美金', en: 'US Dollar' },
    size: 'size-20 md:size-24',
    delay: 0,
    travelX: -92,
  },
]

const FEATURES = [
  {
    id: 'custody',
    title: { zh: '资产隔离托管', en: 'Segregated Custody' },
    body: {
      zh: '用户资产与平台运营资金分账管理、独立托管，每一笔资金流向均可追溯，杜绝挪用风险。',
      en: 'User assets are held separately from operating funds in independent custody, with every flow traceable to eliminate misuse.',
    },
  },
  {
    id: 'wallets',
    title: { zh: '冷热钱包分层', en: 'Tiered Hot & Cold Wallets' },
    body: {
      zh: '绝大部分数字资产存放于离线冷钱包，结合多重签名与硬件密钥授权，层层守护链上资产。',
      en: 'The vast majority of digital assets sit in offline cold wallets, protected by multi-signature and hardware-key authorization.',
    },
  },
  {
    id: 'risk',
    title: { zh: '全天候风控引擎', en: '24/7 Risk Engine' },
    body: {
      zh: '7x24 小时实时监测交易与账户行为，异常操作秒级识别并自动拦截，第一时间保护账户安全。',
      en: 'Real-time 24/7 monitoring of trades and account activity detects and blocks anomalies within seconds to keep accounts safe.',
    },
  },
]

function FloatingTile({ tile }: { tile: Tile }) {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const Icon = tile.icon

  return (
    <motion.div
      animate={
        reduceMotion
          ? undefined
          : {
              x: [0, tile.travelX, tile.travelX, 0],
              y: [0, -8, -8, 0],
              opacity: [1, 0, 0, 1],
              scale: [1, 0.72, 0.72, 1],
            }
      }
      transition={{
        duration: 1.55,
        repeat: Infinity,
        repeatDelay: 3.2,
        delay: tile.delay,
        ease: 'easeInOut',
        times: [0, 0.42, 0.58, 1],
      }}
      className={`${tile.size} flex shrink-0 items-center justify-center rounded-3xl border bg-gradient-to-br from-white/10 to-white/[0.02] shadow-[0_0_30px_-8px_var(--color-gold)] ${
        tile.dim ? 'border-gold/20 opacity-60' : 'border-gold/40'
      }`}
    >
      {tile.src ? (
        <Image
          src={tile.src}
          alt=""
          width={48}
          height={48}
          className={`size-1/2 object-contain ${tile.src.includes('nvidia') ? 'brightness-0 invert' : ''}`}
        />
      ) : (
        Icon && <Icon className="size-1/2 text-gold-light" strokeWidth={1.6} aria-hidden="true" />
      )}
      <span className="sr-only">{t(tile.label)}</span>
    </motion.div>
  )
}

function AnimatedShield() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className="relative h-60 w-56 shrink-0 md:h-80 md:w-72"
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-6 rounded-full bg-gold/30 blur-3xl"
        animate={{ opacity: [0.35, 0.8, 0.35], scale: [0.9, 1.08, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <svg viewBox="0 0 200 222" className="relative size-full" aria-hidden="true">
        <defs>
          <linearGradient id="shield-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-gold-light)" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#1a1018" />
            <stop offset="100%" stopColor="#0a0609" />
          </linearGradient>
          <linearGradient id="shield-inner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a1824" />
            <stop offset="100%" stopColor="#0d080b" />
          </linearGradient>
        </defs>
        <path d={SHIELD_PATH} fill="url(#shield-body)" stroke="var(--color-gold)" strokeOpacity="0.35" strokeWidth="1.5" />
        <path d={SHIELD_INNER} fill="url(#shield-inner)" />
        <path
          d={SHIELD_INNER}
          fill="none"
          stroke="var(--color-gold-light)"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <motion.path
          d={SHIELD_INNER}
          fill="none"
          stroke="var(--color-gold-light)"
          strokeWidth="3"
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px var(--color-gold))' }}
          initial={{ pathLength: 0.22, pathOffset: 0 }}
          animate={{ pathOffset: [0, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pb-4" style={{ perspective: 600 }}>
        <motion.div
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <SynapseXLogo className="size-20 text-gold-light drop-shadow-[0_0_14px_var(--color-gold)] md:size-24" />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function Security() {
  const { t } = useI18n()
  return (
    <section
      id="security"
      aria-labelledby="security-heading"
      className="relative flex w-full flex-col items-center overflow-hidden bg-black px-6 py-24 sm:px-10 lg:px-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.9 }}
        className="flex max-w-4xl flex-col items-center gap-5 text-center"
      >
        <h2
          id="security-heading"
          className="text-gold-gradient text-balance text-[clamp(26px,4vw,48px)] font-bold leading-tight"
        >
          {t('机构级资产安全，全方位隐私守护', 'Institutional-Grade Security, Complete Privacy Protection')}
        </h2>
        <p className="text-pretty text-[15px] leading-relaxed text-foreground/60 sm:text-[17px]">
          {t(
            'oxxx.io 构建多层风控与托管体系，并以端到端加密保护用户数据，让每一笔交易都安心可依。',
            'oxxx.io combines multi-layer risk controls and custody with end-to-end encryption of user data, so every trade is one you can rely on.',
          )}
        </p>
      </motion.div>

      <div className="mt-16 flex w-full max-w-5xl items-center justify-center gap-4 sm:gap-8 md:gap-12">
        <div className="hidden items-center gap-6 sm:flex md:gap-10">
          {LEFT_TILES.map((tile) => (
            <FloatingTile key={tile.label.en} tile={tile} />
          ))}
        </div>
        <AnimatedShield />
        <div className="hidden items-center gap-6 sm:flex md:gap-10">
          {RIGHT_TILES.map((tile) => (
            <FloatingTile key={tile.label.en} tile={tile} />
          ))}
        </div>
      </div>

      <ul className="mt-16 grid w-full max-w-5xl grid-cols-1 gap-10 md:grid-cols-3 md:gap-0">
        {FEATURES.map((feature, i) => (
          <motion.li
            key={feature.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, delay: i * 0.15 }}
            className={`flex flex-col items-center gap-4 px-6 text-center ${
              i > 0 ? 'md:border-l md:border-gold/15' : ''
            }`}
          >
            <h3 className="text-[20px] font-bold text-foreground sm:text-[22px]">{t(feature.title)}</h3>
            <p className="text-pretty text-[14px] leading-relaxed text-foreground/55 sm:text-[15px]">{t(feature.body)}</p>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
