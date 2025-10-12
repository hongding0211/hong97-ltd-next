import AppLayout from '@components/app-layout/AppLayout'
import { time } from '@utils/time'
import { GetServerSidePropsContext } from 'next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export default function Page() {
  return (
    <AppLayout simplifiedFooter>
      <h1>Edit</h1>
    </AppLayout>
  )
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale } = context

  time.setLocale(locale)

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'blog', 'toast'])),
      locale,
    },
  }
}
