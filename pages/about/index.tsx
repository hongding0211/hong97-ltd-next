import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React from 'react'

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
          <img src="/img/26-07-2023-23-50-18.jpeg" alt="me" />
          <div className="mb-6 mt-12 sm:mb-12 sm:mt-24">
            <h1>{t('title')}</h1>
          </div>
          <p>{t('p1')}</p>
          <p>{t('p2')}</p>
          <figure>
            <img src="/img/img_8908.jpeg" alt="cat" />
            <figcaption>{t('c1')}</figcaption>
          </figure>
          <h2>PING ME</h2>
          <ul>
            <li>Github: https://github.com/hongding0211</li>
            <li>{t('email')}: keith.dh@hotmail.com</li>
            <li>{t('wechat')}: 1479224723</li>
          </ul>
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
