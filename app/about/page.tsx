import type { Metadata } from 'next'
import { AboutView } from '@/components/about/about-view'

export const metadata: Metadata = {
  title: '关于 OXXX | OXXX',
  description: 'OXXX 是面向全球专业级投资者的加密友好型证券平台，连接数字资产与传统金融市场。',
}

export default function AboutPage() {
  return <AboutView />
}
