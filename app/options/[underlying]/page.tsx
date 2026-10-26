import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OptionsTerminal } from '@/components/options/options-terminal'
import { OPTION_UNDERLYINGS, UNDERLYING_LIST, isUnderlyingSlug } from '@/lib/options'

export function generateStaticParams() {
  return UNDERLYING_LIST.map((u) => ({ underlying: u.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ underlying: string }> }): Promise<Metadata> {
  const { underlying } = await params
  const slug = underlying.toUpperCase()
  if (!isUnderlyingSlug(slug)) return {}
  const { base } = OPTION_UNDERLYINGS[slug]
  return {
    title: `${base}USDT 期权 | OXXX 加密期权交易`,
    description: `OXXX ${base} 期权链实时行情：多到期日、行权价、标记隐含波动率与希腊值，行情来源 OKX。`,
  }
}

export default async function OptionsPage({ params }: { params: Promise<{ underlying: string }> }) {
  const { underlying } = await params
  const slug = underlying.toUpperCase()
  if (!isUnderlyingSlug(slug)) notFound()
  return <OptionsTerminal slug={slug} />
}
