import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React from 'react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'

import AppLayout from '../../components/app-layout/AppLayout'

function About() {
  const { t } = useTranslation('about')

  return (
    <>
      <Head>
        <title>{t('title')}</title>
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#fff"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#000"
        />
      </Head>
      <AppLayout>
        <article className="prose prose-sm prose-neutral dark:prose-invert sm:prose-base lg:prose-lg mb-6 sm:mx-auto sm:mb-12">
          <img src="/img/cover.jpeg" alt="me" className="rounded" />
          <div className="mb-6 mt-12 sm:mb-12 sm:mt-24">
            <h1>{t('title')}</h1>
          </div>
          <p>{t('p1')}</p>
          <p>{t('p2')}</p>
          <figure>
            <img src="/img/img_8908.jpeg" alt="cats" className="rounded" />
            <figcaption>{t('c1')}</figcaption>
          </figure>
        </article>
      </AppLayout>
    </>
  )
}

export default About

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'about'])),
    },
  }
}
