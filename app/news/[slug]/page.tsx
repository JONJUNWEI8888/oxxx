import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArticleView } from '@/components/news/article-view'
import { ARTICLES, getArticle } from '@/lib/news'

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = getArticle(slug)
  if (!article) return {}
  return {
    title: `${article.title.zh} | OXXX`,
    description: article.excerpt.zh,
    openGraph: { images: [article.cover] },
  }
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!getArticle(slug)) notFound()
  return <ArticleView slug={slug} />
}
