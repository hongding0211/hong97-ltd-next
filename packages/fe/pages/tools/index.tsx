import AppLayout from '@components/app-layout/AppLayout'
import { http } from '@services/http'
import { ChevronRight } from 'lucide-react'
import { GetStaticPropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import router from 'next/router'
import React from 'react'

const ITEMS = [
  {
    key: 'oss',
    title: 'OSS',
    subTitle: 'Object Storage Upload Tool',
  },
]

const Item: React.FC<{
  itemKey: string
}> = ({ itemKey }) => {
  const { t } = useTranslation('tools')

  const handleClick = () => {
    router.push(`/tools/${itemKey}`)
  }

  return (
    <div
      className="flex items-center justify-between cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex flex-col gap-y-0.5">
        <span className="font-semibold hover:underline active:underline">
          {t(`items.${itemKey}.title`)}
        </span>
        <span className="text-sm text-neutral-500">
          {t(`items.${itemKey}.subTitle`)}
        </span>
      </div>
      <ChevronRight className="w-4 h-4" />
    </div>
  )
}

function Tools() {
  const { t } = useTranslation('tools')

  return (
    <>
      <Head>
        <title>{t('title')}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
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
        <div className="max-w-[500px] mx-auto mt-6 md:mt-12 flex-col">
          {ITEMS.map((item, index) => (
            <>
              <Item key={item.key} itemKey={item.key} />
              {index !== ITEMS.length - 1 && (
                <div className="w-full h-[0.5px] my-3 bg-neutral-300 dark:bg-neutral-700" />
              )}
            </>
          ))}
        </div>
      </AppLayout>
    </>
  )
}

export default Tools

export async function getStaticProps(context: GetStaticPropsContext) {
  const { locale = 'cn' } = context
  http.setLocale(locale)
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'tools', 'toast'])),
    },
  }
}
