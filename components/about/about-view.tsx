'use client'

import { Footer } from '@/components/synapse/footer'
import { Navbar } from '@/components/synapse/navbar'
import { I18nProvider } from '@/lib/i18n'
import { AboutHero, BrandStory, JoinCta, News, Services, Values } from './about-sections'

export function AboutView() {
  return (
    <I18nProvider title={{ zh: '关于 OXXX | OXXX', en: 'About OXXX | OXXX' }}>
      <Navbar visible />
      <main className="bg-background text-foreground">
        <AboutHero />
        <BrandStory />
        <Values />
        <Services />
        <News />
        <JoinCta />
      </main>
      <Footer />
    </I18nProvider>
  )
}
