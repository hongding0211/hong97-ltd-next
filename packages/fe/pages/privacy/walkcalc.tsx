import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React from 'react'

import AppLayout from '../../components/app-layout/AppLayout'

type Section = {
  title: string
  body?: string
  items?: string[]
}

export default function WalkCalcPrivacy() {
  const { t } = useTranslation('walkcalcPrivacy')
  const sections = t('sections', { returnObjects: true }) as Section[]

  return (
    <>
      <Head>
        <title>{t('metaTitle')}</title>
        <meta name="description" content={t('intro')} />
      </Head>
      <AppLayout>
        <main className="mx-auto flex w-full max-w-3xl flex-col px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
            {t('eyebrow')}
          </p>
          <h1 className="text-4xl font-bold leading-tight text-neutral-950 dark:text-neutral-50 sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-5 text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:text-lg">
            {t('intro')}
          </p>
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            {t('effectiveDate')}
          </p>

          <div className="mt-12 space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
                  {section.title}
                </h2>
                {section.body && (
                  <p className="mt-3 text-base leading-7 text-neutral-700 dark:text-neutral-300">
                    {section.body}
                  </p>
                )}
                {section.items && (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-neutral-700 dark:text-neutral-300">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <footer className="mt-14 border-t border-neutral-200 pt-6 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
            {t('footer')}
          </footer>
        </main>
      </AppLayout>
    </>
  )
}

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'walkcalcPrivacy'])),
    },
  }
}
