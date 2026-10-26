'use client'

import { ArrowLeft, ArrowRight, Clock, ShieldAlert } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/synapse/footer'
import { Navbar } from '@/components/synapse/navbar'
import { I18nProvider, useI18n } from '@/lib/i18n'
import { ARTICLES, type Article, type Block } from '@/lib/news'

function LeadText({ text }: { text: string }) {
  const idx = text.indexOf('：')
  if (idx > 0 && idx <= 20) {
    return (
      <>
        <strong className="font-semibold text-foreground">{text.slice(0, idx)}</strong>
        {text.slice(idx)}
      </>
    )
  }
  return <>{text}</>
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <p className="text-pretty leading-loose text-foreground/75">{block.text}</p>
    case 'h2':
      return (
        <h2 id={block.id} className="scroll-mt-28 pt-6 text-pretty font-display text-2xl leading-snug text-foreground md:text-3xl">
          {block.text}
        </h2>
      )
    case 'h3':
      return <h3 className="pt-2 text-pretty text-lg font-bold leading-snug text-gold">{block.text}</h3>
    case 'ul':
      return (
        <ul className="flex flex-col gap-3">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 leading-loose text-foreground/75">
              <span aria-hidden="true" className="mt-3 size-1.5 shrink-0 rounded-full bg-gold" />
              <span className="text-pretty">
                <LeadText text={item} />
              </span>
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol className="flex flex-col gap-3">
          {block.items.map((item, i) => (
            <li key={item} className="flex items-start gap-4 rounded-xl bg-raised p-4 leading-relaxed text-foreground/80">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gold font-mono text-sm font-bold text-gold-deep">
                {i + 1}
              </span>
              <span className="text-pretty">{item}</span>
            </li>
          ))}
        </ol>
      )
    case 'path':
      return (
        <div className="flex flex-col gap-3 rounded-2xl border border-foreground/10 bg-raised p-5">
          <span className="font-mono text-xs uppercase tracking-widest text-foreground/45">操作路径</span>
          <ol className="flex flex-wrap items-center gap-2">
            {block.steps.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-md bg-background px-2.5 py-1 text-sm text-foreground/85">{step}</span>
                {i < block.steps.length - 1 && <ArrowRight className="size-3.5 text-gold" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </div>
      )
    case 'table':
      return (
        <div className="overflow-x-auto rounded-2xl border border-foreground/10">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead className="bg-raised">
              <tr>
                {block.head.map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 font-semibold text-gold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')} className="border-t border-foreground/10">
                  {row.map((cell, ci) => (
                    <td key={cell + ci} className={ci === 0 ? 'px-4 py-3 font-medium text-foreground' : 'px-4 py-3 text-foreground/70'}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'callout':
      return (
        <blockquote className="rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 p-6 text-pretty leading-loose text-foreground/90">
          {block.text}
        </blockquote>
      )
    case 'risk':
      return (
        <aside className="mt-6 flex flex-col gap-3 rounded-2xl border border-foreground/10 p-5">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
            <ShieldAlert className="size-4 text-gold" aria-hidden="true" />
            风险提示
          </span>
          <ul className="flex flex-col gap-2">
            {block.items.map((item) => (
              <li key={item} className="text-pretty text-sm leading-relaxed text-foreground/50">
                {item}
              </li>
            ))}
          </ul>
        </aside>
      )
  }
}

function ArticleContent({ article }: { article: Article }) {
  const { t } = useI18n()
  const toc = article.body.filter((b): b is Extract<Block, { type: 'h2' }> => b.type === 'h2')
  const related = ARTICLES.filter((a) => a.slug !== article.slug)

  return (
    <main className="bg-background pt-24 text-foreground">
      <header className="px-4 sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <Link
            href="/about#news"
            className="flex w-fit items-center gap-2 text-sm text-foreground/60 transition-colors hover:text-gold"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t('返回新闻与洞察', 'Back to News & Insights')}
          </Link>
          <div className="flex max-w-4xl flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="rounded-md bg-gold/15 px-2.5 py-1 text-gold">{t(article.tag.zh, article.tag.en)}</span>
              <time className="font-mono text-foreground/50">{article.date}</time>
              <span className="flex items-center gap-1 text-foreground/50">
                <Clock className="size-3.5" aria-hidden="true" />
                {t(`约 ${article.readMinutes} 分钟阅读`, `${article.readMinutes} min read`)}
              </span>
            </div>
            <h1 className="text-balance font-display text-3xl leading-tight md:text-5xl">{t(article.title.zh, article.title.en)}</h1>
            <p className="max-w-3xl text-pretty leading-relaxed text-foreground/60">{t(article.excerpt.zh, article.excerpt.en)}</p>
          </div>
          <div className="relative aspect-[21/9] overflow-hidden rounded-3xl bg-raised">
            <Image src={article.cover} alt="" fill priority sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/20 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-between p-6 md:p-10">
              <span className="font-display text-3xl leading-none tracking-[0.04em] md:text-4xl">OXXX</span>
              <span className="max-w-[60%] text-pretty font-display text-2xl leading-tight md:text-4xl">
                {t(article.headline.zh, article.headline.en)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-16 sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row">
          <aside className="hidden lg:block lg:w-60 lg:shrink-0">
            <nav aria-label={t('文章目录', 'Table of contents')} className="flex flex-col gap-3 pt-2">
              <span className="font-mono text-xs uppercase tracking-widest text-foreground/45">{t('目录', 'Contents')}</span>
              <ol className="flex flex-col gap-1 border-l border-foreground/10">
                {toc.map((h) => (
                  <li key={h.id}>
                    <a
                      href={`#${h.id}`}
                      className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm leading-snug text-foreground/55 transition-colors hover:border-gold hover:text-gold"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
          <article className="flex max-w-3xl flex-1 flex-col gap-6">
            {article.body.map((block, i) => (
              <BlockView key={i} block={block} />
            ))}
            <div className="mt-6 flex flex-col items-start gap-4 rounded-2xl bg-raised p-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-pretty font-display text-xl">{t('立即注册 OXXX，探索更高效的跨市场交易', 'Join OXXX and trade across markets')}</p>
              <Link
                href="/register"
                className="flex shrink-0 items-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-gold-deep transition-opacity hover:opacity-90"
              >
                {t('立即注册', 'Sign up')}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
      </div>

      <section className="border-t border-foreground/10 px-4 py-16 sm:px-6 md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-8">
          <h2 className="font-display text-2xl md:text-3xl">{t('更多洞察', 'More insights')}</h2>
          <ul className="grid gap-6 md:grid-cols-2">
            {related.map((a) => (
              <li key={a.slug}>
                <Link href={`/news/${a.slug}`} className="group flex h-full gap-5 overflow-hidden rounded-2xl bg-raised p-4">
                  <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-xl sm:w-36">
                    <Image src={a.cover} alt="" fill sizes="144px" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 py-1">
                    <time className="font-mono text-xs text-foreground/45">{a.date}</time>
                    <h3 className="line-clamp-2 text-pretty font-bold leading-snug transition-colors group-hover:text-gold">{t(a.title.zh, a.title.en)}</h3>
                    <span className="mt-auto flex items-center gap-1 text-sm text-foreground/55">
                      {t('阅读全文', 'Read more')}
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}

export function ArticleView({ slug }: { slug: string }) {
  const article = ARTICLES.find((a) => a.slug === slug)!
  return (
    <I18nProvider title={{ zh: `${article.title.zh} | OXXX`, en: `${article.title.en} | OXXX` }}>
      <Navbar visible />
      <ArticleContent article={article} />
      <Footer />
    </I18nProvider>
  )
}
