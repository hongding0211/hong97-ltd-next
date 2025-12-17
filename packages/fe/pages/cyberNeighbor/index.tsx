import AppLayout from '@components/app-layout/AppLayout'
import { http } from '@services/http'
import { ChevronRight } from 'lucide-react'
import { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React from 'react'

const LINKS_UCP_ID = 'cbf4e9d6-6857-410b-9820-258e776414d9'

type Link = {
  link: string
  title: string
}

const Item: React.FC<{
  link: Link
}> = ({ link }) => {
  const handleClick = () => {
    window.open(link.link, '_blank')
  }

  return (
    <div
      className="flex items-center justify-between cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex flex-col gap-y-0.5">
        <span className="font-semibold hover:underline active:underline">
          {link.title}
        </span>
        <span className="text-sm text-neutral-500">{link.link}</span>
      </div>
      <ChevronRight className="w-4 h-4" />
    </div>
  )
}

const CyberNeighbor: React.FC<{
  links: Link[]
}> = (props) => {
  const { links } = props
  const { t } = useTranslation('common')

  return (
    <>
      <Head>
        <title>{t('nav.cyberNeighbor')}</title>
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
        <div className="max-w-[500px] mx-auto sm:mt-6 flex-col">
          {links.map((item, index) => (
            <React.Fragment key={item.link}>
              <Item link={item} />
              {index !== links.length - 1 && (
                <div className="w-full h-[0.5px] my-3 bg-neutral-300 dark:bg-neutral-700" />
              )}
            </React.Fragment>
          ))}
        </div>
      </AppLayout>
    </>
  )
}

export default CyberNeighbor

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale = 'cn' } = context

  const linksRes = await http.get(
    'GetUcpConfigAll',
    {
      id: LINKS_UCP_ID,
    },
    { locale },
  )
  const links = linksRes?.data?.map((e) => e.raw) ?? []

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'toast'])),
      links,
    },
  }
}
