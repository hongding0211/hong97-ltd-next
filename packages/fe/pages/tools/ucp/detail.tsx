import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import AppLayout from '@components/app-layout/AppLayout'
import { ItemDrawer } from '@components/ucp/item-drawer'
import { UCPTable } from '@components/ucp/table'
import { http } from '@services/http'
import { toast } from '@utils/toast'
import { Plus } from 'lucide-react'
import { GetServerSidePropsContext } from 'next'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import Head from 'next/head'
import React, { useEffect, useState } from 'react'

export const UCPDetail: React.FC<{ locale: string; id: string }> = ({
  locale,
  id,
}) => {
  const { t: tCommon } = useTranslation('common')
  const { t } = useTranslation('tools')

  const [title, setTitle] = useState(tCommon('loading'))
  const [showItemDrawer, setShowItemDrawer] = useState(true)

  useEffect(() => {
    if (!id) {
      return
    }
    http
      .get('GetUcpDetail', {
        id,
      })
      .then((res) => {
        if (!res.isSuccess) {
          toast(res.msg, {
            type: 'error',
          })
          return
        }
        setTitle(res.data.desc)
      })
  }, [id])

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <AppLayout authRequired simplifiedFooter>
        <div className="max-w-[768px] mx-auto md:mt-2 flex-col">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${locale}/tools`}>
                  {tCommon('nav.tools')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/${locale}/tools/ucp`}>
                  {t('items.ucp.title')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="mt-8 w-full">
            <div className="flex w-full mb-4">
              <Button variant="outline">
                <Plus className="w-4 h-4" />
                {t('items.ucp.new')}
              </Button>
            </div>
            <UCPTable />
          </div>
        </div>
      </AppLayout>
      <ItemDrawer show={showItemDrawer} onShowChange={setShowItemDrawer} />
    </>
  )
}

export default UCPDetail

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const { locale = 'cn', query } = context
  const { id } = query
  http.setLocale(locale)
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'tools', 'toast'])),
      locale,
      id,
    },
  }
}
