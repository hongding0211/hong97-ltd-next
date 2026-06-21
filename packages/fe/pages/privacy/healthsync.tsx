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

export default function HealthSyncPrivacy() {
  const { t } = useTranslation('healthsyncPrivacy')
  const sections = t('sections', { returnObjects: true }) as Section[]

  return (
    <>
      <Head>
        <title>{t('metaTitle')}</title>
        <meta name="description" content={t('intro')} />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>
      <AppLayout className="!px-0 !pt-0 sm:!px-5 sm:!pt-5">
        <main className="box-border flex w-full max-w-full flex-col overflow-hidden px-4 pb-8 pt-7 sm:mx-auto sm:max-w-3xl sm:px-8 sm:pb-20 sm:pt-24">
          <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400 sm:mb-3 sm:text-sm">
            {t('eyebrow')}
          </p>
          <h1 className="text-[2.35rem] font-bold leading-tight text-neutral-950 dark:text-neutral-50 sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300 sm:mt-5 sm:text-lg">
            {t('intro')}
          </p>
          <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            {t('effectiveDate')}
          </p>

          <div className="mt-9 space-y-8 sm:mt-12 sm:space-y-10">
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

          <footer className="mt-12 text-sm leading-6 text-neutral-500 dark:text-neutral-500">
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
      ...(await serverSideTranslations(locale, [
        'common',
        'healthsyncPrivacy',
      ])),
    },
  }
}
