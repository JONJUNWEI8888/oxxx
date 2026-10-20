'use client'

import { motion, type Variants } from 'framer-motion'

type ChartProps = { play: boolean }

const EASE = [0.22, 1, 0.36, 1] as const

const draw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  show: (i: number = 0) => ({
    pathLength: 1,
    opacity: 1,
    transition: { pathLength: { duration: 1.4, delay: 0.2 + i * 0.15, ease: EASE }, opacity: { duration: 0.2, delay: 0.2 + i * 0.15 } },
  }),
}

const fade: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.3 + i * 0.08, ease: EASE } }),
}

function linePath(points: [number, number][]) {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
}

function Legend({ items }: { items: { label: string; className: string; shape?: 'bar' | 'line' }[] }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-foreground/55">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={item.shape === 'line' ? `h-0.5 w-3 rounded-full ${item.className}` : `size-2.5 rounded-sm ${item.className}`} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/* ---------------- 基本面 · Radar ---------------- */

const RADAR_AXES = [
  { title: '盈利能力', desc: '盈利质量与利润表现', now: 0.94, prev: 0.92 },
  { title: '成长能力', desc: '收入与业务增长变化', now: 0.5, prev: 0.68 },
  { title: '运营能力', desc: '资产周转与经营效率', now: 0.84, prev: 0.9 },
  { title: '偿债能力', desc: '债务结构与偿付能力', now: 0.3, prev: 0.42 },
  { title: '现金能力', desc: '现金流与经营韧性', now: 0.7, prev: 0.72 },
]

export function FundamentalChart({ play }: ChartProps) {
  const cx = 220
  const cy = 200
  const R = 112
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / RADAR_AXES.length
  const pt = (i: number, r: number): [number, number] => [cx + Math.cos(angle(i)) * R * r, cy + Math.sin(angle(i)) * R * r]
  const poly = (key: 'now' | 'prev') => RADAR_AXES.map((a, i) => pt(i, a[key]).join(',')).join(' ')

  return (
    <div className="flex h-full flex-col justify-between gap-3">
      <motion.svg viewBox="-30 0 500 400" className="w-full" initial="hidden" animate={play ? 'show' : 'hidden'} role="img" aria-label="基本面五维雷达图：盈利、成长、运营、偿债、现金能力，本期与去年同期对比">
        {[0.2, 0.4, 0.6, 0.8, 1].map((lvl) => (
          <polygon key={lvl} points={RADAR_AXES.map((_, i) => pt(i, lvl).join(',')).join(' ')} className="fill-none stroke-foreground/15" strokeWidth={1} />
        ))}
        {RADAR_AXES.map((_, i) => {
          const [x, y] = pt(i, 1)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} className="stroke-foreground/10" />
        })}

        <motion.g
          style={{ transformOrigin: `${cx}px ${cy}px`, transformBox: 'view-box' }}
          variants={{ hidden: { scale: 0, opacity: 0 }, show: { scale: 1, opacity: 1, transition: { duration: 1, delay: 0.2, ease: EASE } } }}
        >
          <polygon points={poly('now')} className="fill-gold/35 stroke-gold" strokeWidth={1.5} />
          {RADAR_AXES.map((a, i) => {
            const [x, y] = pt(i, a.now)
            return <circle key={i} cx={x} cy={y} r={4} className="fill-gold" />
          })}
        </motion.g>
        <motion.polygon points={poly('prev')} className="fill-none stroke-foreground/80" strokeWidth={1.2} strokeDasharray="4 3" variants={fade} custom={5} />
        {RADAR_AXES.map((a, i) => {
          const [x, y] = pt(i, a.prev)
          return <motion.circle key={i} cx={x} cy={y} r={3} className="fill-foreground" variants={fade} custom={6 + i} />
        })}

        {RADAR_AXES.map((a, i) => {
          const [x, y] = pt(i, 1.32)
          const cos = Math.cos(angle(i))
          const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end'
          const dx = anchor === 'start' ? -14 : anchor === 'end' ? 14 : 0
          const dy = i === 0 ? -14 : 0
          return (
            <motion.g key={a.title} variants={fade} custom={i}>
              <text x={x + dx} y={y + dy} textAnchor={anchor} className="fill-foreground text-[15px] font-semibold">
                {a.title}
              </text>
              <text x={x + dx} y={y + dy + 18} textAnchor={anchor} className="fill-foreground/45 text-[11px]">
                {a.desc}
              </text>
            </motion.g>
          )
        })}
      </motion.svg>
      <Legend
        items={[
          { label: '2026/10/26 财报数据', className: 'bg-gold', shape: 'line' },
          { label: '去年同期', className: 'bg-foreground', shape: 'line' },
        ]}
      />
    </div>
  )
}

