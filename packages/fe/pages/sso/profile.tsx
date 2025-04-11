import { http } from '@services/http'
import { GetStaticPropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React from 'react'
import AppLayout from '../../components/app-layout/AppLayout'

export const Profile: React.FC = () => {
  const { t } = useTranslation('profile')

  return (
    <>
      <Head>
        <title>{t('title')}</title>
      </Head>
      <AppLayout>todo</AppLayout>
    </>
  )
}

export default Profile

export async function getStaticProps(context: GetStaticPropsContext) {
  const { locale = 'cn' } = context
  http.setLocale(locale)
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'profile', 'toast'])),
    },
  }
}
