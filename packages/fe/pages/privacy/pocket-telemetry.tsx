import {
  Battery,
  Clock3,
  Database,
  FileDown,
  HeartPulse,
  MapPinned,
  Settings2,
  ShieldCheck,
  UploadCloud,
  WifiOff,
} from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React from 'react'

import AppLayout from '../../components/app-layout/AppLayout'

type Card = {
  title: string
  body: string
}

type TextSection = {
  title: string
  body: string
  items: string[]
}

export default function PocketTelemetryPrivacy() {
  const { t } = useTranslation('pocketTelemetryDoc')
  const highlights = t('highlights', { returnObjects: true }) as Card[]
  const featureCards = t('featureCards', { returnObjects: true }) as Card[]
  const syncSteps = t('syncSteps', { returnObjects: true }) as Card[]
  const dataCards = t('dataCards', { returnObjects: true }) as Card[]
  const privacy = t('privacy', { returnObjects: true }) as TextSection

  const highlightIcons = [ShieldCheck, MapPinned, UploadCloud]
  const featureIcons = [MapPinned, Battery, HeartPulse, FileDown]
  const syncIcons = [Settings2, Clock3, WifiOff]
  const dataIcons = [MapPinned, Battery, HeartPulse, Database]

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
      <AppLayout hideNavBar className="!px-0 !pt-0">
        <main className="box-border min-h-screen w-full overflow-hidden bg-[#f7f8f8] text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
          <section className="relative border-b border-neutral-200/80 bg-[#edf4f1] px-4 pb-10 pt-8 dark:border-neutral-800 dark:bg-neutral-900 sm:px-8 sm:pb-16 sm:pt-14">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-600 dark:text-neutral-400 sm:text-sm">
                  {t('eyebrow')}
                </p>
                <h1 className="mt-4 max-w-3xl text-[2.5rem] font-semibold leading-[1.05] text-neutral-950 dark:text-neutral-50 sm:text-6xl">
                  {t('title')}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-700 dark:text-neutral-300 sm:text-lg">
                  {t('intro')}
                </p>
                <p className="mt-5 text-sm text-neutral-500 dark:text-neutral-400">
                  {t('effectiveDate')}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {highlights.map((item, index) => {
                  const Icon = highlightIcons[index] ?? ShieldCheck
                  return (
                    <article
                      key={item.title}
                      className="rounded-lg border border-neutral-200 bg-white/70 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60"
                    >
                      <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                      <h2 className="mt-3 text-sm font-semibold text-neutral-950 dark:text-neutral-50">
                        {item.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                        {item.body}
                      </p>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="px-4 py-10 sm:px-8 sm:py-14">
            <div className="mx-auto max-w-6xl">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                  {t('featuresEyebrow')}
                </p>
                <h2 className="mt-3 text-2xl font-semibold sm:text-4xl">
                  {t('featuresTitle')}
                </h2>
                <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">
                  {t('featuresIntro')}
                </p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {featureCards.map((card, index) => {
                  const Icon = featureIcons[index] ?? Database
                  return (
                    <article
                      key={card.title}
                      className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                        {card.body}
                      </p>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="border-y border-neutral-200 bg-white px-4 py-10 dark:border-neutral-800 dark:bg-neutral-900 sm:px-8 sm:py-14">
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-400">
                  {t('syncEyebrow')}
                </p>
                <h2 className="mt-3 text-2xl font-semibold sm:text-4xl">
                  {t('syncTitle')}
                </h2>
                <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">
                  {t('syncIntro')}
                </p>
              </div>

              <div className="grid gap-4">
                {syncSteps.map((step, index) => {
                  const Icon = syncIcons[index] ?? Clock3
                  return (
                    <article
                      key={step.title}
                      className="grid grid-cols-[auto_1fr] gap-4 rounded-lg border border-neutral-200 bg-[#f8faf9] p-5 dark:border-neutral-800 dark:bg-neutral-950"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                          {step.body}
                        </p>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="px-4 py-10 sm:px-8 sm:py-14">
            <div className="mx-auto max-w-6xl">
              <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-400">
                    {t('dataEyebrow')}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold sm:text-4xl">
                    {t('dataTitle')}
                  </h2>
                  <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">
                    {t('dataIntro')}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {dataCards.map((card, index) => {
                    const Icon = dataIcons[index] ?? Database
                    return (
                      <article
                        key={card.title}
                        className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        <Icon className="h-5 w-5 text-violet-700 dark:text-violet-300" />
                        <h3 className="mt-4 text-base font-semibold">
                          {card.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                          {card.body}
                        </p>
                      </article>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-neutral-200 bg-neutral-950 px-4 py-10 text-neutral-50 dark:border-neutral-800 sm:px-8 sm:py-14">
            <div className="mx-auto max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">
                {t('privacyEyebrow')}
              </p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-4xl">
                {privacy.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-neutral-300">
                {privacy.body}
              </p>
              <div className="mt-8 grid gap-3">
                {privacy.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-neutral-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <footer className="mt-8 text-sm leading-6 text-neutral-400">
                {t('footer')}
              </footer>
            </div>
          </section>
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
        'pocketTelemetryDoc',
      ])),
    },
  }
}