/* ---------------- 技术面 · Candles ---------------- */

function seeded(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

const CANDLES = (() => {
  const rand = seeded(7)
  let price = 100
  return Array.from({ length: 34 }, (_, i) => {
    const drift = i < 7 ? 1.4 : i < 18 ? -0.15 : -0.45
    const o = price
    const c = o + (rand() - 0.5) * 5 + drift
    const h = Math.max(o, c) + rand() * 2.4
    const l = Math.min(o, c) - rand() * 2.4
    price = c
    return { o, c, h, l }
  })
})()

function movingAverage(n: number) {
  return CANDLES.map((_, i) => {
    const slice = CANDLES.slice(Math.max(0, i - n + 1), i + 1)
    return slice.reduce((s, k) => s + k.c, 0) / slice.length
  })
}

const TECH_NOTES = [
  { title: '短期趋势', desc: '震荡上行，量能温和放大', className: 'bg-gold' },
  { title: '中长期趋势', desc: '宽幅区间盘整，方向待确认', className: 'bg-gold-light' },
  { title: '支撑压力位', desc: '近期无明显支撑位与压力位', className: 'bg-foreground' },
  { title: 'K 线形态', desc: '近 30 日多头信号 0 个，空头信号 1 个', className: 'bg-foreground/40' },
]

export function TechnicalChart({ play }: ChartProps) {
  const W = 480
  const H = 200
  const pad = 14
  const lo = Math.min(...CANDLES.map((k) => k.l))
  const hi = Math.max(...CANDLES.map((k) => k.h))
  const y = (v: number) => pad + ((hi - v) / (hi - lo)) * (H - pad * 2)
  const step = (W - pad * 2) / CANDLES.length
  const x = (i: number) => pad + step * i + step / 2
  const ma = [
    { n: 5, className: 'stroke-gold' },
    { n: 10, className: 'stroke-gold-light' },
    { n: 20, className: 'stroke-foreground/80' },
  ]

  return (
    <div className="flex h-full flex-col gap-5">
      <p className="text-[15px] font-medium text-foreground/90">趋势与支撑压力位分析</p>
      <div>
        <motion.svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border border-foreground/10" initial="hidden" animate={play ? 'show' : 'hidden'} role="img" aria-label="近 34 个交易日 K 线与 5、10、20 日均线">
          {[0.25, 0.5, 0.75].map((r) => (
            <line key={r} x1={0} x2={W} y1={H * r} y2={H * r} className="stroke-foreground/[0.06]" />
          ))}
          {CANDLES.map((k, i) => {
            const up = k.c >= k.o
            const top = y(Math.max(k.o, k.c))
            const height = Math.max(1.5, Math.abs(y(k.o) - y(k.c)))
            return (
              <motion.g
                key={i}
                style={{ transformOrigin: `${x(i)}px ${top + height / 2}px`, transformBox: 'view-box' }}
                variants={{ hidden: { opacity: 0, scaleY: 0 }, show: { opacity: 1, scaleY: 1, transition: { duration: 0.35, delay: 0.1 + i * 0.025 } } }}
              >
                <line x1={x(i)} x2={x(i)} y1={y(k.h)} y2={y(k.l)} className={up ? 'stroke-gold' : 'stroke-foreground/50'} />
                <rect
                  x={x(i) - step * 0.32}
                  y={top}
                  width={step * 0.64}
                  height={height}
                  className={up ? 'fill-gold stroke-gold' : 'fill-background stroke-foreground/50'}
                />
              </motion.g>
            )
          })}
          {ma.map((m, idx) => (
            <motion.path
              key={m.n}
              d={linePath(movingAverage(m.n).map((v, i) => [x(i), y(v)]))}
              className={`fill-none ${m.className}`}
              strokeWidth={1.6}
              variants={draw}
              custom={idx + 4}
            />
          ))}
        </motion.svg>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-foreground/45">
          <span>2026/08/23</span>
          <span>MA5 · MA10 · MA20</span>
          <span>2026/10/04</span>
        </div>
      </div>
      <ul className="flex flex-col gap-3.5">
        {TECH_NOTES.map((n, i) => (
          <motion.li key={n.title} initial="hidden" animate={play ? 'show' : 'hidden'} variants={fade} custom={i + 3} className="flex gap-3">
            <span aria-hidden="true" className={`mt-1 h-4 w-1 shrink-0 rounded-full ${n.className}`} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] text-foreground/90">{n.title}</span>
              <span className="text-[13px] text-foreground/50">{n.desc}</span>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

/* ---------------- 财务分析 · Bars + ratio ---------------- */

const PERIODS = ['2025/9M', '2025/FY', '2026/Q1', '2026/H1', '2026/9M']
const ASSETS = [960.1, 1116, 1253, 1407, 1611]
const LIABILITIES = [301.1, 322.7, 414.1, 406.1, 422.5]
const RATIOS = ASSETS.map((a, i) => (LIABILITIES[i] / a) * 100)

export function FinancialChart({ play }: ChartProps) {
  const W = 480
  const H = 210
  const base = 170
  const top = 30
  const max = 1800
  const group = (W - 40) / PERIODS.length
  const gx = (i: number) => 20 + group * i + group / 2
  const bh = (v: number) => (v / max) * (base - top)
  const ry = (r: number) => base - ((r - 20) / 20) * (base - top) * 0.7

  return (
    <div className="flex h-full flex-col gap-4">
      <motion.svg viewBox={`0 0 ${W} ${H}`} className="w-full" initial="hidden" animate={play ? 'show' : 'hidden'} role="img" aria-label="近五期总资产、负债与负债率走势">
        {[top, (top + base) / 2, base].map((ly) => (
          <line key={ly} x1={10} x2={W - 10} y1={ly} y2={ly} className="stroke-foreground/15" strokeDasharray="4 4" />
        ))}
        {PERIODS.map((p, i) => {
          const ah = bh(ASSETS[i])
          const lh = bh(LIABILITIES[i])
          return (
            <g key={p}>
              <motion.rect
                x={gx(i) - 22}
                width={18}
                rx={2}
                className="fill-gold"
                variants={{ hidden: { height: 0, y: base }, show: { height: ah, y: base - ah, transition: { duration: 0.9, delay: 0.15 + i * 0.1, ease: EASE } } }}
              />
              <motion.rect
                x={gx(i) + 4}
                width={18}
                rx={2}
                className="fill-foreground/70"
                variants={{ hidden: { height: 0, y: base }, show: { height: lh, y: base - lh, transition: { duration: 0.9, delay: 0.25 + i * 0.1, ease: EASE } } }}
              />
              <motion.text variants={fade} custom={i + 4} x={gx(i) - 13} y={base - ah - 7} textAnchor="middle" className="fill-gold-light text-[11px]">
                {ASSETS[i]}亿
              </motion.text>
              <text x={gx(i)} y={base + 22} textAnchor="middle" className="fill-foreground/45 font-mono text-[11px]">
                {p}
              </text>
            </g>
          )
        })}
        <motion.path d={linePath(RATIOS.map((r, i) => [gx(i), ry(r)]))} className="fill-none stroke-foreground" strokeWidth={1.5} variants={draw} custom={5} />
        {RATIOS.map((r, i) => (
          <motion.g key={i} variants={fade} custom={i + 9}>
            <circle cx={gx(i)} cy={ry(r)} r={4} className="fill-background stroke-foreground" strokeWidth={1.5} />
            <text x={gx(i) + 8} y={ry(r) - 8} className="fill-foreground/60 font-mono text-[10px]">
              {r.toFixed(2)}%
            </text>
          </motion.g>
        ))}
      </motion.svg>
      <Legend
        items={[
          { label: '总资产 (美元)', className: 'bg-gold' },
          { label: '负债 (美元)', className: 'bg-foreground/70' },
          { label: '负债率', className: 'bg-foreground', shape: 'line' },
        ]}
      />
      <div className="overflow-hidden rounded-lg border border-foreground/10">
        <table className="w-full table-fixed text-center font-mono text-[11px] sm:text-[12px]">
          <caption className="sr-only">近五期总资产、负债与负债率</caption>
          <thead>
            <tr className="border-b border-foreground/10 text-foreground/50">
              <th scope="col" className="w-8 py-2">
                <span className="sr-only">指标</span>
              </th>
              {PERIODS.map((p) => (
                <th key={p} scope="col" className="py-2 font-normal">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: '总资产', swatch: 'bg-gold', cells: ASSETS.map((v) => `${v}亿`), className: 'text-foreground/85' },
              { label: '负债', swatch: 'bg-foreground/70', cells: LIABILITIES.map((v) => `${v}亿`), className: 'text-foreground/85' },
              { label: '负债率', swatch: 'bg-foreground', cells: RATIOS.map((r) => `${r.toFixed(2)}%`), className: 'text-gold-light' },
            ].map((row) => (
              <tr key={row.label} className="border-b border-foreground/5 last:border-0">
                <th scope="row" className="py-2">
                  <span aria-hidden="true" className={`mx-auto block size-2 rounded-sm ${row.swatch}`} />
                  <span className="sr-only">{row.label}</span>
                </th>
                {row.cells.map((c, i) => (
                  <td key={i} className={`py-2 ${row.className}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- 估值 · PE band ---------------- */

const PE = [44, 59, 52, 61, 61.2, 51, 52, 59, 44, 39, 36, 37, 38, 39, 50, 31, 35.5, 34, 39, 43.5, 37, 40.5, 41, 47.5, 46, 45.8, 41, 26, 24.5, 24.27, 29, 34, 38.5, 36.5, 38, 43, 37, 37.7]
const PE_MIN = 16.88
const PE_MAX = 68.57
const PE_MEAN = 42.72
const PE_SD = 8.62

export function ValuationChart({ play }: ChartProps) {
  const W = 480
  const H = 240
  const left = 44
  const right = W - 8
  const y = (v: number) => 12 + ((PE_MAX - v) / (PE_MAX - PE_MIN)) * (H - 36)
  const x = (i: number) => left + ((right - left) * i) / (PE.length - 1)
  const bands = [
    { v: PE_MEAN + PE_SD, className: 'stroke-gold' },
    { v: PE_MEAN, className: 'stroke-gold-light' },
    { v: PE_MEAN - PE_SD, className: 'stroke-foreground/50' },
  ]
  const peakIdx = PE.indexOf(Math.max(...PE))
  const lowIdx = PE.indexOf(Math.min(...PE))

  return (
    <div className="flex h-full flex-col gap-4">
      <dl className="grid grid-cols-3 rounded-xl border border-foreground/10 bg-foreground/[0.04] py-3 text-center">
        {[
          { k: '预测市盈率', v: '37.70' },
          { k: '预测每股收益', v: '4.676' },
          { k: '超过历史数据', v: '22.22%' },
        ].map((s, i) => (
          <motion.div key={s.k} initial="hidden" animate={play ? 'show' : 'hidden'} variants={fade} custom={i} className="flex flex-col gap-1">
            <dt className="text-[12px] text-foreground/50">{s.k}</dt>
            <dd className="font-mono text-[18px] text-foreground sm:text-[20px]">{s.v}</dd>
          </motion.div>
        ))}
      </dl>
      <div className="flex items-center justify-between text-[12px] text-foreground/50">
        <div className="flex gap-2">
          <span className="rounded-md border border-foreground/15 px-2.5 py-1 text-foreground/80">3 年</span>
          <span className="rounded-md border border-foreground/15 px-2.5 py-1 text-foreground/80">预测市盈率</span>
        </div>
        <span className="font-mono">更新于 2026/10/17</span>
      </div>
      <motion.svg viewBox={`0 0 ${W} ${H}`} className="w-full" initial="hidden" animate={play ? 'show' : 'hidden'} role="img" aria-label="近三年预测市盈率走势，含平均值与正负一个标准差区间">
        {[PE_MAX, PE_MEAN + PE_SD, PE_MEAN - PE_SD, PE_MIN].map((v) => (
          <text key={v} x={0} y={y(v) + 4} className="fill-foreground/40 font-mono text-[10px]">
            {v.toFixed(2)}
          </text>
        ))}
        {bands.map((b, i) => (
          <motion.line key={b.v} x1={left} x2={right} y1={y(b.v)} y2={y(b.v)} className={b.className} strokeWidth={1.4} strokeDasharray="6 5" variants={fade} custom={i} />
        ))}
        <motion.path d={linePath(PE.map((v, i) => [x(i), y(v)]))} className="fill-none stroke-foreground" strokeWidth={1.8} strokeLinejoin="round" variants={draw} custom={2} />
        <motion.text variants={fade} custom={10} x={x(peakIdx)} y={y(PE[peakIdx]) - 10} textAnchor="middle" className="fill-foreground/70 font-mono text-[11px]">
          {PE[peakIdx].toFixed(2)}
        </motion.text>
        <motion.text variants={fade} custom={10} x={x(lowIdx)} y={y(PE[lowIdx]) + 18} textAnchor="middle" className="fill-foreground/70 font-mono text-[11px]">
          {PE[lowIdx].toFixed(2)}
        </motion.text>
        {['2023/12/31', '2025/06/30', '2026/10/04'].map((d, i) => (
          <text key={d} x={i === 0 ? left : i === 1 ? (left + right) / 2 : right} y={H - 4} textAnchor={i === 0 ? 'start' : i === 1 ? 'middle' : 'end'} className="fill-foreground/40 font-mono text-[10px]">
            {d}
          </text>
        ))}
      </motion.svg>
      <Legend
        items={[
          { label: '预测市盈率', className: 'bg-foreground', shape: 'line' },
          { label: '+1 标准差', className: 'bg-gold', shape: 'line' },
          { label: '平均值', className: 'bg-gold-light', shape: 'line' },
          { label: '-1 标准差', className: 'bg-foreground/50', shape: 'line' },
        ]}
      />
    </div>
  )
}
